from asyncio.log import logger
from email.mime import text
from typing import Dict
from fastapi import APIRouter, Depends, HTTPException
from decimal import Decimal
from sqlalchemy.orm import Session
from typing import Any
from api_routes import QuotePayload, _iso_to_date, _table_columns
from db import get_db
import models


router = APIRouter(prefix="/quotes", tags=["quotes"])

# ... your existing endpoints ...

@router.get("/{quote_id}")
def get_quote_detail(quote_id: int, db: Session = Depends(get_db)):
    q = db.get(models.Quote, quote_id)
    if not q:
        raise HTTPException(404, detail="Quote not found")

    items = db.query(models.QuoteItem).filter(models.QuoteItem.quote_id == quote_id).all()

    def serialize(item):
        return {
            "id": item.id,
            "ref_id": getattr(item, "ref_id", None),
            "description": item.description,
            "qty": float(item.qty),
            "unit_cost": float(item.unit_cost),
            "line_total": float(item.line_total),
            "product_id": item.product_id,
            "task_id": item.task_id,
            "item_type": item.item_type
        }

    # Group items by product > task > item_type
    from collections import defaultdict

    # Prepare mapping: product_id -> {info, tasks}
    products_map = defaultdict(lambda: {"name": None, "sor_code": None, "tasks": defaultdict(lambda: {"name": None, "materials": [], "equipment": [], "labour": []})})

    for item in items:
        if item.product_id is not None:
            product_obj = item.product
            prod = products_map[item.product_id]
            if product_obj:
                prod["name"] = getattr(product_obj, "product_name", None) or prod["name"]
                prod["sor_code"] = getattr(product_obj, "sor_code", None) or prod["sor_code"]

            # Only group items with a task_id under tasks
            if item.task_id is not None:
                task_obj = item.task if hasattr(item, "task") else None
                task_id = item.task_id
                t = prod["tasks"][task_id]
                t["name"] = getattr(task_obj, "task_name", None) or t["name"] or "Task"
                # Add item by type
                if item.item_type == "material":
                    t["materials"].append(serialize(item))
                elif item.item_type == "equipment":
                    t["equipment"].append(serialize(item))
                elif item.item_type == "labour":
                    t["labour"].append(serialize(item))
            else:
                # Items with product_id but no task_id (rare) -- skip or collect as needed
                pass

    # Build products list as per API
    products = []
    for product_id, pdata in products_map.items():
        prod = {
            "product_id": product_id,
            "name": pdata["name"],
            "sor_code": pdata["sor_code"],
            "tasks": []
        }
        for task_id, tdata in pdata["tasks"].items():
            prod["tasks"].append({
                "ref_id": task_id,
                "name": tdata["name"] or "Task",
                "materials": tdata["materials"],
                "equipment": tdata["equipment"],
                "labour": tdata["labour"]
            })
        products.append(prod)

    # Support items: those with item_type="support"
    support_items = [serialize(item) for item in items if item.item_type == "support"]

    base_cost = sum(i.line_total for i in items if i.item_type in {"material", "equipment", "labour"})
    support_cost = sum(i.line_total for i in items if i.item_type == "support")
    subtotal = base_cost + support_cost
    risk_percent = float(getattr(q, "risk_percent", 0) or 0)
    risk_multiplier = 1 + risk_percent / 100
    total = float(q.total_amount or subtotal * risk_multiplier)

    client = q.client.name if q.client else None
    region = q.region.name if hasattr(q, "region") and q.region else None

    # For display, collect unique product names and SOR codes from items (if present)
    product_names = set()
    sor_codes = set()
    for item in items:
        if item.product and getattr(item.product, "product_name", None):
            product_names.add(item.product.product_name)
        if item.product and getattr(item.product, "sor_code", None):
            sor_codes.add(item.product.sor_code)
    product = ", ".join(product_names) if product_names else None
    sor = ", ".join(sor_codes) if sor_codes else None

    return {
        "id": q.id,
        "created_on": str(q.created_on),
        "client": client,
        "region": region,
        "product": product,
        "sor": sor,
        "status": q.status,
        "risk_percent": risk_percent,
        "risk_multiplier": risk_multiplier,
        "total_amount": float(q.total_amount or 0),
        "base_cost": float(base_cost),
        "support_cost": float(support_cost),
        "subtotal": float(subtotal),
        "total": float(total),
        "breakdown": {
            "products": products,
            "support": support_items
        }
    }

# ... other imports and code above unchanged ...

@router.put("/{quote_id}")
def update_quote(quote_id: int, payload: QuotePayload, db: Session = Depends(get_db)):
    # --- Security & Validation (same as before) ---
    if not isinstance(payload.region_id, int) or payload.region_id < 1:
        raise HTTPException(400, detail="Invalid or missing region_id")
    if not payload.product_ids or not all(isinstance(pid, int) and pid > 0 for pid in payload.product_ids):
        raise HTTPException(400, detail="At least one valid product_id is required")
    if payload.client_id is not None and (not isinstance(payload.client_id, int) or payload.client_id < 1):
        raise HTTPException(400, detail="Invalid client_id")
    if payload.risk_percent is not None and (payload.risk_percent < 0 or payload.risk_percent > 100):
        raise HTTPException(400, detail="risk_percent must be between 0 and 100")

    q = db.get(models.Quote, quote_id)
    if not q:
        raise HTTPException(404, detail="Quote not found")

    # Update quote fields
    q.region_id = payload.region_id
    q.client_id = payload.client_id
    q.risk_percent = payload.risk_percent
    q.total_amount = payload.totals.get("total_after_risk", 0.0)
    q.created_on = _iso_to_date(payload.created_on)
    q.status = payload.status if payload.status else "Draft"

    # Delete all previous QuoteItems for this quote
    db.query(models.QuoteItem).filter(models.QuoteItem.quote_id == quote_id).delete()
    db.flush()

    # Add new quote items (same logic as create)
    for product in getattr(payload.breakdown, "products", []):
        product_id = getattr(product, "product_id", None)
        for task in getattr(product, "tasks", []):
            task_id = getattr(task, "ref_id", None)
            # Materials
            for mat in getattr(task, "materials", []):
                qty = Decimal(str(mat.qty or 0))
                unit = Decimal(str(mat.unit_cost or 0))
                line = qty * unit
                qi = models.QuoteItem(
                    quote_id=quote_id,
                    item_type="material",
                    product_id=product_id,
                    task_id=task_id,
                    sor_code=getattr(mat, "sor_code", None),
                    ref_id=None,
                    description=mat.name,
                    qty=qty,
                    unit_cost=unit,
                    line_total=line,
                )
                db.add(qi)
            # Equipment
            for eq in getattr(task, "equipment", []):
                qty = Decimal(str(eq.qty or 0))
                unit = Decimal(str(eq.unit_cost or 0))
                line = qty * unit
                qi = models.QuoteItem(
                    quote_id=quote_id,
                    item_type="equipment",
                    product_id=product_id,
                    task_id=task_id,
                    sor_code=getattr(eq, "sor_code", None),
                    ref_id=None,
                    description=eq.name,
                    qty=qty,
                    unit_cost=unit,
                    line_total=line,
                )
                db.add(qi)
            # Labour
            for lab in getattr(task, "labour", []):
                qty = Decimal(str(lab.qty or 0))
                unit = Decimal(str(lab.unit_cost or 0))
                line = qty * unit
                qi = models.QuoteItem(
                    quote_id=quote_id,
                    item_type="labour",
                    product_id=product_id,
                    task_id=task_id,
                    sor_code=None,
                    ref_id=None,
                    description=lab.name,
                    qty=qty,
                    unit_cost=unit,
                    line_total=line,
                )
                db.add(qi)

    # Additional support (not linked to a task, so task_id=None)
    for sup in getattr(payload, "additional_support", []):
        qty = Decimal(str(sup.qty or 0))
        unit = Decimal(str(sup.unit_cost or 0))
        line = qty * unit
        qi = models.QuoteItem(
            quote_id=quote_id,
            item_type="support",
            product_id=None,
            task_id=None,
            sor_code=getattr(sup, "sor_code", None),
            ref_id=None,
            description=sup.name,
            qty=qty,
            unit_cost=unit,
            line_total=line,
        )
        db.add(qi)

    db.commit()
    return {
        "quote_id": quote_id,
        "message": "Quote updated successfully.",
        "clear_fields": False
    }