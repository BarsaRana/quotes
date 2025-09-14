from __future__ import annotations

from typing import List, Any, Dict
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, desc

from backend.db import get_db
from backend import models

router = APIRouter(tags=["quotes"])

@router.get("/quotes")
def list_quotes(
    db: Session = Depends(get_db),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    """
    Returns a quote list for the dashboard with:
    - client: client name
    - region: state_code
    - product: comma-separated product names (shows first 3, ... if more)
    - sor: comma-separated SOR codes (shows first 3, ... if more)
    """
    Quote = models.Quote
    Client = models.Client
    Region = models.Region
    QuoteItem = models.QuoteItem
    Product = models.Product

    # Get main quote rows & join client and region
    stmt = (
        select(
            Quote.id,
            Quote.created_on,
            Quote.total_amount,
            Quote.status,
            Client.name.label("client_name"),
            Region.state_code.label("state_code"),
        )
        .outerjoin(Client, Quote.client_id == Client.id)
        .outerjoin(Region, Quote.region_id == Region.id)
        .order_by(desc(Quote.created_on), desc(Quote.id))
        .limit(limit)
        .offset(offset)
    )
    rows = db.execute(stmt).all()
    quote_ids = [r.id for r in rows]

    # For all these quotes, fetch unique products used (from QuoteItem)
    if quote_ids:
        qitem_stmt = (
            select(
                QuoteItem.quote_id,
                Product.product_name,
                Product.sor_code,
            )
            .join(Product, QuoteItem.product_id == Product.id)
            .where(
                QuoteItem.quote_id.in_(quote_ids),
                QuoteItem.product_id != None,
                QuoteItem.item_type.in_(["task", "material", "equipment", "labour"])
            )
            .group_by(QuoteItem.quote_id, Product.product_name, Product.sor_code)
        )
        qitem_rows = db.execute(qitem_stmt).all()
    else:
        qitem_rows = []

    # Map: quote_id -> list of (product_name, sor_code)
    from collections import defaultdict
    products_by_quote = defaultdict(list)
    for qid, pname, sor in qitem_rows:
        products_by_quote[qid].append((pname, sor))

    out: List[Dict[str, Any]] = []
    for r in rows:
        d = r._asdict()
        qid = d["id"]
        products = products_by_quote.get(qid, [])
        product_names = []
        sor_codes = []
        for pname, sorcode in products[:3]:
            if pname and pname not in product_names:
                product_names.append(pname)
            if sorcode and sorcode not in sor_codes:
                sor_codes.append(sorcode)
        if len(products) > 3:
            product_names.append("...")
            sor_codes.append("...")
        out.append({
            "id": d["id"],
            "created_on": d["created_on"],
            "total_amount": float(d.get("total_amount") or 0),
            "status": d.get("status") or "draft",
            "client": d.get("client_name"),
            "region": d.get("state_code"),
            "product": ", ".join(product_names) if product_names else "—",
            "sor": ", ".join(sor_codes) if sor_codes else "—",
        })
    return out