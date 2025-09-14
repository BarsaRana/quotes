from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.db import get_db
from backend import models, schemas

router = APIRouter(prefix="/equipments", tags=["Equipments"])

@router.get("/", response_model=list[schemas.EquipmentResponse])
def list_equipments(db: Session = Depends(get_db)):
    return db.query(models.Equipment).all()

@router.post("/", response_model=schemas.EquipmentResponse, status_code=201)
def create_equipment(equipment: schemas.EquipmentCreate, db: Session = Depends(get_db)):
    eq = models.Equipment(**equipment.dict())
    db.add(eq)
    db.commit()
    db.refresh(eq)
    return eq

@router.get("/{equipment_id}", response_model=schemas.EquipmentResponse)
def get_equipment(equipment_id: str, db: Session = Depends(get_db)):
    eq = db.query(models.Equipment).filter(models.Equipment.id == equipment_id).first()
    if not eq:
        raise HTTPException(404, "Equipment not found")
    return eq

@router.put("/{equipment_id}", response_model=schemas.EquipmentResponse)
def update_equipment(equipment_id: str, equipment: schemas.EquipmentUpdate, db: Session = Depends(get_db)):
    eq = db.query(models.Equipment).filter(models.Equipment.id == equipment_id).first()
    if not eq:
        raise HTTPException(404, "Equipment not found")
    for k, v in equipment.dict(exclude_unset=True).items():
        setattr(eq, k, v)
    db.commit()
    db.refresh(eq)
    return eq

@router.delete("/{equipment_id}", status_code=204)
def delete_equipment(equipment_id: str, db: Session = Depends(get_db)):
    eq = db.query(models.Equipment).filter(models.Equipment.id == equipment_id).first()
    if not eq:
        raise HTTPException(404, "Equipment not found")
    db.delete(eq)
    db.commit()
    return