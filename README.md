# Lead Generation AI

An AI-powered lead qualification system built with FastAPI + Claude.  
Drop it in front of any service business (real estate, clinic, agency) and it will greet visitors, ask qualifying questions, score leads automatically, and store everything in a database.

---

## Architecture

```
app/
├── main.py                  # FastAPI app, lifespan, middleware
├── models/
│   ├── database.py          # SQLAlchemy engine + session factory
│   ├── lead.py              # Lead table (name, budget, score, status…)
│   └── conversation.py      # Messages table (role, content, session_id)
├── services/
│   ├── ai_service.py        # Claude chat + Haiku extraction
│   ├── lead_service.py      # Lead CRUD + scoring trigger
│   └── conversation_service.py  # Message CRUD + history builder
├── routes/
│   ├── chat.py              # POST /api/chat/message, GET /api/chat/history/{id}
│   └── leads.py             # GET/PATCH /api/leads, GET /api/leads/{id}
└── utils/
    ├── config.py            # Pydantic settings (reads .env)
    ├── logger.py            # Structured stdout logging
    └── scoring.py           # Lead scoring algorithm (0-100)
```

**Lead status flow:**  
`cold` (score < 40) → `warm` (40-69) → `hot` (≥ 70)

---

## Setup

### 1. Clone & install

```bash
git clone <repo>
cd solver

python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env and set ANTHROPIC_API_KEY
```

### 3. Run

```bash
python run.py
# or: uvicorn app.main:app --reload
```

API is available at `http://localhost:8000`  
Interactive docs at `http://localhost:8000/docs`

---

## API Reference

### Send a message

```bash
# First message — no session_id needed
curl -s -X POST http://localhost:8000/api/chat/message \
  -H "Content-Type: application/json" \
  -d '{"message": "Hi, I am looking to buy a house"}' | jq

# Continue the conversation
curl -s -X POST http://localhost:8000/api/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "<session_id from previous response>",
    "message": "My name is Sarah and my budget is around $400k"
  }' | jq
```

**Response:**
```json
{
  "session_id": "3fa85f64-...",
  "response": "Hi Sarah! Great to hear from you...",
  "lead_status": "warm",
  "lead_score": 55
}
```

---

### Get conversation history

```bash
curl http://localhost:8000/api/chat/history/<session_id> | jq
```

---

### List all leads

```bash
# All leads, sorted by score desc
curl http://localhost:8000/api/leads | jq

# Only hot leads
curl "http://localhost:8000/api/leads?status=hot" | jq

# Paginate
curl "http://localhost:8000/api/leads?limit=10&offset=20" | jq
```

---

### Get a single lead

```bash
curl http://localhost:8000/api/leads/<session_id> | jq
```

---

### Update a lead (manual override)

```bash
curl -s -X PATCH http://localhost:8000/api/leads/<session_id> \
  -H "Content-Type: application/json" \
  -d '{"status": "hot", "notes": "Called back, very interested"}' | jq
```

---

## Lead Scoring

| Signal             | Points |
|--------------------|--------|
| Name collected     | 15     |
| Need identified    | 20     |
| Budget stated      | 25     |
| Budget ≥ $50k      | +20    |
| Budget ≥ $10k      | +12    |
| Timeline stated    | 15     |
| Urgent timeline    | +10    |
| Contact info given | 10     |
| **Max**            | **100** |

---

## Switch to PostgreSQL

1. Set in `.env`:
   ```
   DATABASE_URL=postgresql://user:pass@localhost:5432/leads_db
   ```
2. Install driver: `pip install psycopg2-binary`
3. Restart — tables are created automatically on startup.

---

## Customise the AI persona

Edit `BUSINESS_NAME` and `BUSINESS_TYPE` in `.env`.  
Edit `_CHAT_SYSTEM` in `app/services/ai_service.py` to add specific knowledge about your business (pricing tiers, service areas, FAQs).
