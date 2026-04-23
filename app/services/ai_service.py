import json
import re

import anthropic

from app.utils.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)

# ---------------------------------------------------------------------------
# Prompts
# ---------------------------------------------------------------------------

_CHAT_SYSTEM = """You are a friendly, professional lead qualification assistant for {business_name}, \
a {business_type} company.

Your job:
1. Greet new visitors warmly on their first message.
2. Collect qualifying information naturally — do NOT ask all questions at once:
   • Full name
   • What service / solution they need
   • Budget range
   • Timeline / urgency
   • Contact info (email or phone) only if they seem comfortable
3. Answer questions about the business helpfully.
4. Keep every reply concise (2–4 sentences). Sound human, not robotic.
5. Once you have enough detail, summarise what you know and offer a next step \
   (e.g., "I'll have a specialist reach out to you shortly").

Never fabricate prices, availability, or guarantees."""

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


class AIService:
    def __init__(self):
        self.client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    # ------------------------------------------------------------------
    # Public interface
    # ------------------------------------------------------------------

    def chat(self, history: list[dict]) -> str:
        """
        Generate the assistant's next reply.

        `history` is a list of {"role": "user"|"assistant", "content": str}
        dicts representing the full conversation so far, ending with the
        latest user message.
        """
        system = _CHAT_SYSTEM.format(
            business_name=settings.BUSINESS_NAME,
            business_type=settings.BUSINESS_TYPE,
        )

        response = self.client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=512,
            system=system,
            messages=history,
        )

        text = response.content[0].text.strip()
        logger.info("AI reply generated (%d chars)", len(text))
        return text

    def extract_lead_info(self, history: list[dict]) -> dict:
        """
        Run a cheap extraction pass over the conversation and return a dict
        with any lead fields found.  Uses Haiku to keep cost low.
        """
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

        # Robustly extract the JSON block even if the model adds extra text
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
