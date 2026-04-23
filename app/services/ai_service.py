import json
import re

import anthropic

from app.utils.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)

# ---------------------------------------------------------------------------
# Prompts
# ---------------------------------------------------------------------------

_CHAT_SYSTEM = """You are an intelligent AI sales assistant for {business_name}, a {business_type} company.

Your goal: convert every conversation into a qualified lead.

General rules:
- Never reject a user request
- Never say "we don't do this"
- Never send users to other websites
- Always guide the conversation toward helping them

INDUSTRY: REAL ESTATE

Adapt your questions based on user intent:

1. BUYING PROPERTY
   Ask: budget range → preferred location (e.g. DHA phase/block) → property type (house, plot, apartment)
   Respond confidently as if you can find options for them.

2. SELLING PROPERTY
   Ask: property type → location → expected price
   Position yourself as connecting them with serious buyers.

3. RENTING
   Ask: budget → area → property type → furnished or not

4. GENERAL QUESTIONS
   Answer briefly, then redirect toward lead capture.

Conversation style:
- Short replies (2–4 lines max)
- Friendly, confident, slightly sales-focused
- Always end with ONE follow-up question
- Don't ask everything at once — progress naturally

Example:
User: "I want to buy a house in DHA Lahore"
Response: "Great choice — DHA Lahore is a premium area 👍 I can help you find the right options. What's your budget range?"

After collecting enough info → summarise what you know and offer a clear next step.
User intent detected: {intent}"""

_EXTRACT_SYSTEM = """You are a data-extraction assistant. \
Given a conversation transcript, return a JSON object with exactly these keys \
(use null for anything not mentioned):

{
  "name":     string | null,
  "need":     string | null,
  "budget":   string | null,
  "timeline": string | null,
  "email":    string | null,
  "phone":    string | null
}

Return ONLY the JSON object — no prose, no markdown fences."""

# ---------------------------------------------------------------------------
# Intent detection
# ---------------------------------------------------------------------------

def _detect_intent(history: list[dict]) -> str:
    """Scan the latest user message for buying/selling/renting intent."""
    for msg in reversed(history):
        if msg["role"] == "user":
            text = msg["content"].lower()
            if any(w in text for w in ("buy", "purchase", "buying")):
                return "buy"
            if any(w in text for w in ("sell", "selling", "seller")):
                return "sell"
            if any(w in text for w in ("rent", "renting", "lease")):
                return "rent"
            break
    return "general"


# ---------------------------------------------------------------------------
# Service
# ---------------------------------------------------------------------------

class AIService:
    def __init__(self):
        self.client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    def chat(self, history: list[dict]) -> str:
        intent = _detect_intent(history)

        system = _CHAT_SYSTEM.format(
            business_name=settings.BUSINESS_NAME,
            business_type=settings.BUSINESS_TYPE,
            intent=intent,
        )

        response = self.client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=512,
            system=system,
            messages=history,
        )

        text = response.content[0].text.strip()
        logger.info("AI reply generated | intent=%s chars=%d", intent, len(text))
        return text

    def extract_lead_info(self, history: list[dict]) -> dict:
        transcript = "\n".join(
            f"{m['role'].upper()}: {m['content']}" for m in history
        )

        response = self.client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=256,
            system=_EXTRACT_SYSTEM,
            messages=[{"role": "user", "content": transcript}],
        )

        raw = response.content[0].text.strip()
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if not match:
            logger.warning("Extraction returned no JSON; raw=%r", raw[:200])
            return {}

        try:
            data = json.loads(match.group())
            return {k: v for k, v in data.items() if v is not None}
        except json.JSONDecodeError as exc:
            logger.warning("JSON parse error during extraction: %s", exc)
            return {}
