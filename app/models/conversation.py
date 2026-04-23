from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.sql import func

from app.models.database import Base


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(64), index=True, nullable=False)
    role = Column(String(10), nullable=False)   # "user" | "assistant"
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
