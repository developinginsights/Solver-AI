/* ─────────────────────────────────────────────────────────────────
   SOLVER AI — Chat Script
   API: https://solver-ai-xcd8.onrender.com
───────────────────────────────────────────────────────────────── */

const API_URL = "https://solver-ai-xcd8.onrender.com/api/chat/message";

// ── State ─────────────────────────────────────────────────────────
const state = {
  sessionId:      crypto.randomUUID(),
  messageCount:   0,   // counts AI responses received
  leadShown:      false,
  leadSubmitted:  false,
  isLoading:      false,
};

// ── DOM refs ──────────────────────────────────────────────────────
const messagesEl    = document.getElementById("chatMessages");
const inputEl       = document.getElementById("msgInput");
const sendBtn       = document.getElementById("sendBtn");
const quickActions  = document.getElementById("quickActions");

// ── Init ──────────────────────────────────────────────────────────
window.addEventListener("DOMContentLoaded", () => {
  // Show greeting from AI
  appendAIMessage(
    "👋 Hi! I'm Solver AI — your real estate assistant.\n\nI can help you buy, sell, or invest in properties in DHA Lahore and surrounding areas. What are you looking for today?"
  );

  // Quick action buttons
  quickActions.querySelectorAll(".quick-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const msg = btn.dataset.msg;
      hideQuickActions();
      sendMessage(msg);
    });
  });

  // Enter to send (Shift+Enter = newline)
  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  // Auto-grow textarea
  inputEl.addEventListener("input", () => {
    inputEl.style.height = "auto";
    inputEl.style.height = Math.min(inputEl.scrollHeight, 120) + "px";
  });

  sendBtn.addEventListener("click", handleSend);
  inputEl.focus();
});

// ── Handle send ───────────────────────────────────────────────────
function handleSend() {
  const text = inputEl.value.trim();
  if (!text || state.isLoading) return;
  hideQuickActions();
  inputEl.value = "";
  inputEl.style.height = "auto";
  sendMessage(text);
}

// ── Core: send message to API ─────────────────────────────────────
async function sendMessage(text) {
  if (state.isLoading) return;

  appendUserMessage(text);
  setLoading(true);
  const typingEl = showTyping();

  try {
    const res = await fetch(API_URL, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ session_id: state.sessionId, message: text }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    removeTyping(typingEl);

    appendAIMessage(data.response);
    state.messageCount++;

    // Show lead capture card after 3 AI responses
    if (state.messageCount >= 3 && !state.leadShown) {
      setTimeout(showLeadCapture, 600);
    }

  } catch (err) {
    removeTyping(typingEl);
    showError("Connection failed. Please try again.");
    console.error("API error:", err);
  } finally {
    setLoading(false);
  }
}

// ── Append user bubble ────────────────────────────────────────────
function appendUserMessage(text) {
  const row = createRow("user");

  const avatar = el("div", "msg-avatar", "U");
  const group  = el("div", "msg-group");
  const bubble = el("div", "msg-bubble", text);
  const time   = el("div", "msg-time", timestamp());

  group.appendChild(bubble);
  group.appendChild(time);
  row.appendChild(avatar);
  row.appendChild(group);

  messagesEl.appendChild(row);
  scrollToBottom();
}

// ── Append AI bubble ──────────────────────────────────────────────
function appendAIMessage(text) {
  const row    = createRow("ai");
  const avatar = makeAIAvatar();
  const group  = el("div", "msg-group");
  const bubble = el("div", "msg-bubble", text);
  const time   = el("div", "msg-time", timestamp());

  group.appendChild(bubble);
  group.appendChild(time);
  row.appendChild(avatar);
  row.appendChild(group);

  messagesEl.appendChild(row);
  scrollToBottom();
}

// ── Typing indicator ──────────────────────────────────────────────
function showTyping() {
  const row    = document.createElement("div");
  row.className = "typing-row msg-row ai";

  const avatar = makeAIAvatar();
  const bubble = document.createElement("div");
  bubble.className = "typing-bubble";
  bubble.innerHTML = "<span></span><span></span><span></span>";

  row.appendChild(avatar);
  row.appendChild(bubble);
  messagesEl.appendChild(row);
  scrollToBottom();
  return row;
}

function removeTyping(el) { el?.remove(); }

// ── Lead capture card ─────────────────────────────────────────────
function showLeadCapture() {
  if (state.leadShown) return;
  state.leadShown = true;

  const card = document.createElement("div");
  card.className = "lead-card";
  card.innerHTML = `
    <div class="lead-card-header">
      <span class="lead-card-icon">🏡</span>
      <div class="lead-card-title">Get Exclusive Property Deals in DHA Lahore</div>
    </div>
    <p class="lead-card-desc">
      Leave your details and our team will send you the best options matching your needs — no spam, ever.
    </p>
    <input class="lead-input" id="leadName"  type="text"  placeholder="Your Name" autocomplete="name" />
    <input class="lead-input" id="leadPhone" type="tel"   placeholder="Phone / WhatsApp" autocomplete="tel" />
    <button class="lead-submit-btn" id="leadSubmitBtn" type="button">Get Options →</button>
  `;

  messagesEl.appendChild(card);
  scrollToBottom();

  document.getElementById("leadSubmitBtn").addEventListener("click", submitLead);
}

async function submitLead() {
  if (state.leadSubmitted) return;

  const name  = document.getElementById("leadName").value.trim();
  const phone = document.getElementById("leadPhone").value.trim();

  if (!name || !phone) {
    document.getElementById("leadName").focus();
    return;
  }

  state.leadSubmitted = true;

  // Send contact info into the conversation so backend captures it
  const contactMsg = `My name is ${name} and my phone/WhatsApp is ${phone}.`;
  try {
    await fetch(API_URL, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ session_id: state.sessionId, message: contactMsg }),
    });
  } catch (_) { /* non-fatal */ }

  // Replace form with success message
  const card = document.querySelector(".lead-card");
  card.innerHTML = `
    <div class="lead-card-header">
      <span class="lead-card-icon">🏡</span>
      <div class="lead-card-title">Get Exclusive Property Deals in DHA Lahore</div>
    </div>
    <div class="lead-success">Details received! Our team will contact you shortly.</div>
  `;

  scrollToBottom();
}

// ── Error toast ───────────────────────────────────────────────────
function showError(msg) {
  const toast = el("div", "error-toast", `⚠️ ${msg}`);
  messagesEl.appendChild(toast);
  scrollToBottom();
  setTimeout(() => toast.remove(), 5000);
}

// ── Quick actions ─────────────────────────────────────────────────
function hideQuickActions() {
  quickActions.classList.add("hidden");
}

// ── Loading state ─────────────────────────────────────────────────
function setLoading(active) {
  state.isLoading   = active;
  sendBtn.disabled  = active;
  inputEl.disabled  = active;
  if (!active) inputEl.focus();
}

// ── Helpers ───────────────────────────────────────────────────────
function createRow(role) {
  const row = document.createElement("div");
  row.className = `msg-row ${role}`;
  return row;
}

function makeAIAvatar() {
  const avatar = document.createElement("div");
  avatar.className = "msg-avatar";
  avatar.textContent = "AI";
  return avatar;
}

function el(tag, className, text = "") {
  const node = document.createElement(tag);
  node.className = className;
  if (text) node.textContent = text;
  return node;
}

function scrollToBottom() {
  requestAnimationFrame(() => {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  });
}

function timestamp() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
