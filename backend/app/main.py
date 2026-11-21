import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, FileResponse
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


# Mount built React frontend in production (Single-Container Railway deploy)
FRONTEND_DIST = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "frontend", "dist")
if os.path.exists(FRONTEND_DIST):
    # Mount assets folder
    assets_dir = os.path.join(FRONTEND_DIST, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    # Serve SPA index.html for all other frontend routes
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Don't intercept API or uploads routes
        if full_path.startswith("api/") or full_path.startswith("uploads/"):
            return JSONResponse(status_code=404, content={"detail": "Not found"})
        
        target_file = os.path.join(FRONTEND_DIST, full_path)
        if os.path.isfile(target_file):
            return FileResponse(target_file)
        
        index_file = os.path.join(FRONTEND_DIST, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        return JSONResponse(status_code=404, content={"detail": "Frontend not found"})
