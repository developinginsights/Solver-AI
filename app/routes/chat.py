import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.models.database import get_db
from app.services import ai_service as _ai_module
from app.services import conversation_service as conv_svc
from app.services import lead_service as lead_svc
from app.utils.logger import get_logger

router = APIRouter(prefix="/chat", tags=["chat"])
logger = get_logger(__name__)

_ai = _ai_module.AIService()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class ChatRequest(BaseModel):
    session_id: str | None = Field(None, description="Omit to start a new conversation")
    message: str = Field(..., min_length=1, max_length=4000)


class MessageOut(BaseModel):
    role: str
    content: str
    created_at: str

    model_config = {"from_attributes": True}


class ChatResponse(BaseModel):
    session_id: str
    response: str
    lead_status: str
    lead_score: int


class HistoryResponse(BaseModel):
    session_id: str
    messages: list[MessageOut]


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/message", response_model=ChatResponse)
def send_message(body: ChatRequest, db: Session = Depends(get_db)):
    session_id = body.session_id or str(uuid.uuid4())

    # Ensure lead record exists
    lead_svc.get_or_create(db, session_id)

    # Persist the incoming user message
    conv_svc.add_message(db, session_id, "user", body.message)

    # Build full history for the AI (includes the message we just stored)
    history_rows = conv_svc.get_history(db, session_id)
    api_history = conv_svc.build_api_history(history_rows)

    # Generate AI reply
    try:
        reply = _ai.chat(api_history)
    except Exception as exc:
        logger.error("AI chat failed: %s", exc)
        raise HTTPException(status_code=502, detail="AI service error")

    # Persist AI reply
    conv_svc.add_message(db, session_id, "assistant", reply)

    # Background extraction — update lead with any new info
    try:
        extracted = _ai.extract_lead_info(api_history)
        lead = lead_svc.update_from_extraction(db, session_id, extracted)
    except Exception as exc:
        logger.warning("Lead extraction failed (non-fatal): %s", exc)
        lead = lead_svc.get_or_create(db, session_id)

    return ChatResponse(
        session_id=session_id,
        response=reply,
        lead_status=lead.status,
        lead_score=lead.score,
    )


@router.get("/history/{session_id}", response_model=HistoryResponse)
def get_history(session_id: str, db: Session = Depends(get_db)):
    messages = conv_svc.get_history(db, session_id)
    if not messages:
        raise HTTPException(status_code=404, detail="Session not found")

    return HistoryResponse(
        session_id=session_id,
        messages=[
            MessageOut(
                role=m.role,
                content=m.content,
                created_at=m.created_at.isoformat() if m.created_at else "",
            )
            for m in messages
        ],
    )
