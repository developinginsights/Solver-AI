from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.sql import func

from app.models.database import Base


class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(64), unique=True, index=True, nullable=False)

    # Qualifying fields populated progressively during the conversation
    name = Column(String(120), nullable=True)
    email = Column(String(120), nullable=True)
    phone = Column(String(30), nullable=True)
    need = Column(Text, nullable=True)
    budget = Column(String(80), nullable=True)
    timeline = Column(String(80), nullable=True)

    # Scoring & classification
    score = Column(Integer, default=0)
    status = Column(String(10), default="cold")  # cold | warm | hot

    notes = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())
