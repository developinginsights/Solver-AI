from sqlalchemy.orm import Session

from app.models.lead import Lead
from app.utils.logger import get_logger
from app.utils.scoring import calculate_score, determine_status

logger = get_logger(__name__)


# ---------------------------------------------------------------------------
# CRUD helpers
# ---------------------------------------------------------------------------

def get_or_create(db: Session, session_id: str) -> Lead:
    lead = db.query(Lead).filter(Lead.session_id == session_id).first()
    if not lead:
        lead = Lead(session_id=session_id)
        db.add(lead)
        db.commit()
        db.refresh(lead)
        logger.info("New lead created | session=%s", session_id)
    return lead


def update_from_extraction(db: Session, session_id: str, data: dict) -> Lead:
    """Merge extracted fields into the lead, then recalculate score/status."""
    lead = get_or_create(db, session_id)

    changed = False
    for field in ("name", "email", "phone", "need", "budget", "timeline"):
        value = data.get(field)
        if value and not getattr(lead, field):
            setattr(lead, field, value)
            changed = True

    if changed or lead.score == 0:
        lead.score = calculate_score(lead)
        lead.status = determine_status(lead.score)
        logger.info(
            "Lead updated | session=%s score=%d status=%s",
            session_id, lead.score, lead.status,
        )

    db.commit()
    db.refresh(lead)
    return lead


def get_lead(db: Session, session_id: str) -> Lead | None:
    return db.query(Lead).filter(Lead.session_id == session_id).first()


def list_leads(
    db: Session,
    status: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[Lead], int]:
    q = db.query(Lead)
    if status:
        q = q.filter(Lead.status == status)
    total = q.count()
    leads = q.order_by(Lead.score.desc()).offset(offset).limit(limit).all()
    return leads, total


def patch_lead(db: Session, session_id: str, updates: dict) -> Lead | None:
    lead = get_lead(db, session_id)
    if not lead:
        return None
    for field in ("status", "notes", "name", "email", "phone"):
        if field in updates and updates[field] is not None:
            setattr(lead, field, updates[field])
    db.commit()
    db.refresh(lead)
    return lead
