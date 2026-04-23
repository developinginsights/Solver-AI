import re


# Words that indicate high urgency in the timeline field
_URGENT_KEYWORDS = {"immediately", "urgent", "asap", "now", "today", "this week", "right away"}


def _parse_budget_value(budget_str: str) -> float:
    """Return a rough numeric estimate from a budget string."""
    text = budget_str.lower().replace(",", "").replace("$", "")
    multiplier = 1
    if "k" in text:
        multiplier = 1_000
        text = text.replace("k", "")
    elif "m" in text:
        multiplier = 1_000_000
        text = text.replace("m", "")

    numbers = re.findall(r"\d+\.?\d*", text)
    if not numbers:
        return 0.0
    avg = sum(float(n) for n in numbers) / len(numbers)
    return avg * multiplier


def calculate_score(lead) -> int:
    """
    Score a lead 0-100 based on completeness and quality of information.

    Breakdown:
      name      → 15 pts
      need      → 20 pts
      budget    → 25 pts  (+ up to 20 bonus for higher budgets)
      timeline  → 15 pts  (+ 10 bonus for urgency)
      contact   → 10 pts  (email or phone)
    """
    score = 0

    if lead.name:
        score += 15

    if lead.need:
        score += 20

    if lead.budget:
        score += 25
        budget_value = _parse_budget_value(lead.budget)
        if budget_value >= 50_000:
            score += 20
        elif budget_value >= 10_000:
            score += 12
        elif budget_value >= 5_000:
            score += 6

    if lead.timeline:
        score += 15
        if any(kw in lead.timeline.lower() for kw in _URGENT_KEYWORDS):
            score += 10

    if lead.email or lead.phone:
        score += 10

    return min(score, 100)


def determine_status(score: int) -> str:
    if score >= 70:
        return "hot"
    if score >= 40:
        return "warm"
    return "cold"
