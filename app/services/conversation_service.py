from sqlalchemy.orm import Session

from app.models.conversation import Message
from app.utils.logger import get_logger

logger = get_logger(__name__)


def add_message(db: Session, session_id: str, role: str, content: str) -> Message:
    msg = Message(session_id=session_id, role=role, content=content)
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg


def get_history(db: Session, session_id: str) -> list[Message]:
    return (
        db.query(Message)
        .filter(Message.session_id == session_id)
        .order_by(Message.id)
        .all()
    )


def build_api_history(messages: list[Message]) -> list[dict]:
    """Convert DB messages to the format expected by the Anthropic API."""
    return [{"role": m.role, "content": m.content} for m in messages]
