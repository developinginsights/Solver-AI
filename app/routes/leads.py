from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.models.database import get_db
from app.services import lead_service as lead_svc
from app.utils.logger import get_logger

router = APIRouter(prefix="/leads", tags=["leads"])
logger = get_logger(__name__)


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class LeadOut(BaseModel):
    session_id: str
    name: str | None
    email: str | None
    phone: str | None
    need: str | None
    budget: str | None
    timeline: str | None
    score: int
    status: str
    notes: str | None
    created_at: str
    updated_at: str | None

    model_config = {"from_attributes": True}


class LeadsListResponse(BaseModel):
    leads: list[LeadOut]
    total: int
    limit: int
    offset: int


class LeadPatch(BaseModel):
    status: str | None = None   # override AI classification
    notes: str | None = None
    name: str | None = None
    email: str | None = None
    phone: str | None = None


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("", response_model=LeadsListResponse)
def list_leads(
    status: str | None = Query(None, description="Filter by status: cold | warm | hot"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    leads, total = lead_svc.list_leads(db, status=status, limit=limit, offset=offset)
    return LeadsListResponse(
        leads=[_serialize(l) for l in leads],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/{session_id}", response_model=LeadOut)
def get_lead(session_id: str, db: Session = Depends(get_db)):
    lead = lead_svc.get_lead(db, session_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return _serialize(lead)


@router.patch("/{session_id}", response_model=LeadOut)
def update_lead(session_id: str, body: LeadPatch, db: Session = Depends(get_db)):
    lead = lead_svc.patch_lead(db, session_id, body.model_dump(exclude_none=True))
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    logger.info("Lead manually updated | session=%s", session_id)
    return _serialize(lead)


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _serialize(lead) -> LeadOut:
    return LeadOut(
        session_id=lead.session_id,
        name=lead.name,
        email=lead.email,
        phone=lead.phone,
        need=lead.need,
        budget=lead.budget,
        timeline=lead.timeline,
        score=lead.score,
        status=lead.status,
        notes=lead.notes,
        created_at=lead.created_at.isoformat() if lead.created_at else "",
        updated_at=lead.updated_at.isoformat() if lead.updated_at else None,
    )
