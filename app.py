# backend/app.py
from __future__ import annotations
from typing import List

from fastapi import FastAPI, Depends, Request, Response, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text, func
from sqlalchemy.orm import Session
from backend import api_routes, report_routes, quotes, admin_routes
from backend import schemas
from backend.db import get_db, test_connection
from backend import models
from backend import equipment_routes
from backend import quotes_list_safe
# -----------------------------------------------------------------------------
# Create app FIRST
# -----------------------------------------------------------------------------
app = FastAPI(title="Rate Card API", version="1.0")

# -----------------------------------------------------------------------------
# CORS
# -----------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://localhost:3000",
        "*"  # tighten in prod
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------------------------------------------------------
# Startup DB check
# -----------------------------------------------------------------------------
@app.on_event("startup")
def _check_db() -> None:
    err = test_connection()
    print("DB connection OK" if not err else f"DB connection FAILED: {err}")

# -----------------------------------------------------------------------------
# Health & misc
# -----------------------------------------------------------------------------
@app.get("/health", response_model=schemas.HealthResponse)
def health(db: Session = Depends(get_db)) -> schemas.HealthResponse:
    try:
        db.execute(text("SELECT 1"))
        return schemas.HealthResponse(status="ok")
    except Exception as e:
        return schemas.HealthResponse(status="db_error", detail=str(e))

@app.get("/favicon.ico", include_in_schema=False)
async def favicon() -> Response:
    return Response(status_code=204)

# -----------------------------------------------------------------------------
# Validation logging
# -----------------------------------------------------------------------------
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    print("VALIDATION ERROR on", request.url.path, ":", exc.errors())
    return JSONResponse(status_code=422, content={"detail": exc.errors()})

# -----------------------------------------------------------------------------
# Minimal endpoints used by frontend
# -----------------------------------------------------------------------------
@app.get("/regions", response_model=List[schemas.RegionOut])
def get_regions(db: Session = Depends(get_db)):
    return db.query(models.Region).order_by(models.Region.name).all()

@app.post("/clients", response_model=schemas.ClientOut, status_code=201)
def create_client(payload: schemas.ClientIn, db: Session = Depends(get_db)):
    name = (payload.name or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Client name is required")
    existing = (
        db.query(models.Client)
          .filter(func.lower(models.Client.name) == name.lower())
          .first()
    )
    if existing:
        return existing
    client = models.Client(name=name)
    db.add(client)
    db.commit()
    db.refresh(client)
    return client

# -----------------------------------------------------------------------------
# Routers (API/calculator, admin, reports, quotes)
# -----------------------------------------------------------------------------
from backend import api_routes, report_routes, quotes, admin_routes

# Equipment router (legacy and client routes)
app.include_router(equipment_routes.router)

# Calculator & lookups (/clients GET, /products, /product_breakdown, /quotes POST + list/detail)
app.include_router(api_routes.router)

# Reports (/quotes/report/*)
app.include_router(report_routes.router)

# Quotes extras (e.g., /quotes/save, /quotes/{id}/pdf placeholder, etc.)
app.include_router(quotes.router)

# Admin CRUD (materials, equipment, projects, labour, notifications, stats)
app.include_router(admin_routes.router)
#-----Enable the Safe /quotes List Endpoint---
app.include_router(quotes_list_safe.router)
