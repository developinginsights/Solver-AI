const API_URL = "https://solver-ai-xcd8.onrender.com/api/chat/message";
// ─── State ────────────────────────────────────────────────────────
let sessionId = null;
let isLoading = false;

// ─── DOM refs ─────────────────────────────────────────────────────
const messagesEl = document.getElementById("chatMessages");
const inputEl    = document.getElementById("messageInput");
const sendBtn    = document.getElementById("sendBtn");
const leadBadge  = document.getElementById("leadBadge");
const leadStatus = document.getElementById("leadStatus");

// ─── Send on Enter (Shift+Enter = newline) ────────────────────────
inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// Auto-grow textarea
inputEl.addEventListener("input", () => {
  inputEl.style.height = "auto";
  inputEl.style.height = inputEl.scrollHeight + "px";
});

sendBtn.addEventListener("click", sendMessage);

// ─── Core send function ───────────────────────────────────────────
async function sendMessage() {
  const text = inputEl.value.trim();
  if (!text || isLoading) return;

  setLoading(true);
  appendMessage("user", text);
  inputEl.value = "";
  inputEl.style.height = "auto";

  const typingEl = showTyping();

  try {
    const body = { message: text };
    if (sessionId) body.session_id = sessionId;

    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error(`Server error ${res.status}`);

    const data = await res.json();

    sessionId = data.session_id;
    removeTyping(typingEl);
    appendMessage("ai", data.response);
    updateLeadBadge(data.lead_status, data.lead_score);

  } catch (err) {
    removeTyping(typingEl);
    showError("Could not reach the server. Please try again.");
    console.error(err);
  } finally {
    setLoading(false);
  }
}

// ─── Append a chat bubble ─────────────────────────────────────────
function appendMessage(role, text) {
  const isUser = role === "user";

  const row = document.createElement("div");
  row.className = `msg-row ${isUser ? "user" : "ai"}`;

  const avatar = document.createElement("div");
  avatar.className = "msg-avatar";
  avatar.textContent = isUser ? "U" : "AI";

  const group = document.createElement("div");
  group.className = "msg-group";

  const bubble = document.createElement("div");
  bubble.className = "msg-bubble";
  bubble.textContent = text;

  const time = document.createElement("div");
  time.className = "msg-time";
  time.textContent = now();

  group.appendChild(bubble);
  group.appendChild(time);
  row.appendChild(avatar);
  row.appendChild(group);

  messagesEl.appendChild(row);
  scrollToBottom();
}

// ─── Typing indicator ─────────────────────────────────────────────
function showTyping() {
  const row = document.createElement("div");
  row.className = "typing-indicator";

  const avatar = document.createElement("div");
  avatar.className = "msg-avatar";
  avatar.textContent = "AI";

  const dots = document.createElement("div");
  dots.className = "typing-dots";
  dots.innerHTML = "<span></span><span></span><span></span>";

  row.appendChild(avatar);
  row.appendChild(dots);
  messagesEl.appendChild(row);
  scrollToBottom();
  return row;
}

function removeTyping(el) {
  el?.remove();
}

// ─── Error toast ──────────────────────────────────────────────────
function showError(msg) {
  const toast = document.createElement("div");
  toast.className = "error-toast";
  toast.textContent = `⚠️ ${msg}`;
  messagesEl.appendChild(toast);
  scrollToBottom();
  setTimeout(() => toast.remove(), 5000);
}

// ─── Lead badge ───────────────────────────────────────────────────
function updateLeadBadge(status, score) {
  if (!status) return;
  leadBadge.className = `lead-badge ${status}`;
  leadStatus.textContent = `${status.toUpperCase()} · ${score}`;
}

// ─── Helpers ──────────────────────────────────────────────────────
function setLoading(state) {
  isLoading = state;
  sendBtn.disabled = state;
  inputEl.disabled = state;
}

function scrollToBottom() {
  requestAnimationFrame(() => {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  });
}

function now() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
