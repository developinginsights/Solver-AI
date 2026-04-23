from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.utils.config import settings

# SQLite needs check_same_thread=False; PostgreSQL does not need it
_connect_args = {"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {}

engine = create_engine(settings.DATABASE_URL, connect_args=_connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    # Import models here so Base.metadata is populated before create_all
    from app.models.lead import Lead          # noqa: F401
    from app.models.conversation import Message  # noqa: F401

    Base.metadata.create_all(bind=engine)
