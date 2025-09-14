from __future__ import annotations
from sqlalchemy.orm import declarative_base, Mapped, mapped_column, relationship
from sqlalchemy import (
    Boolean, SmallInteger, Integer, String, Numeric, Float, ForeignKey, Text, Date, DateTime,
    UniqueConstraint, CheckConstraint, Index
)
from sqlalchemy.sql import func

Base = declarative_base()

# ---------------- Core lookups ----------------
class Region(Base):
    __tablename__ = "regions"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    state_code: Mapped[str] = mapped_column(String(10), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(100))

    products: Mapped[list["Product"]] = relationship(back_populates="region", cascade="all, delete-orphan")
    labour_rates: Mapped[list["LabourRate"]] = relationship(back_populates="region", cascade="all, delete-orphan")
    materials: Mapped[list["Material"]] = relationship(back_populates="region", cascade="all, delete-orphan")


class Client(Base):
    __tablename__ = "clients"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True, index=True)

    quotes: Mapped[list["Quote"]] = relationship(back_populates="client")


# --- SOR Table ---
class SORItem(Base):
    __tablename__ = "sor_items"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    sor_code: Mapped[str] = mapped_column(String, unique=True, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    uom: Mapped[str] = mapped_column(String, nullable=False)  # Unit of Measure
    cost_wa: Mapped[float | None] = mapped_column(Float, nullable=True)
    cost_nsw: Mapped[float | None] = mapped_column(Float, nullable=True)
    cost_vic: Mapped[float | None] = mapped_column(Float, nullable=True)
    cost_qld: Mapped[float | None] = mapped_column(Float, nullable=True)
    cost_nt: Mapped[float | None] = mapped_column(Float, nullable=True)
    cost_sa: Mapped[float | None] = mapped_column(Float, nullable=True)
    cost_tas: Mapped[float | None] = mapped_column(Float, nullable=True)
    cost_act: Mapped[float | None] = mapped_column(Float, nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)

    products: Mapped[list["Product"]] = relationship(back_populates="sor_item")
    materials: Mapped[list["Material"]] = relationship(back_populates="sor_item")
    equipments: Mapped[list["Equipment"]] = relationship(back_populates="sor_item")
    quote_items: Mapped[list["QuoteItem"]] = relationship(back_populates="sor_item")
    # Optionally: labour_rates: Mapped[list["LabourRate"]] = relationship(back_populates="sor_item")


class Product(Base):
    __tablename__ = "products"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    product_name: Mapped[str] = mapped_column(String(100))
    cost: Mapped[Numeric] = mapped_column(Numeric(10, 2), default=0)
    qty: Mapped[int] = mapped_column(Integer, default=1)
    state_code: Mapped[str] = mapped_column(
        String(10),
        ForeignKey("regions.state_code", ondelete="RESTRICT"),
        index=True
    )
    sor_code: Mapped[str | None] = mapped_column(
        String(30),
        ForeignKey("sor_items.sor_code", ondelete="SET NULL"),
        nullable=True,
        index=True
    )

    region: Mapped["Region"] = relationship(back_populates="products")
    sor_item: Mapped["SORItem | None"] = relationship(back_populates="products")
    materials: Mapped[list["ProductMaterial"]] = relationship(back_populates="product", cascade="all, delete-orphan")
    task_links: Mapped[list["TaskProduct"]] = relationship(back_populates="product", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint("qty >= 0", name="ck_products_qty_nonneg"),
        CheckConstraint("cost >= 0", name="ck_products_cost_nonneg"),
        Index("ix_products_name_region", "product_name", "state_code"),
    )

class Material(Base):
    __tablename__ = "materials"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    sales_part_no: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    name: Mapped[str] = mapped_column(String(100))
    state_code: Mapped[str] = mapped_column(
        String(10),
        ForeignKey("regions.state_code", ondelete="RESTRICT"),
        index=True,
        nullable=False
    )
    qty: Mapped[int] = mapped_column(Integer, default=1)
    unit_cost: Mapped[Numeric] = mapped_column(Numeric(10, 2), default=0)
    image_url: Mapped[str | None] = mapped_column(String, nullable=True)
    sor_code: Mapped[str | None] = mapped_column(
        String,
        ForeignKey("sor_items.sor_code", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), onupdate=func.now())

    region: Mapped["Region"] = relationship(back_populates="materials")
    sor_item: Mapped["SORItem | None"] = relationship(back_populates="materials")
    product_links: Mapped[list["ProductMaterial"]] = relationship(back_populates="material", cascade="all, delete-orphan")
    task_links: Mapped[list["TaskMaterial"]] = relationship(back_populates="material", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint("qty >= 0", name="ck_materials_qty_nonneg"),
        CheckConstraint("unit_cost >= 0", name="ck_materials_unit_cost_nonneg"),
        Index("ix_materials_name", "name"),
    )

class LabourRole(Base):
    __tablename__ = "labour_roles"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    type: Mapped[str] = mapped_column(String, nullable=False)
    base_rate: Mapped[float] = mapped_column(Float, nullable=False)
    state: Mapped[str] = mapped_column(String, default="normal")
    region: Mapped[str] = mapped_column(String, default="suburban")
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), onupdate=func.now())
    
class LabourRate(Base):
    __tablename__ = "labour_rates"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    labour_type: Mapped[str] = mapped_column(String(100))
    cost_per_person: Mapped[Numeric] = mapped_column(Numeric(10, 2), default=0)
    hours: Mapped[Numeric] = mapped_column(Numeric(10, 2), default=1)
    state_code: Mapped[str] = mapped_column(
        String(10),
        ForeignKey("regions.state_code", ondelete="RESTRICT"),
        index=True
    )
    # Optionally: sor_code: Mapped[str | None] = mapped_column(String, ForeignKey("sor_items.sor_code", ondelete="SET NULL"), nullable=True, index=True)

    region: Mapped["Region"] = relationship(back_populates="labour_rates")
    task_links: Mapped[list["TaskLabour"]] = relationship(back_populates="labour_rate", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint("cost_per_person >= 0", name="ck_labour_rate_cost_nonneg"),
        CheckConstraint("hours >= 0", name="ck_labour_rate_hours_nonneg"),
        Index("ix_labour_rates_type_region", "labour_type", "state_code"),
    )


# ---------------- Tasks & junctions -----------
class Task(Base):
    __tablename__ = "tasks"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    task_name: Mapped[str] = mapped_column(String(100))
    personnel: Mapped[int] = mapped_column(Integer, default=1)
    hours: Mapped[int] = mapped_column(Integer, default=1)
    state_code: Mapped[str] = mapped_column(String(10), index=True)
   

    products: Mapped[list["TaskProduct"]] = relationship(back_populates="task", cascade="all, delete-orphan")
    materials: Mapped[list["TaskMaterial"]] = relationship(back_populates="task", cascade="all, delete-orphan")
    labour: Mapped[list["TaskLabour"]] = relationship(back_populates="task", cascade="all, delete-orphan")
    equipments: Mapped[list["Equipment"]] = relationship(
        "Equipment",
        back_populates="task",
        cascade="all, delete-orphan"
    )

    __table_args__ = (
        CheckConstraint("personnel >= 0", name="ck_tasks_personnel_nonneg"),
        CheckConstraint("hours >= 0", name="ck_tasks_hours_nonneg"),
        Index("ix_tasks_name_region", "task_name", "state_code"),
    )


class TaskProduct(Base):
    __tablename__ = "task_products"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"), index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), index=True)
    qty: Mapped[int] = mapped_column(Integer, default=1)

    task: Mapped["Task"] = relationship(back_populates="products")
    product: Mapped["Product"] = relationship(back_populates="task_links")

    __table_args__ = (
        UniqueConstraint("task_id", "product_id", name="uq_task_product"),
        CheckConstraint("qty >= 0", name="ck_task_product_qty_nonneg"),
    )


class TaskMaterial(Base):
    __tablename__ = "task_materials"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"), index=True)
    material_id: Mapped[int] = mapped_column(ForeignKey("materials.id", ondelete="CASCADE"), index=True)
    qty: Mapped[int] = mapped_column(Integer, default=1)

    task: Mapped["Task"] = relationship(back_populates="materials")
    material: Mapped["Material"] = relationship(back_populates="task_links")

    __table_args__ = (
        UniqueConstraint("task_id", "material_id", name="uq_task_material"),
        CheckConstraint("qty >= 0", name="ck_task_material_qty_nonneg"),
    )


class TaskLabour(Base):
    __tablename__ = "task_labour"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"), index=True)
    labour_rate_id: Mapped[int] = mapped_column(ForeignKey("labour_rates.id", ondelete="CASCADE"), index=True)
    personnel: Mapped[int] = mapped_column(Integer, default=1)
    hours: Mapped[Numeric | None] = mapped_column(Numeric(10, 2), nullable=True)

    task: Mapped["Task"] = relationship(back_populates="labour")
    labour_rate: Mapped["LabourRate"] = relationship(back_populates="task_links")

    __table_args__ = (
        UniqueConstraint("task_id", "labour_rate_id", name="uq_task_labour_rate"),
        CheckConstraint("personnel >= 0", name="ck_task_labour_personnel_nonneg"),
        CheckConstraint("hours IS NULL OR hours >= 0", name="ck_task_labour_hours_nonneg_or_null"),
    )


class ProductMaterial(Base):
    __tablename__ = "product_materials"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), index=True)
    material_id: Mapped[int] = mapped_column(ForeignKey("materials.id", ondelete="CASCADE"), index=True)
    qty: Mapped[int] = mapped_column(Integer, default=1)

    product: Mapped["Product"] = relationship(back_populates="materials")
    material: Mapped["Material"] = relationship(back_populates="product_links")
    
    __table_args__ = (
        UniqueConstraint("product_id", "material_id", name="uq_product_material"),
        CheckConstraint("qty >= 0", name="ck_product_material_qty_nonneg"),
    )


class Equipment(Base):
    __tablename__ = "equipments"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True)
    sales_part_no: Mapped[str] = mapped_column(String(50))
    equipment_name: Mapped[str] = mapped_column(Text)
    category: Mapped[str] = mapped_column(String, nullable=False)
    state_code: Mapped[str] = mapped_column(String(100))
    price: Mapped[Numeric] = mapped_column(Numeric(12, 2))
    price_incl_tax: Mapped[Numeric] = mapped_column(Numeric(12, 2))
    sor_code: Mapped[str | None] = mapped_column(
        String,
        ForeignKey("sor_items.sor_code", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), onupdate=func.now())
    task: Mapped["Task | None"] = relationship("Task", back_populates="equipments", foreign_keys=[task_id])
    sor_item: Mapped["SORItem | None"] = relationship(back_populates="equipments")

# ---------------- Quotes ----------------------
class Quote(Base):
    __tablename__ = "quotes"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    client_id: Mapped[int | None] = mapped_column(ForeignKey("clients.id", ondelete="SET NULL"), index=True, nullable=True)
    region_id: Mapped[int] = mapped_column(ForeignKey("regions.id", ondelete="RESTRICT"), index=True)

    risk_percent: Mapped[Numeric | None] = mapped_column(Numeric(5, 2), nullable=True)
    total_amount: Mapped[Numeric] = mapped_column(Numeric(12, 2), default=0)
    created_on: Mapped[Date] = mapped_column(Date, index=True, server_default=func.current_date())
    status: Mapped[str | None] = mapped_column(String(20), index=True)

    client: Mapped["Client | None"] = relationship(back_populates="quotes")
    region: Mapped["Region"] = relationship()
    items: Mapped[list["QuoteItem"]] = relationship(
        back_populates="quote",
        cascade="all, delete-orphan",
        passive_deletes=True
    )

    __table_args__ = (
        CheckConstraint("total_amount >= 0", name="ck_quotes_total_nonneg"),
        Index("ix_quotes_region_status_date", "region_id", "status", "created_on"),
    )


class QuoteItem(Base):
    __tablename__ = "quote_items"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    quote_id: Mapped[int] = mapped_column(ForeignKey("quotes.id", ondelete="CASCADE"), index=True)
    product_id: Mapped[int | None] = mapped_column(ForeignKey("products.id", ondelete="SET NULL"), index=True, nullable=True)  # NEW: Link to parent product!
    task_id: Mapped[int | None] = mapped_column(ForeignKey("tasks.id", ondelete="SET NULL"), index=True, nullable=True)  # <-- add this if not present
    item_type: Mapped[str] = mapped_column(String(20))
    ref_id: Mapped[int | None] = mapped_column(Integer)
    sor_code: Mapped[str | None] = mapped_column(
        String,
        ForeignKey("sor_items.sor_code", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    description: Mapped[str] = mapped_column(Text)
    qty: Mapped[Numeric] = mapped_column(Numeric(10, 2), default=1)
    unit_cost: Mapped[Numeric] = mapped_column(Numeric(12, 2), default=0)
    line_total: Mapped[Numeric] = mapped_column(Numeric(12, 2), default=0)

    quote: Mapped["Quote"] = relationship(back_populates="items")
    product: Mapped["Product | None"] = relationship("Product")
    sor_item: Mapped["SORItem | None"] = relationship(back_populates="quote_items")

    __table_args__ = (
        CheckConstraint("qty >= 0", name="ck_quote_items_qty_nonneg"),
        CheckConstraint("unit_cost >= 0", name="ck_quote_items_unit_cost_nonneg"),
        CheckConstraint("line_total >= 0", name="ck_quote_items_line_total_nonneg"),
        Index("ix_quote_items_type_ref", "item_type", "ref_id"),
        Index("ix_quote_items_product_id", "product_id"),
    )

class Notification(Base):
    __tablename__ = "notifications"
    id: Mapped[str] = mapped_column(String, primary_key=True, index=True)
    type: Mapped[str] = mapped_column(String, nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    time: Mapped[str] = mapped_column(String, nullable=False)
    read: Mapped[bool] = mapped_column(Boolean, default=False)
    severity: Mapped[str | None] = mapped_column(String, nullable=True)
    item_type: Mapped[str | None] = mapped_column(String, nullable=True)
    item_id: Mapped[str | None] = mapped_column(String, nullable=True)
    old_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    new_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    days_remaining: Mapped[int | None] = mapped_column(Integer, nullable=True)
    days_overdue: Mapped[int | None] = mapped_column(Integer, nullable=True)
    overrun_percent: Mapped[float | None] = mapped_column(Float, nullable=True)
    labor_id: Mapped[str | None] = mapped_column(String, nullable=True)
    estimated_hours: Mapped[int | None] = mapped_column(Integer, nullable=True)
    actual_hours: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), onupdate=func.now())


