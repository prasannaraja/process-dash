from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from app.db import init_db
from app.routers import health, intents, blocks, reports, export, recovery

app = FastAPI(title="Work Observability API", version="0.1.0")

# CORS Setup
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
api_router = APIRouter(prefix="/api")
api_router.include_router(health.router)
api_router.include_router(intents.router)
api_router.include_router(blocks.router)
api_router.include_router(reports.router)
api_router.include_router(export.router)
api_router.include_router(recovery.router)

app.include_router(api_router)


@app.on_event("startup")
def on_startup():
    init_db()
