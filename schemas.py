from __future__ import annotations
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime

# -------------------------------------------------------------------------
# Health
# -------------------------------------------------------------------------
class HealthResponse(BaseModel):
    status: str
    detail: Optional[str] = None

# -------------------------------------------------------------------------
# Admin-side Pydantic schemas: CRUD for Material, Equipment, Labour, etc.
# -------------------------------------------------------------------------

# --- Material ---
class MaterialBase(BaseModel):
    sales_part_no: str
    description: str
    name: str
    state_code: str
    qty: int = 1
    unit_cost: float
    image_url: Optional[str] = None
    sor_code: Optional[str] = None

class MaterialCreate(MaterialBase):
    pass

class MaterialUpdate(BaseModel):
    sales_part_no: Optional[str] = None
    description: Optional[str] = None
    name: Optional[str] = None
    state_code: Optional[str] = None
    qty: Optional[int] = None
    unit_cost: Optional[float] = None
    image_url: Optional[str] = None
    sor_code: Optional[str] = None

class MaterialResponse(MaterialBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class MaterialSearch(BaseModel):
    search_term: Optional[str] = None
    state_code: Optional[str] = None
    min_price: Optional[float] = None
    max_price: Optional[float] = None

# --- Equipment ---
class EquipmentBase(BaseModel):
    task_id: Optional[int] = None
    sales_part_no: str
    equipment_name: str
    category: str
    state_code: str
    price: float
    price_incl_tax: float
    sor_code: Optional[str] = None

class EquipmentCreate(EquipmentBase):
    pass

class EquipmentUpdate(BaseModel):
    task_id: Optional[int] = None
    sales_part_no: Optional[str] = None
    equipment_name: Optional[str] = None
    category: Optional[str] = None
    state_code: Optional[str] = None
    price: Optional[float] = None
    price_incl_tax: Optional[float] = None
    sor_code: Optional[str] = None

class EquipmentResponse(EquipmentBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class EquipmentSearch(BaseModel):
    search_term: Optional[str] = None
    category: Optional[str] = None
    state_code: Optional[str] = None
    min_price: Optional[float] = None
    max_price: Optional[float] = None

# --- LabourRole ---
class LabourRoleBase(BaseModel):
    type: str
    base_rate: float
    state: str = "normal"
    region: str = "suburban"

class LabourRoleCreate(LabourRoleBase):
    id: str

class LabourRoleUpdate(BaseModel):
    type: Optional[str] = None
    base_rate: Optional[float] = None
    state: Optional[str] = None
    region: Optional[str] = None

class LabourRoleResponse(LabourRoleBase):
    id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

# --- LabourRate ---
class LabourRateBase(BaseModel):
    labour_type: str
    cost_per_person: float
    hours: float
    state_code: str

class LabourRateCreate(LabourRateBase):
    pass

class LabourRateUpdate(BaseModel):
    labour_type: Optional[str] = None
    cost_per_person: Optional[float] = None
    hours: Optional[float] = None
    state_code: Optional[str] = None

class LabourRateResponse(LabourRateBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

# --- Notification ---
class NotificationBase(BaseModel):
    type: str
    message: str
    time: str
    read: bool = False
    severity: Optional[str] = None
    item_type: Optional[str] = None
    item_id: Optional[str] = None
    old_price: Optional[float] = None
    new_price: Optional[float] = None
    days_remaining: Optional[int] = None
    days_overdue: Optional[int] = None
    overrun_percent: Optional[float] = None
    labor_id: Optional[str] = None
    estimated_hours: Optional[int] = None
    actual_hours: Optional[int] = None

class NotificationCreate(NotificationBase):
    id: str

class NotificationUpdate(BaseModel):
    read: Optional[bool] = None
    severity: Optional[str] = None

class NotificationResponse(NotificationBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

# -------------------------------------------------------------------------
# Client-side/Nested Pydantic schemas for QUOTES (class-based logic)
# -------------------------------------------------------------------------
class MaterialIn(BaseModel):
    ref_id: Optional[int] = None
    name: str
    qty: float
    unit_cost: float
    sor_code: Optional[str] = None

class EquipmentIn(BaseModel):
    ref_id: Optional[int] = None
    name: str
    qty: float
    unit_cost: float
    sor_code: Optional[str] = None

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
    sor_code: Optional[str] = None

class ProductIn(BaseModel):
    ref_id: Optional[int] = None
    product_id: int
    name: str
    sor_code: Optional[str] = None
    tasks: List[TaskIn] = Field(default_factory=list)

class QuoteBreakdownIn(BaseModel):
    products: List[ProductIn] = Field(default_factory=list)

class QuoteCreateNested(BaseModel):
    client_id: Optional[int]
    region_id: int
    risk_percent: Optional[float]
    total_amount: Optional[float]
    created_on: Optional[str]
    status: Optional[str]
    breakdown: QuoteBreakdownIn
    additional_support: List[MaterialIn] = Field(default_factory=list)

# -------------------------------------------------------------------------
# Client-side Pydantic schemas (readonly or limited create)
# -------------------------------------------------------------------------
class RegionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    state_code: str
    name: str

class ClientIn(BaseModel):
    name: str

class ClientOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str

class ProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    product_name: str

class MaterialOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    unit_cost: float

class TaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    task_name: str

class LabourOut(BaseModel):
    labour_rate_id: int
    labour_type: str
    cost_per_person: float

class EquipmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    task_id: Optional[int]
    sales_part_no: str
    equipment_name: str
    category: str
    state_code: str
    price: float
    price_incl_tax: float

class QuoteCreate(BaseModel):
    client_id: Optional[int]
    region_id: int
    product_id: Optional[int]
    risk_percent: Optional[float]
    total_amount: Optional[float]
    created_on: Optional[str]
    status: Optional[str]

class QuoteRead(BaseModel):
    id: int
    client_id: Optional[int]
    region_id: int
    product_id: Optional[int]
    risk_percent: Optional[float]
    total_amount: Optional[float]
    created_on: Optional[str]
    status: Optional[str]

# Dashboard and analytics schemas
class QuoteStatusCount(BaseModel):
    status: str
    count: int

class QuoteOverTime(BaseModel):
    month: str
    count: int

class TopProduct(BaseModel):
    product_name: str
    count: int

class DashboardData(BaseModel):
    total_quotes: int
    avg_quote_value: float
    status_data: List[QuoteStatusCount]
    quotes_over_time: List[QuoteOverTime]
    top_products: List[TopProduct]