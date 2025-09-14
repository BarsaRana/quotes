from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import crud, models, schemas
from db import get_db

router = APIRouter(tags=["Admin CRUD"])

# ==================== MATERIALS ENDPOINTS ====================
@router.post("/materials/", response_model=schemas.MaterialResponse, status_code=status.HTTP_201_CREATED)
def create_material(material: schemas.MaterialCreate, db: Session = Depends(get_db)):
    return crud.create_material(db=db, material=material)

@router.get("/materials/", response_model=List[schemas.MaterialResponse])
def read_materials(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    materials = crud.get_materials(db, skip=skip, limit=limit)
    return materials

@router.get("/materials/{material_id}", response_model=schemas.MaterialResponse)
def read_material(material_id: str, db: Session = Depends(get_db)):
    db_material = crud.get_material(db, material_id=material_id)
    if db_material is None:
        raise HTTPException(status_code=404, detail="Material not found")
    return db_material

@router.put("/materials/{material_id}", response_model=schemas.MaterialResponse)
def update_material(material_id: str, material: schemas.MaterialUpdate, db: Session = Depends(get_db)):
    db_material = crud.update_material(db, material_id=material_id, material=material)
    if db_material is None:
        raise HTTPException(status_code=404, detail="Material not found")
    return db_material

@router.delete("/materials/{material_id}")
def delete_material(material_id: str, db: Session = Depends(get_db)):
    success = crud.delete_material(db, material_id=material_id)
    if not success:
        raise HTTPException(status_code=404, detail="Material not found")
    return {"message": "Material deleted successfully"}

@router.post("/materials/search/", response_model=List[schemas.MaterialResponse])
def search_materials(search: schemas.MaterialSearch, db: Session = Depends(get_db)):
    return crud.search_materials(db, search=search)

# ==================== EQUIPMENT ENDPOINTS ====================
@router.post("/equipment/", response_model=schemas.EquipmentResponse, status_code=status.HTTP_201_CREATED)
def create_equipment(equipment: schemas.EquipmentCreate, db: Session = Depends(get_db)):
    return crud.create_equipment(db=db, equipment=equipment)

@router.get("/equipment/", response_model=List[schemas.EquipmentResponse])
def read_equipment(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    equipment = crud.get_equipment_list(db, skip=skip, limit=limit)
    return equipment

@router.get("/equipment/{equipment_id}", response_model=schemas.EquipmentResponse)
def read_equipment_item(equipment_id: str, db: Session = Depends(get_db)):
    db_equipment = crud.get_equipment(db, equipment_id=equipment_id)
    if db_equipment is None:
        raise HTTPException(status_code=404, detail="Equipment not found")
    return db_equipment

@router.put("/equipment/{equipment_id}", response_model=schemas.EquipmentResponse)
def update_equipment(equipment_id: str, equipment: schemas.EquipmentUpdate, db: Session = Depends(get_db)):
    db_equipment = crud.update_equipment(db, equipment_id=equipment_id, equipment=equipment)
    if db_equipment is None:
        raise HTTPException(status_code=404, detail="Equipment not found")
    return db_equipment

@router.delete("/equipment/{equipment_id}")
def delete_equipment(equipment_id: str, db: Session = Depends(get_db)):
    success = crud.delete_equipment(db, equipment_id=equipment_id)
    if not success:
        raise HTTPException(status_code=404, detail="Equipment not found")
    return {"message": "Equipment deleted successfully"}

@router.post("/equipment/search/", response_model=List[schemas.EquipmentResponse])
def search_equipment(search: schemas.EquipmentSearch, db: Session = Depends(get_db)):
    return crud.search_equipment(db, search=search)


# ==================== LABOUR ROLES ENDPOINTS ====================
@router.post("/labour-roles/", response_model=schemas.LabourRoleResponse, status_code=status.HTTP_201_CREATED)
def create_labour_role(labour_role: schemas.LabourRoleCreate, db: Session = Depends(get_db)):
    return crud.create_labour_role(db=db, labour_role=labour_role)

@router.get("/labour-roles/", response_model=List[schemas.LabourRoleResponse])
def read_labour_roles(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    labour_roles = crud.get_labour_roles(db, skip=skip, limit=limit)
    return labour_roles

@router.get("/labour-roles/{labour_role_id}", response_model=schemas.LabourRoleResponse)
def read_labour_role(labour_role_id: str, db: Session = Depends(get_db)):
    db_labour_role = crud.get_labour_role(db, labour_role_id=labour_role_id)
    if db_labour_role is None:
        raise HTTPException(status_code=404, detail="Labour role not found")
    return db_labour_role

@router.put("/labour-roles/{labour_role_id}", response_model=schemas.LabourRoleResponse)
def update_labour_role(labour_role_id: str, labour_role: schemas.LabourRoleUpdate, db: Session = Depends(get_db)):
    db_labour_role = crud.update_labour_role(db, labour_role_id=labour_role_id, labour_role=labour_role)
    if db_labour_role is None:
        raise HTTPException(status_code=404, detail="Labour role not found")
    return db_labour_role

@router.delete("/labour-roles/{labour_role_id}")
def delete_labour_role(labour_role_id: str, db: Session = Depends(get_db)):
    success = crud.delete_labour_role(db, labour_role_id=labour_role_id)
    if not success:
        raise HTTPException(status_code=404, detail="Labour role not found")
    return {"message": "Labour role deleted successfully"}

# ==================== LABOUR RATES ENDPOINTS ====================
@router.post("/labour-rates/", response_model=schemas.LabourRateResponse, status_code=status.HTTP_201_CREATED)
def create_labour_rate(labour_rate: schemas.LabourRateCreate, db: Session = Depends(get_db)):
    return crud.create_labour_rate(db=db, labour_rate=labour_rate)

@router.get("/labour-rates/", response_model=List[schemas.LabourRateResponse])
def read_labour_rates(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    labour_rates = crud.get_labour_rates(db, skip=skip, limit=limit)
    return labour_rates

@router.get("/labour-rates/state/{state_code}", response_model=List[schemas.LabourRateResponse])
def read_labour_rates_by_state(state_code: str, db: Session = Depends(get_db)):
    labour_rates = crud.get_labour_rates_by_state(db, state_code=state_code)
    return labour_rates

@router.get("/labour-rates/{labour_rate_id}", response_model=schemas.LabourRateResponse)
def read_labour_rate(labour_rate_id: int, db: Session = Depends(get_db)):
    db_labour_rate = crud.get_labour_rate(db, labour_rate_id=labour_rate_id)
    if db_labour_rate is None:
        raise HTTPException(status_code=404, detail="Labour rate not found")
    return db_labour_rate

@router.put("/labour-rates/{labour_rate_id}", response_model=schemas.LabourRateResponse)
def update_labour_rate(labour_rate_id: int, labour_rate: schemas.LabourRateBase, db: Session = Depends(get_db)):
    db_labour_rate = crud.update_labour_rate(db, labour_rate_id=labour_rate_id, labour_rate=labour_rate)
    if db_labour_rate is None:
        raise HTTPException(status_code=404, detail="Labour rate not found")
    return db_labour_rate

@router.delete("/labour-rates/{labour_rate_id}")
def delete_labour_rate(labour_rate_id: int, db: Session = Depends(get_db)):
    success = crud.delete_labour_rate(db, labour_rate_id=labour_rate_id)
    if not success:
        raise HTTPException(status_code=404, detail="Labour rate not found")
    return {"message": "Labour rate deleted successfully"}

# ==================== NOTIFICATIONS ENDPOINTS ====================
@router.post("/notifications/", response_model=schemas.NotificationResponse, status_code=status.HTTP_201_CREATED)
def create_notification(notification: schemas.NotificationCreate, db: Session = Depends(get_db)):
    return crud.create_notification(db=db, notification=notification)

@router.get("/notifications/", response_model=List[schemas.NotificationResponse])
def read_notifications(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    notifications = crud.get_notifications(db, skip=skip, limit=limit)
    return notifications

@router.get("/notifications/unread/", response_model=List[schemas.NotificationResponse])
def read_unread_notifications(db: Session = Depends(get_db)):
    notifications = crud.get_unread_notifications(db)
    return notifications

@router.get("/notifications/{notification_id}", response_model=schemas.NotificationResponse)
def read_notification(notification_id: str, db: Session = Depends(get_db)):
    db_notification = crud.get_notification(db, notification_id=notification_id)
    if db_notification is None:
        raise HTTPException(status_code=404, detail="Notification not found")
    return db_notification

@router.put("/notifications/{notification_id}", response_model=schemas.NotificationResponse)
def update_notification(notification_id: str, notification: schemas.NotificationUpdate, db: Session = Depends(get_db)):
    db_notification = crud.update_notification(db, notification_id=notification_id, notification=notification)
    if db_notification is None:
        raise HTTPException(status_code=404, detail="Notification not found")
    return db_notification

@router.delete("/notifications/{notification_id}")
def delete_notification(notification_id: str, db: Session = Depends(get_db)):
    success = crud.delete_notification(db, notification_id=notification_id)
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Notification deleted successfully"}

@router.put("/notifications/mark-all-read/")
def mark_all_notifications_read(db: Session = Depends(get_db)):
    count = crud.mark_all_notifications_read(db)
    return {"message": f"Marked {count} notifications as read"}

# ==================== STATISTICS ENDPOINTS ====================
    return crud.get_project_statistics(db)

@router.get("/statistics/materials/")
def get_material_statistics(db: Session = Depends(get_db)):
    return crud.get_material_statistics(db)

@router.get("/statistics/equipment/")
def get_equipment_statistics(db: Session = Depends(get_db)):
    return crud.get_equipment_statistics(db)

@router.get("/statistics/dashboard/")
def get_dashboard_statistics(db: Session = Depends(get_db)):
    return {
        "projects": crud.get_project_statistics(db),
        "materials": crud.get_material_statistics(db),
        "equipment": crud.get_equipment_statistics(db)
    }