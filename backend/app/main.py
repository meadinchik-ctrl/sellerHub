import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from backend.app.core.config import settings
from backend.app.core.database import init_db, AsyncSessionLocal
from backend.app.api import (
    auth, stores, products, categories, import_export, analytics, crm, team, plans, public, admin, upload, modules
)
from backend.app.api.plans import ensure_plans
from backend.app.core.seed import seed_database


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure upload directory exists & initialize database
    os.makedirs(settings.STORAGE_DIR, exist_ok=True)
    await init_db()
    async with AsyncSessionLocal() as session:
        await ensure_plans(session)
    yield
    # Shutdown


app = FastAPI(
    title=settings.platform.platform_name,
    description=settings.platform.platform_description,
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware
origins = [
    settings.FRONTEND_URL,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount uploads directory for images/files
os.makedirs(settings.STORAGE_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.STORAGE_DIR), name="uploads")


# Global Maintenance mode check
@app.middleware("http")
async def check_maintenance(request: Request, call_next):
    if settings.platform.maintenance_mode and not request.url.path.startswith("/api/admin") and not request.url.path.startswith("/api/auth"):
        return JSONResponse(
            status_code=503,
            content={"detail": "Платформа находится на техническом обслуживании. Пожалуйста, зайдите позже."}
        )
    return await call_next(request)


# Include Routers
app.include_router(auth.router, prefix="/api")
app.include_router(stores.router, prefix="/api")
app.include_router(products.router, prefix="/api")
app.include_router(categories.router, prefix="/api")
app.include_router(import_export.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(crm.router, prefix="/api")
app.include_router(team.router, prefix="/api")
app.include_router(plans.router, prefix="/api")
app.include_router(public.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(upload.router, prefix="/api")
app.include_router(modules.router, prefix="/api")


@app.post("/api/admin/seed-demo-data")
async def seed_demo():
    async with AsyncSessionLocal() as session:
        return await seed_database(session)


@app.get("/health")
@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "platform": settings.platform.platform_name,
        "version": "1.0.0",
        "maintenance_mode": settings.platform.maintenance_mode
    }
