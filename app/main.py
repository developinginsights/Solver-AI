from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.models.database import init_db
from app.routes import chat, leads
from app.utils.logger import get_logger

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up — initialising database…")
    init_db()
    logger.info("Database ready.")
    yield
    logger.info("Shutting down.")


app = FastAPI(
    title="Lead Generation AI",
    description="AI-powered lead qualification system for service businesses.",
    version="1.0.0",
    lifespan=lifespan,
)

# Allow all origins in development; tighten in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router, prefix="/api")
app.include_router(leads.router, prefix="/api")


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled exception on %s: %s", request.url.path, exc, exc_info=True)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


@app.get("/", tags=["health"])
def health():
    return {"status": "ok", "service": "Lead Generation AI"}
