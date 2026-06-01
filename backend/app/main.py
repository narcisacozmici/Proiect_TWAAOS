from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os

from app.core.config import settings
from app.core.database import engine, Base

from app.models import User, Event, EventMaterial
from app.models.category import Category
from app.models.feedback import Feedback
from app.models.registration import Registration

from app.api import auth, events
from app.api import categories, feedback, registrations, users, reports

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    os.makedirs("media/events", exist_ok=True)
    os.makedirs("media/qr", exist_ok=True)
    os.makedirs("media/materials", exist_ok=True)
    yield
    await engine.dispose()

app = FastAPI(
    title="USV Events API",
    description="Platformă de management al evenimentelor universitare",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/media", StaticFiles(directory="media"), name="media")

app.include_router(auth.router, prefix="/api/v1")
app.include_router(events.router, prefix="/api/v1")
app.include_router(categories.router, prefix="/api/v1")
app.include_router(feedback.router, prefix="/api/v1")
app.include_router(registrations.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(reports.router, prefix="/api/v1")

@app.get("/api/v1/health")
async def health_check():
    return {
        "status": "ok",
        "message": "USV Events API funcționează!",
        "version": "1.0.0"
    }