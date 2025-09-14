from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from typing import List, Optional
import models, schemas
# from .admin import models, schemas

# ----------------------------- MATERIALS -----------------------------
def create_material(db: Session, material: schemas.MaterialCreate) -> models.Material:
    db_material = models.Material(**material.dict())
    db.add(db_material)
    db.commit()
    db.refresh(db_material)
    return db_material

def get_material(db: Session, material_id: str) -> Optional[models.Material]:
    return db.query(models.Material).filter(models.Material.id == material_id).first()

def get_materials(db: Session, skip: int = 0, limit: int = 100) -> List[models.Material]:
    return db.query(models.Material).offset(skip).limit(limit).all()

def search_materials(db: Session, search: schemas.MaterialSearch) -> List[models.Material]:
    query = db.query(models.Material)
    if search.search_term:
        search_term = f"%{search.search_term}%"
        query = query.filter(
            or_(
                models.Material.id.ilike(search_term),
                models.Material.description.ilike(search_term),
                models.Material.sales_part_no.ilike(search_term)
            )
        )
    if search.site:
        query = query.filter(models.Material.site == search.site)
    if search.min_price is not None:
        query = query.filter(models.Material.price >= search.min_price)
    if search.max_price is not None:
        query = query.filter(models.Material.price <= search.max_price)
    return query.all()

def update_material(db: Session, material_id: str, material: schemas.MaterialUpdate) -> Optional[models.Material]:
    db_material = get_material(db, material_id)
    if db_material:
        update_data = material.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_material, field, value)
        db.commit()
        db.refresh(db_material)
    return db_material

def delete_material(db: Session, material_id: str) -> bool:
    db_material = get_material(db, material_id)
    if db_material:
        db.delete(db_material)
        db.commit()
        return True
    return False

# ----------------------------- EQUIPMENT -----------------------------
def create_equipment(db: Session, equipment: schemas.EquipmentCreate) -> models.Equipment:
    db_equipment = models.Equipment(**equipment.dict())
    db.add(db_equipment)
    db.commit()
    db.refresh(db_equipment)
    return db_equipment

def get_equipment(db: Session, equipment_id: str) -> Optional[models.Equipment]:
    return db.query(models.Equipment).filter(models.Equipment.id == equipment_id).first()

def get_equipment_list(db: Session, skip: int = 0, limit: int = 100) -> List[models.Equipment]:
    return db.query(models.Equipment).offset(skip).limit(limit).all()

def search_equipment(db: Session, search: schemas.EquipmentSearch) -> List[models.Equipment]:
    query = db.query(models.Equipment)
    if search.search_term:
        search_term = f"%{search.search_term}%"
        query = query.filter(
            or_(
                models.Equipment.id.ilike(search_term),
                models.Equipment.equipment_name.ilike(search_term),
                models.Equipment.category.ilike(search_term)
            )
        )
    if search.category:
        query = query.filter(models.Equipment.category == search.category)
    if search.site:
        query = query.filter(models.Equipment.site == search.site)
    if search.min_price is not None:
        query = query.filter(models.Equipment.price >= search.min_price)
    if search.max_price is not None:
        query = query.filter(models.Equipment.price <= search.max_price)
    return query.all()

def update_equipment(db: Session, equipment_id: str, equipment: schemas.EquipmentUpdate) -> Optional[models.Equipment]:
    db_equipment = get_equipment(db, equipment_id)
    if db_equipment:
        update_data = equipment.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_equipment, field, value)
        db.commit()
        db.refresh(db_equipment)
    return db_equipment

def delete_equipment(db: Session, equipment_id: str) -> bool:
    db_equipment = get_equipment(db, equipment_id)
    if db_equipment:
        db.delete(db_equipment)
        db.commit()
        return True
    return False

    db_project = get_project(db, project_id)
    if db_project:
        db.delete(db_project)
        db.commit()
        return True
    return False

# ----------------------------- LABOUR ROLE -----------------------------
def create_labour_role(db: Session, labour_role: schemas.LabourRoleCreate) -> models.LabourRole:
    db_labour_role = models.LabourRole(**labour_role.dict())
    db.add(db_labour_role)
    db.commit()
    db.refresh(db_labour_role)
    return db_labour_role

def get_labour_role(db: Session, labour_role_id: str) -> Optional[models.LabourRole]:
    return db.query(models.LabourRole).filter(models.LabourRole.id == labour_role_id).first()

def get_labour_roles(db: Session, skip: int = 0, limit: int = 100) -> List[models.LabourRole]:
    return db.query(models.LabourRole).offset(skip).limit(limit).all()

def update_labour_role(db: Session, labour_role_id: str, labour_role: schemas.LabourRoleUpdate) -> Optional[models.LabourRole]:
    db_labour_role = get_labour_role(db, labour_role_id)
    if db_labour_role:
        update_data = labour_role.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_labour_role, field, value)
        db.commit()
        db.refresh(db_labour_role)
    return db_labour_role

def delete_labour_role(db: Session, labour_role_id: str) -> bool:
    db_labour_role = get_labour_role(db, labour_role_id)
    if db_labour_role:
        db.delete(db_labour_role)
        db.commit()
        return True
    return False

# ----------------------------- LABOUR RATE -----------------------------
def create_labour_rate(db: Session, labour_rate: schemas.LabourRateCreate) -> models.LabourRate:
    db_labour_rate = models.LabourRate(**labour_rate.dict())
    db.add(db_labour_rate)
    db.commit()
    db.refresh(db_labour_rate)
    return db_labour_rate

def get_labour_rate(db: Session, labour_rate_id: int) -> Optional[models.LabourRate]:
    return db.query(models.LabourRate).filter(models.LabourRate.id == labour_rate_id).first()

def get_labour_rates(db: Session, skip: int = 0, limit: int = 100) -> List[models.LabourRate]:
    return db.query(models.LabourRate).offset(skip).limit(limit).all()

def get_labour_rates_by_state(db: Session, state_code: str) -> List[models.LabourRate]:
    return db.query(models.LabourRate).filter(models.LabourRate.state_code == state_code).all()

def update_labour_rate(db: Session, labour_rate_id: int, labour_rate: schemas.LabourRateBase) -> Optional[models.LabourRate]:
    db_labour_rate = get_labour_rate(db, labour_rate_id)
    if db_labour_rate:
        update_data = labour_rate.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_labour_rate, field, value)
        db.commit()
        db.refresh(db_labour_rate)
    return db_labour_rate

def delete_labour_rate(db: Session, labour_rate_id: int) -> bool:
    db_labour_rate = get_labour_rate(db, labour_rate_id)
    if db_labour_rate:
        db.delete(db_labour_rate)
        db.commit()
        return True
    return False

# ----------------------------- NOTIFICATIONS -----------------------------
def create_notification(db: Session, notification: schemas.NotificationCreate) -> models.Notification:
    db_notification = models.Notification(**notification.dict())
    db.add(db_notification)
    db.commit()
    db.refresh(db_notification)
    return db_notification

def get_notification(db: Session, notification_id: str) -> Optional[models.Notification]:
    return db.query(models.Notification).filter(models.Notification.id == notification_id).first()

def get_notifications(db: Session, skip: int = 0, limit: int = 100) -> List[models.Notification]:
    return db.query(models.Notification).order_by(models.Notification.created_at.desc()).offset(skip).limit(limit).all()

def get_unread_notifications(db: Session) -> List[models.Notification]:
    return db.query(models.Notification).filter(models.Notification.read == False).order_by(models.Notification.created_at.desc()).all()

def update_notification(db: Session, notification_id: str, notification: schemas.NotificationUpdate) -> Optional[models.Notification]:
    db_notification = get_notification(db, notification_id)
    if db_notification:
        update_data = notification.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_notification, field, value)
        db.commit()
        db.refresh(db_notification)
    return db_notification

def delete_notification(db: Session, notification_id: str) -> bool:
    db_notification = get_notification(db, notification_id)
    if db_notification:
        db.delete(db_notification)
        db.commit()
        return True
    return False

def mark_all_notifications_read(db: Session) -> int:
    result = db.query(models.Notification).filter(models.Notification.read == False).update({"read": True})
    db.commit()
    return result

# ----------------------------- STATISTICS -----------------------------
def get_material_statistics(db: Session):
    total_materials = db.query(models.Material).count()
    total_material_value = db.query(func.sum(models.Material.unit_cost)).scalar() or 0
    sites = db.query(models.Material.state_code).distinct().count()
    return {
        "total_materials": total_materials,
        "total_material_value": total_material_value,
        "sites": sites
    }

def get_equipment_statistics(db: Session):
    total_equipment = db.query(models.Equipment).count()
    total_equipment_value = db.query(func.sum(models.Equipment.price)).scalar() or 0
    categories = db.query(models.Equipment.category).distinct().count()
    return {
        "total_equipment": total_equipment,
        "total_equipment_value": total_equipment_value,
        "categories": categories
    }