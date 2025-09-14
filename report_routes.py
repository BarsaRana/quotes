#report_routes.py
from __future__ import annotations
from datetime import date, timedelta
from decimal import Decimal
from typing import List, Optional, Literal

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, field_serializer
from sqlalchemy import func
from sqlalchemy.orm import Session

from db import get_db
import models

router = APIRouter(prefix="/quotes/report", tags=["Quotes: Reports"])

# ---------------- Pydantic DTOs --------
class TimePoint(BaseModel):
    bucket: str
    quote_count: int
    total_amount: Decimal
    @field_serializer("total_amount")
    def _ser_amount(self, v: Decimal, _info):
        return float(v)

class ByLocationRow(BaseModel):
    region_id: int
    location: str
    quote_count: int
    total_amount: Decimal
    avg_amount: Decimal
    @field_serializer("total_amount", "avg_amount")
    def _ser_amount(self, v: Decimal, _info):
        return float(v)

class TopItemRow(BaseModel):
    item_type: str
    description: str
    total_qty: Decimal
    revenue: Decimal
    avg_unit_cost: Decimal
    @field_serializer("total_qty", "revenue", "avg_unit_cost")
    def _ser_decimal(self, v: Decimal, _info):
        return float(v)

# ---------------- Helpers ----------------
def _date_trunc(expr, bucket: str):
    if bucket == "day":
        return func.to_char(expr, "YYYY-MM-DD")
    if bucket == "month":
        return func.to_char(expr, "YYYY-MM")
    raise ValueError("bucket must be 'day' or 'month'")

# ---------------- Endpoints --------------
@router.get("/time", response_model=List[TimePoint])
def quotes_over_time(
    bucket: Literal["day", "month"] = Query(default="day"),
    days: int = Query(default=60, ge=1, le=365*2),
    db: Session = Depends(get_db),
):
    since = date.today() - timedelta(days=days)
    q = (
        db.query(
            _date_trunc(models.Quote.created_on, bucket).label("bucket"),
            func.count(models.Quote.id).label("quote_count"),
            func.coalesce(func.sum(models.Quote.total_amount), 0).label("total_amount"),
        )
        .filter(models.Quote.created_on >= since)
        .group_by("bucket")
        .order_by("bucket")
    )
    rows = q.all()
    return [TimePoint(bucket=r.bucket, quote_count=r.quote_count, total_amount=r.total_amount) for r in rows]

@router.get("/location", response_model=List[ByLocationRow])
def quotes_by_location(db: Session = Depends(get_db)):
    q = (
        db.query(
            models.Region.id.label("region_id"),
            models.Region.name.label("location"),
            func.count(models.Quote.id).label("quote_count"),
            func.coalesce(func.sum(models.Quote.total_amount), 0).label("total_amount"),
            func.coalesce(func.avg(models.Quote.total_amount), 0).label("avg_amount"),
        )
        .join(models.Region, models.Region.id == models.Quote.region_id)
        .group_by(models.Region.id, models.Region.name)
        .order_by(func.count(models.Quote.id).desc())
    )
    rows = q.all()
    return [
        ByLocationRow(
            region_id=r.region_id,
            location=r.location,
            quote_count=r.quote_count,
            total_amount=r.total_amount,
            avg_amount=r.avg_amount,
        )
        for r in rows
    ]

@router.get("/items", response_model=List[TopItemRow])
def top_items(
    item_type: Optional[Literal["product", "material", "labour", "service"]] = None,
    limit: int = Query(default=15, ge=1, le=100),
    db: Session = Depends(get_db),
):
    qi = models.QuoteItem
    q = (
        db.query(
            qi.item_type,
            qi.description,
            func.coalesce(func.sum(qi.qty), 0).label("total_qty"),
            func.coalesce(func.sum(qi.line_total), 0).label("revenue"),
            func.coalesce(func.avg(qi.unit_cost), 0).label("avg_unit_cost"),
        )
        .group_by(qi.item_type, qi.description)
        .order_by(func.sum(qi.line_total).desc())
    )
    if item_type:
        q = q.filter(qi.item_type == item_type)
    rows = q.limit(limit).all()
    return [
        TopItemRow(
            item_type=r.item_type,
            description=r.description,
            total_qty=r.total_qty,
            revenue=r.revenue,
            avg_unit_cost=r.avg_unit_cost,
        )
        for r in rows
    ]
@router.get("/product")
def top_products(limit: int = 10, db: Session = Depends(get_db)):
    return top_items(item_type="product", limit=limit, db=db)

class ByClientRow(BaseModel):
    client_id: int
    client_name: str
    quote_count: int
    total_amount: Decimal
    avg_amount: Decimal
    @field_serializer("total_amount", "avg_amount")
    def _ser_amount(self, v: Decimal, _info):
        return float(v)

@router.get("/client", response_model=List[ByClientRow])
def quotes_by_client(db: Session = Depends(get_db)):
    q = (
        db.query(
            models.Client.id.label("client_id"),
            models.Client.name.label("client_name"),
            func.count(models.Quote.id).label("quote_count"),
            func.coalesce(func.sum(models.Quote.total_amount), 0).label("total_amount"),
            func.coalesce(func.avg(models.Quote.total_amount), 0).label("avg_amount"),
        )
        .join(models.Quote, models.Quote.client_id == models.Client.id)
        .group_by(models.Client.id, models.Client.name)
        .order_by(func.sum(models.Quote.total_amount).desc())
    )
    rows = q.all()
    return [
        ByClientRow(
            client_id=r.client_id,
            client_name=r.client_name,
            quote_count=r.quote_count,
            total_amount=r.total_amount,
            avg_amount=r.avg_amount,
        )
        for r in rows
    ]