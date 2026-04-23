/* ─────────────────────────────────────────────────────────────────
   SOLVER AI — Chat Engine  v2
   Premium micro-interactions + lead capture
───────────────────────────────────────────────────────────────── */

const API_URL = "https://solver-ai-xcd8.onrender.com/api/chat/message";

// ── State ──────────────────────────────────────────────────────────
const state = {
  sessionId:    crypto.randomUUID(),
  aiCount:      0,       // tracks AI replies received
  leadShown:    false,
  leadDone:     false,
  isLoading:    false,
};

// ── DOM ────────────────────────────────────────────────────────────
const messagesEl   = document.getElementById("chatMessages");
const inputEl      = document.getElementById("msgInput");
const sendBtn      = document.getElementById("sendBtn");
const sendRipple   = document.getElementById("sendRipple");
const quickActions = document.getElementById("quickActions");

// ── Boot ───────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  // Initial AI greeting — slight delay for a natural feel
  setTimeout(() => {
    appendAI("👋 Hi! I'm Solver AI — your real estate assistant.\n\nI can help you buy, sell, or invest in properties across DHA Lahore and surrounding areas. What are you looking for today?");
  }, 300);

  // Quick-action buttons
  quickActions.querySelectorAll(".quick-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      hideQuickActions();
      sendMessage(btn.dataset.msg);
    });
  });

  // Enter = send, Shift+Enter = newline
  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  });

  // Auto-grow textarea
  inputEl.addEventListener("input", growInput);

  // Send button with ripple
  sendBtn.addEventListener("click", () => {
    triggerRipple();
    handleSend();
  });

  inputEl.focus();
});

// ── Handle send ────────────────────────────────────────────────────
function handleSend() {
  const text = inputEl.value.trim();
  if (!text || state.isLoading) return;
  hideQuickActions();
  resetInput();
  sendMessage(text);
}

// ── Core: API call ─────────────────────────────────────────────────
async function sendMessage(text) {
  if (state.isLoading) return;
  setLoading(true);

  appendUser(text);
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
    appendAI(data.response);
    state.aiCount++;

    // Show lead card after 3 AI responses, with a small delay
    if (state.aiCount >= 3 && !state.leadShown) {
      setTimeout(showLeadCard, 700);
    }
  } catch (err) {
    removeTyping(typingEl);
    showError("⚠️ Couldn't reach the server. Please try again.");
    console.error("API error:", err);
  } finally {
    setLoading(false);
  }
}

// ── Append user bubble ─────────────────────────────────────────────
function appendUser(text) {
  const { row, group } = createRow("user");
  const avatar = avatar$("U", "msg-avatar");
  group.appendChild(bubble$(text));
  group.appendChild(time$());
  row.appendChild(avatar);
  row.appendChild(group);
  messagesEl.appendChild(row);
  scroll();
}

// ── Append AI bubble ───────────────────────────────────────────────
function appendAI(text) {
  const { row, group } = createRow("ai");
  const avatar = avatar$("AI", "msg-avatar");
  group.appendChild(bubble$(text));
  group.appendChild(time$());
  row.appendChild(avatar);
  row.appendChild(group);
  messagesEl.appendChild(row);
  scroll();
}

// ── Typing indicator ───────────────────────────────────────────────
function showTyping() {
  const row    = make("div", "typing-row msg-row ai");
  const avatar = avatar$("AI", "msg-avatar");
  const bub    = make("div", "typing-bubble");
  bub.innerHTML = "<span></span><span></span><span></span>";
  row.appendChild(avatar);
  row.appendChild(bub);
  messagesEl.appendChild(row);
  scroll();
  return row;
}

function removeTyping(el) { el?.remove(); }

// ── Lead capture card ──────────────────────────────────────────────
function showLeadCard() {
  if (state.leadShown) return;
  state.leadShown = true;

  const card = make("div", "lead-card");
  card.innerHTML = `
    <div class="lead-card-eyebrow">Exclusive Offer</div>
    <div class="lead-card-title">🏡 Get the Best Property Deals in DHA Lahore</div>
    <p class="lead-card-desc">
      Share your details and our team will reach out with hand-picked options that match your needs — no spam, ever.
    </p>
    <div class="lead-field">
      <label for="lName">Your Name</label>
      <input class="lead-input" id="lName" type="text" placeholder="e.g. Ahmed Khan" autocomplete="name" />
    </div>
    <div class="lead-field">
      <label for="lPhone">Phone / WhatsApp</label>
      <input class="lead-input" id="lPhone" type="tel" placeholder="+92 300 0000000" autocomplete="tel" />
    </div>
    <button type="button" class="lead-submit" id="leadSubmit">Get My Options →</button>
  `;

  messagesEl.appendChild(card);
  scroll();

  document.getElementById("leadSubmit").addEventListener("click", submitLead);

  // Focus name field after card appears
  setTimeout(() => document.getElementById("lName")?.focus(), 500);
}

async function submitLead() {
  if (state.leadDone) return;

  const name  = document.getElementById("lName").value.trim();
  const phone = document.getElementById("lPhone").value.trim();

  if (!name) { document.getElementById("lName").focus(); shake(document.getElementById("lName")); return; }
  if (!phone) { document.getElementById("lPhone").focus(); shake(document.getElementById("lPhone")); return; }

  state.leadDone = true;
  document.getElementById("leadSubmit").textContent = "Sending…";
  document.getElementById("leadSubmit").disabled = true;

  // Push contact info into conversation so backend captures it
  try {
    await fetch(API_URL, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        session_id: state.sessionId,
        message: `My name is ${name} and my WhatsApp/phone number is ${phone}.`,
      }),
    });
  } catch (_) { /* non-fatal */ }

  // Replace form with success state
  const card = document.querySelector(".lead-card");
  card.innerHTML = `
    <div class="lead-card-eyebrow">All set!</div>
    <div class="lead-card-title">🏡 Get the Best Property Deals in DHA Lahore</div>
    <div class="lead-success">
      <div class="lead-success-icon">✓</div>
      <span>Thanks, ${name}! Our team will contact you on <strong>${phone}</strong> shortly.</span>
    </div>
  `;
  scroll();
}

// ── Error toast ────────────────────────────────────────────────────
function showError(msg) {
  const toast = make("div", "error-toast");
  toast.textContent = msg;
  messagesEl.appendChild(toast);
  scroll();
  setTimeout(() => { toast.style.opacity = "0"; setTimeout(() => toast.remove(), 300); }, 5000);
}

// ── Quick actions ──────────────────────────────────────────────────
function hideQuickActions() {
  quickActions.classList.add("hidden");
}

// ── Loading state ──────────────────────────────────────────────────
function setLoading(on) {
  state.isLoading  = on;
  sendBtn.disabled = on;
  inputEl.disabled = on;
  if (!on) { inputEl.focus(); }
}

// ── Ripple effect on send button ───────────────────────────────────
function triggerRipple() {
  sendRipple.classList.remove("animate");
  void sendRipple.offsetWidth; // reflow
  sendRipple.classList.add("animate");
}

// ── Shake animation for invalid fields ────────────────────────────
function shake(el) {
  el.style.animation = "none";
  el.style.borderColor = "#EF4444";
  el.style.boxShadow  = "0 0 0 3px rgba(239,68,68,.15)";
  void el.offsetWidth;
  el.style.animation = "shakeField .35s ease";
  el.addEventListener("input", () => {
    el.style.borderColor = "";
    el.style.boxShadow   = "";
    el.style.animation   = "";
  }, { once: true });
}

// ── DOM helpers ────────────────────────────────────────────────────
function createRow(role) {
  const row   = make("div", `msg-row ${role}`);
  const group = make("div", "msg-group");
  row.appendChild(group);
  return { row, group };
}

function avatar$(initials, cls) {
  const el = make("div", cls);
  el.textContent = initials;
  return el;
}

function bubble$(text) {
  const el = make("div", "msg-bubble");
  el.textContent = text;
  return el;
}

function time$() {
  const el = make("div", "msg-time");
  el.textContent = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return el;
}

function make(tag, cls = "") {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  return el;
}

function scroll() {
  requestAnimationFrame(() => {
    messagesEl.scrollTo({ top: messagesEl.scrollHeight, behavior: "smooth" });
  });
}

function growInput() {
  inputEl.style.height = "auto";
  inputEl.style.height = Math.min(inputEl.scrollHeight, 110) + "px";
}

function resetInput() {
  inputEl.value = "";
  inputEl.style.height = "auto";
}
