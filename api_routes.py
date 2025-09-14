from __future__ import annotations
from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import (
    select, text, inspect, and_, or_, func, literal, cast, String
)
from sqlalchemy.orm import Session

from db import get_db
import models

import logging

router = APIRouter(tags=["Calculator API"])
logger = logging.getLogger("api_routes")

# ---------- Local DTOs (UI depends on these) ----------
class IdName(BaseModel):
    id: int
    name: str
    code: Optional[str] = None
    sor_code: Optional[str] = None

class ClientCreate(BaseModel):
    name: str

class RiskOut(BaseModel):
    id: int
    label: str
    multiplier: float

class ItemOut(BaseModel):
    id: int | str | None = None
    name: str
    qty: float
    unit_cost: float

class EquipmentOut(BaseModel):
    id: int | str | None = None
    name: str
    qty: float
    unit_cost: float

class TaskBreakdownOut(BaseModel):
    id: int
    name: str
    qty: float
    materials: List[ItemOut] = Field(default_factory=list)
    equipment: List[EquipmentOut] = Field(default_factory=list)
    labour: List[ItemOut] = Field(default_factory=list)

class StructuredBreakdownOut(BaseModel):
    tasks: List[TaskBreakdownOut] = Field(default_factory=list)

def _to_f(v) -> float:
    if v is None:
        return 0.0
    try:
        return float(v)
    except Exception:
        return 0.0

def _iso_to_date(s: Optional[str]) -> date:
    if not s:
        return date.today()
    try:
        return datetime.fromisoformat(s).date()
    except Exception:
        try:
            return date.fromisoformat(s)
        except Exception:
            return date.today()

def _table_columns(db: Session, table: str) -> set[str]:
    insp = inspect(db.bind)
    return {c["name"].lower() for c in insp.get_columns(table)}

@router.get("/regions", response_model=List[IdName])
def list_regions(db: Session = Depends(get_db)):
    rows = db.execute(
        select(models.Region.id, models.Region.name, models.Region.state_code)
        .order_by(models.Region.name.asc())
    ).all()
    return [{"id": r.id, "name": r.name, "code": r.state_code} for r in rows]

@router.get("/products", response_model=List[IdName])
def list_products(
    region_id: Optional[int] = Query(None),
    sor_code: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    q = select(
        models.Product.id,
        models.Product.product_name,
        models.Product.state_code,
        models.Product.sor_code
    )
    if region_id:
        region = db.get(models.Region, region_id)
        if not region:
            logger.warning(f"Region not found: {region_id}")
            raise HTTPException(status_code=404, detail="Region not found")
        q = q.where(models.Product.state_code == region.state_code)
    if sor_code:
        q = q.where(models.Product.sor_code == sor_code)

    rows = db.execute(q.order_by(models.Product.product_name.asc())).all()
    return [
        {
            "id": r.id,
            "name": r.product_name,
            "code": r.state_code,
            "sor_code": r.sor_code if r.sor_code is not None else ""
        }
        for r in rows
    ]

@router.post("/clients", response_model=IdName, status_code=201)
def create_client(body: ClientCreate, db: Session = Depends(get_db)):
    name = (body.name or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Client name required")
    existing = db.execute(
        select(models.Client).where(func.lower(models.Client.name) == name.lower())
    ).scalar_one_or_none()
    if existing:
        return {"id": existing.id, "name": existing.name}
    row = models.Client(name=name)
    db.add(row)
    db.flush()
    db.commit()
    return {"id": row.id, "name": row.name}

@router.get("/clients", response_model=List[IdName])
def list_clients(db: Session = Depends(get_db)):
    insp = inspect(db.bind)
    for tbl in insp.get_table_names():
        tl = tbl.lower()
        if tl in {"clients", "client", "customers", "customer"}:
            for id_col, name_col in [("id", "name"), ("client_id", "client_name"), ("id", "company_name")]:
                try:
                    rows = db.execute(text(f'SELECT {id_col} AS id, {name_col} AS name FROM "{tbl}" ORDER BY 2')).all()
                    if rows:
                        return [{"id": int(r.id), "name": str(r.name)} for r in rows]
                except Exception as e:
                    logger.error(f"Error reading {tbl}.{id_col}/{name_col}: {e}")
                    continue
    logger.warning("No clients table found, returning fallback")
    return [{"id": 1, "name": "Acme Telco"}, {"id": 2, "name": "Globex"}]

@router.get("/risks", response_model=List[RiskOut])
def list_risks(db: Session = Depends(get_db)):
    insp = inspect(db.bind)
    for tbl in insp.get_table_names():
        tl = tbl.lower()
        if tl in {"risks", "risk_options", "risk_multipliers"}:
            for (idc, lblc, multc) in [
                ("id", "label", "multiplier"),
                ("id", "name", "multiplier"),
                ("risk_id", "risk_name", "multiplier"),
            ]:
                try:
                    rows = db.execute(text(f'SELECT {idc} AS id, {lblc} AS label, {multc} AS multiplier FROM "{tbl}" ORDER BY 1')).all()
                    out = []
                    for r in rows:
                        try:
                            out.append({"id": int(r.id), "label": str(r.label), "multiplier": float(r.multiplier)})
                        except Exception:
                            continue
                    if out:
                        return out
                except Exception as e:
                    logger.error(f"Error reading {tbl}.{idc}/{lblc}/{multc}: {e}")
                    continue
    return [
        {"id": 1, "label": "Low",  "multiplier": 0.95},
        {"id": 2, "label": "Base", "multiplier": 1.00},
        {"id": 3, "label": "High", "multiplier": 1.10},
    ]

@router.get("/product_breakdown", response_model=StructuredBreakdownOut)
def product_breakdown(product_id: int, region_id: int, db: Session = Depends(get_db)):
    region = db.get(models.Region, region_id)
    if not region:
        logger.warning(f"Region not found for breakdown: {region_id}")
        raise HTTPException(404, "Region not found")
    tasks: List[TaskBreakdownOut] = []

    # Get all tasks for this product
    task_links = db.execute(
        select(models.TaskProduct.task_id, models.TaskProduct.qty)
        .where(models.TaskProduct.product_id == product_id)
    ).all()
    for tl in task_links:
        task = db.get(models.Task, tl.task_id)
        if not task:
            continue

        # Materials for this task
        tmat_rows = db.execute(
            select(models.TaskMaterial.id, models.Material.name, models.TaskMaterial.qty, models.Material.unit_cost)
            .join(models.Material, models.Material.id == models.TaskMaterial.material_id)
            .where(models.TaskMaterial.task_id == task.id)
        ).all()
        materials = [
            ItemOut(id=r.id, name=r.name, qty=_to_f(r.qty), unit_cost=_to_f(r.unit_cost))
            for r in tmat_rows
        ]

        # Equipment for this task
        equip_rows = db.execute(
            select(models.Equipment.id, models.Equipment.equipment_name, models.Equipment.price)
            .where(models.Equipment.task_id == task.id)
        ).all()
        equipment = [
            EquipmentOut(
                id=r.id,
                name=r.equipment_name,
                qty=1.0,
                unit_cost=_to_f(r.price)
            )
            for r in equip_rows
        ]

        # Labour for this task
        tl_rows = db.execute(
            select(
                models.TaskLabour.id,
                models.LabourRate.labour_type,
                models.TaskLabour.personnel,
                models.TaskLabour.hours,
                models.LabourRate.hours.label("default_hours"),
                models.LabourRate.cost_per_person,
                models.LabourRate.state_code,
            )
            .join(models.LabourRate, models.LabourRate.id == models.TaskLabour.labour_rate_id)
            .where(models.TaskLabour.task_id == task.id)
        ).all()
        labour = []
        for lr in tl_rows:
            if lr.state_code and region.state_code and lr.state_code != region.state_code:
                continue
            hours = _to_f(lr.hours) if lr.hours is not None else _to_f(lr.default_hours)
            qty = hours * _to_f(lr.personnel)
            unit_cost = _to_f(lr.cost_per_person)
            labour.append(ItemOut(id=lr.id, name=f"{lr.labour_type}", qty=qty, unit_cost=unit_cost))

        tasks.append(TaskBreakdownOut(
            id=task.id,
            name=task.task_name,
            qty=_to_f(tl.qty or 1),
            materials=materials,
            equipment=equipment,
            labour=labour
        ))

    return StructuredBreakdownOut(tasks=tasks)

# ---------- Nested product/task breakdown for quotes ----------
class MaterialIn(BaseModel):
    ref_id: Optional[int] = None
    name: str
    qty: float
    unit_cost: float

class EquipmentIn(BaseModel):
    ref_id: Optional[int] = None
    name: str
    qty: float
    unit_cost: float

class LabourIn(BaseModel):
    ref_id: Optional[int] = None
    name: str
    qty: float
    unit_cost: float

class TaskIn(BaseModel):
    ref_id: Optional[int] = None
    name: str
    qty: float
    unit_cost: float
    materials: List[MaterialIn] = Field(default_factory=list)
    equipment: List[EquipmentIn] = Field(default_factory=list)
    labour: List[LabourIn] = Field(default_factory=list)

class ProductIn(BaseModel):
    product_id: int
    name: str
    sor_code: Optional[str] = None
    tasks: List[TaskIn] = Field(default_factory=list)

class QuoteBreakdownIn(BaseModel):
    products: List[ProductIn] = Field(default_factory=list)

class QuotePayload(BaseModel):
    client_id: Optional[int] = None
    region_id: int
    product_ids: List[int] = Field(default_factory=list)
    risk_id: Optional[int] = None
    risk_multiplier: float
    risk_percent: Optional[float] = None
    breakdown: QuoteBreakdownIn
    additional_support: List[ItemOut] = Field(default_factory=list)
    totals: dict
    created_on: str  # ISO date
    status: Optional[str] = None

# ... [other imports & code unchanged] ...

@router.post("/quotes")
def create_quote(payload: QuotePayload, db: Session = Depends(get_db)):
    # --- Security & Validation ---
    if not isinstance(payload.region_id, int) or payload.region_id < 1:
        raise HTTPException(400, detail="Invalid or missing region_id")
    if not payload.product_ids or not all(isinstance(pid, int) and pid > 0 for pid in payload.product_ids):
        raise HTTPException(400, detail="At least one valid product_id is required")
    if payload.client_id is not None and (not isinstance(payload.client_id, int) or payload.client_id < 1):
        raise HTTPException(400, detail="Invalid client_id")
    if payload.risk_percent is not None and (payload.risk_percent < 0 or payload.risk_percent > 100):
        raise HTTPException(400, detail="risk_percent must be between 0 and 100")

    total = Decimal(str(payload.totals.get("total_after_risk", 0.0)))
    created_on = _iso_to_date(payload.created_on)

    cols = _table_columns(db, "quotes")
    vals: Dict[str, Any] = {}
    if "region_id" in cols:
        vals["region_id"] = payload.region_id
    if "client_id" in cols and payload.client_id is not None:
        vals["client_id"] = payload.client_id
    if "risk_id" in cols and payload.risk_id is not None:
        vals["risk_id"] = payload.risk_id
    if "risk_percent" in cols and payload.risk_percent is not None:
        vals["risk_percent"] = payload.risk_percent
    if "total_amount" in cols:
        vals["total_amount"] = total
    if "created_on" in cols:
        vals["created_on"] = created_on
    if "status" in cols:
        vals["status"] = payload.status if payload.status else "Draft"

    if not vals:
        logger.error("quotes table has no insertable columns")
        raise HTTPException(500, detail="quotes table has no insertable columns")

    col_list = ", ".join(vals.keys())
    ph_list = ", ".join(f":{k}" for k in vals.keys())
    stmt = text(f"INSERT INTO quotes ({col_list}) VALUES ({ph_list}) RETURNING id")
    new_id = db.execute(stmt, vals).scalar_one()

    # --- NEW: Add only material/equipment/labour/support items with task_id for each (no task QuoteItems) ---
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
                    quote_id=new_id,
                    item_type="material",
                    product_id=product_id,
                    task_id=task_id,
                    sor_code=getattr(mat, "sor_code", None),
                    ref_id=None,  # Not using ref_id for new logic
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
                    quote_id=new_id,
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
                    quote_id=new_id,
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
            quote_id=new_id,
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
        "quote_id": new_id,
        "message": "Quote saved successfully.",
        "clear_fields": True
    }