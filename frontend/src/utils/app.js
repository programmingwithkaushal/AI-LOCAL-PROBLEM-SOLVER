// ═══════════════════════════════════════════════════════════════════
//  SolvIt — Main Application JavaScript
//  Auth Guard · Problems · Community Chat
// ═══════════════════════════════════════════════════════════════════

const API = "/api";

// ── Auth Guard ──────────────────────────────────────────────────────
const TOKEN = localStorage.getItem("solvit_token");
const ME    = JSON.parse(localStorage.getItem("solvit_user") || "null");

if (!TOKEN || !ME) {
  window.location.href = "http://localhost:8080/login.html";
  throw new Error("Not authenticated");
}

function logout() {
  localStorage.removeItem("solvit_token");
  localStorage.removeItem("solvit_user");
  window.location.href = "http://localhost:8080/login.html";
}

// Authenticated fetch helper
async function authFetch(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: {
      ...(opts.headers || {}),
      Authorization: `Bearer ${TOKEN}`,
    },
  });
  if (res.status === 401) {
    logout();
    throw new Error("Session expired");
  }
  return res;
}

// ── Global State ────────────────────────────────────────────────────
let allProblems    = [];
let submitMap, submitMarker;
let selectedLoc    = null;
let miniMapInst    = null;
let currentRoom    = null;
let chatPollTimer  = null;

// ── Init ────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  // Show user info in header
  document.getElementById("userNameDisplay").textContent = ME.name;
  document.getElementById("userAvatar").textContent = ME.avatar || ME.name.charAt(0).toUpperCase();
  document.getElementById("chatUserName").textContent = ME.name;

  initSubmitMap();
  initUpload();
  initPills();
  loadStats();
});

// ── Section Navigation ──────────────────────────────────────────────
function showSection(name) {
  document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
  document.getElementById(`section-${name}`).classList.add("active");
  document.querySelectorAll(".nav-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.section === name);
  });

  // Hero only on submit
  const hero = document.getElementById("hero");
  if (hero) hero.style.display = name === "submit" ? "" : "none";

  if (name === "browse") loadProblems();
  if (name === "chat")   initChat();
}

// ══════════════════════════════════════════════════════════════════
//  SUBMIT SECTION
// ══════════════════════════════════════════════════════════════════

function initSubmitMap() {
  submitMap = L.map("submitMap", { zoomControl: true }).setView([20.5937, 78.9629], 5);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap",
  }).addTo(submitMap);
  document.getElementById("submitMap").classList.add("dark-map");

  submitMap.on("click", (e) => {
    const { lat, lng } = e.latlng;
    selectedLoc = { lat, lng };
    if (submitMarker) submitMarker.remove();
    submitMarker = L.marker([lat, lng]).addTo(submitMap).bindPopup("📍 Your Location").openPopup();
    document.getElementById("locText").textContent = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

    // Reverse geocode (free Nominatim)
    fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`)
      .then(r => r.json())
      .then(d => {
        const name = d.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        document.getElementById("locText").textContent = name;
        selectedLoc.name = name;
      }).catch(() => {});
  });
}

function initUpload() {
  const box  = document.getElementById("uploadBox");
  const inp  = document.getElementById("f-image");
  const prev = document.getElementById("imgPreview");
  const ph   = document.getElementById("uploadPh");

  box.addEventListener("click", () => inp.click());
  box.addEventListener("dragover", e => { e.preventDefault(); box.style.borderColor = "var(--accent)"; });
  box.addEventListener("dragleave", () => { box.style.borderColor = ""; });
  box.addEventListener("drop", e => {
    e.preventDefault(); box.style.borderColor = "";
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith("image/")) { inp.files = e.dataTransfer.files; previewImage(f); }
  });
  inp.addEventListener("change", () => { if (inp.files[0]) previewImage(inp.files[0]); });

  function previewImage(f) {
    const r = new FileReader();
    r.onload = e => { prev.src = e.target.result; prev.style.display = "block"; ph.style.display = "none"; };
    r.readAsDataURL(f);
  }
}

function initPills() {
  document.querySelectorAll(".pill").forEach(p => {
    p.addEventListener("click", () => {
      document.querySelectorAll(".pill").forEach(x => x.classList.remove("active"));
      p.classList.add("active");
    });
  });
}

async function submitProblem() {
  const title = document.getElementById("f-title").value.trim();
  const desc  = document.getElementById("f-desc").value.trim();
  if (!title) return toast("Please enter a problem title", "err");
  if (!desc)  return toast("Please describe the problem", "err");

  const btn = document.getElementById("submitBtn");
  btn.disabled = true;
  btn.innerHTML = `<span class="spin"></span> Analyzing with AI…`;

  try {
    const fd = new FormData();
    fd.append("title", title);
    fd.append("description", desc);
    if (selectedLoc) fd.append("location", JSON.stringify(selectedLoc));
    const imgFile = document.getElementById("f-image").files[0];
    if (imgFile) fd.append("image", imgFile);

    const res  = await authFetch(`${API}/problems`, { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Server error");

    if (data.similar) {
      showSimilarCard(data.existingProblem);
    } else {
      showResultCard(data.problem);
    }
    loadStats();
    toast("✓ Problem analyzed!", "ok");
  } catch (err) {
    toast(err.message || "Something went wrong", "err");
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<span>◈</span> Analyze & Solve with AI`;
  }
}

function showResultCard(p) {
  document.getElementById("similarCard").style.display = "none";
  const card = document.getElementById("resultCard");
  card.style.display = "block";
  card.innerHTML = `
    <div class="rc-header">
      <div class="rc-badge success">✓ AI Solution Generated</div>
      <div class="rc-title">${esc(p.title)}</div>
      <div class="rc-meta">
        <span>${catEmoji(p.category)} ${cap(p.category)}</span>
        <span>👤 ${esc(p.userName)}</span>
        <span>🕐 ${ago(p.createdAt)}</span>
        <span class="tag-${p.status.replace(" ","-")}" style="border-radius:100px;padding:3px 10px">${p.status}</span>
      </div>
    </div>
    <div class="rc-grid">
      <div class="rc-col">
        <div class="rc-section-title">🤖 AI-Generated Solution</div>
        <div class="ai-sol">${marked.parse(p.aiSolution)}</div>
      </div>
      <div class="rc-col">
        <div class="rc-section-title">🏛️ Authority to Contact</div>
        <div class="auth-box">
          <div class="auth-name">${esc(p.authority.authority)}</div>
          <div class="auth-platform"><strong>📱 Platform:</strong> ${esc(p.authority.platform)}</div>
          <div class="steps">${p.authority.steps.map((s,i) =>
            `<div class="step"><span class="step-n">${i+1}</span><span>${esc(s)}</span></div>`).join("")}
          </div>
        </div>
        ${p.location ? `
        <div style="margin-top:16px">
          <div class="rc-section-title">📍 Pinned Location</div>
          <div id="rcMiniMap" class="mini-map"></div>
          <p style="font-size:12px;color:var(--text3);margin-top:6px">${esc(p.location.name || "")}</p>
        </div>` : ""}
      </div>
    </div>
    <div class="rc-actions">
      <button class="btn-secondary" onclick="showSection('browse')">👁 View All Problems</button>
      <button class="btn-secondary" onclick="resetForm()">+ Submit Another</button>
    </div>`;

  if (p.location) {
    setTimeout(() => {
      if (miniMapInst) miniMapInst.remove();
      miniMapInst = L.map("rcMiniMap", { zoomControl: false, scrollWheelZoom: false })
        .setView([p.location.lat, p.location.lng], 13);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(miniMapInst);
      L.marker([p.location.lat, p.location.lng]).addTo(miniMapInst);
      document.getElementById("rcMiniMap").classList.add("dark-map");
    }, 150);
  }
  card.scrollIntoView({ behavior: "smooth" });
}

function showSimilarCard(p) {
  document.getElementById("resultCard").style.display = "none";
  const card = document.getElementById("similarCard");
  card.style.display = "block";
  card.innerHTML = `
    <div class="sim-badge">⚡ Similar Problem Found!</div>
    <h3 style="font-family:'Syne',sans-serif;font-size:20px;margin-bottom:8px">We already have a solution for this!</h3>
    <p style="color:var(--text2);font-size:14px;margin-bottom:20px">A very similar problem was submitted before. Showing the existing solution saves time.</p>
    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:20px">
      <div style="font-weight:700;font-size:15px;margin-bottom:6px">${esc(p.title)}</div>
      <div style="font-size:13px;color:var(--text2)">${esc(p.description).substring(0,140)}…</div>
      <div style="margin-top:10px;font-size:12px;color:var(--text3)">${catEmoji(p.category)} ${cap(p.category)} · 👤 ${esc(p.userName)} · 💬 ${p.comments.length} comments</div>
    </div>
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      <button class="btn-primary" onclick="openModal('${p.id}')">View Full Solution</button>
      <button class="btn-secondary" onclick="resetForm()">Submit as New Problem</button>
    </div>`;
  card.scrollIntoView({ behavior: "smooth" });
}

function resetForm() {
  document.getElementById("f-title").value = "";
  document.getElementById("f-desc").value = "";
  document.getElementById("f-image").value = "";
  document.getElementById("imgPreview").style.display = "none";
  document.getElementById("uploadPh").style.display = "flex";
  document.getElementById("locText").textContent = "No location selected";
  selectedLoc = null;
  if (submitMarker) { submitMarker.remove(); submitMarker = null; }
  document.getElementById("resultCard").style.display = "none";
  document.getElementById("similarCard").style.display = "none";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ══════════════════════════════════════════════════════════════════
//  BROWSE SECTION
// ══════════════════════════════════════════════════════════════════

async function loadProblems() {
  try {
    const res = await fetch(`${API}/problems`);
    allProblems = await res.json();
    renderProblems(allProblems);
  } catch {
    document.getElementById("problemsGrid").innerHTML =
      `<div class="grid-empty">⚠️ Cannot reach server. Is it running?</div>`;
  }
}

function renderProblems(list) {
  const grid = document.getElementById("problemsGrid");
  if (!list.length) {
    grid.innerHTML = `<div class="grid-empty">No problems found. Be the first to submit one!</div>`;
    return;
  }
  grid.innerHTML = list.map(p => `
    <div class="prob-card" onclick="openModal('${p.id}')">
      ${p.image ? `<img class="prob-card-img" src="${p.image}" alt="" onerror="this.style.display='none'" />` : ""}
      <div class="prob-card-body">
        <div class="prob-tags">
          <span class="tag tag-cat">${catEmoji(p.category)} ${cap(p.category)}</span>
          <span class="tag tag-${p.status.replace(" ","-")}">${p.status}</span>
        </div>
        <div class="prob-title">${esc(p.title)}</div>
        <div class="prob-desc">${esc(p.description)}</div>
      </div>
      <div class="prob-card-foot">
        <span>👤 ${esc(p.userName)} · ${ago(p.createdAt)}</span>
        <div style="display:flex;align-items:center;gap:8px">
          <button class="vote-btn" onclick="event.stopPropagation();voteUp('${p.id}',this)">
            ▲ <span>${p.votes || 0}</span>
          </button>
          <span style="font-size:12px;color:var(--text3)">💬 ${p.comments.length}</span>
        </div>
      </div>
    </div>`).join("");
}

function filterProblems() {
  const q   = document.getElementById("srchInput").value.toLowerCase();
  const cat = document.getElementById("srchCat").value;
  const st  = document.getElementById("srchStatus").value;
  renderProblems(allProblems.filter(p => {
    const mQ   = !q   || p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
    const mCat = !cat || p.category === cat;
    const mSt  = !st  || p.status === st;
    return mQ && mCat && mSt;
  }));
}

async function voteUp(id, btn) {
  try {
    const res  = await authFetch(`${API}/problems/${id}/vote`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) return toast(data.error, "err");
    btn.querySelector("span").textContent = data.votes;
    const p = allProblems.find(x => x.id === id);
    if (p) p.votes = data.votes;
    toast("Thanks for your vote!", "ok");
  } catch { toast("Could not vote", "err"); }
}

// ── Modal ──────────────────────────────────────────────────────────
async function openModal(id) {
  document.getElementById("modalOverlay").classList.add("open");
  document.body.style.overflow = "hidden";
  document.getElementById("modalContent").innerHTML = `<div style="text-align:center;padding:40px;color:var(--text3)">Loading…</div>`;
  try {
    const res = await fetch(`${API}/problems/${id}`);
    const p   = await res.json();
    renderModal(p);
  } catch {
    document.getElementById("modalContent").innerHTML = `<p style="color:var(--orange)">Error loading problem.</p>`;
  }
}

function renderModal(p) {
  const stepsHtml = p.authority.steps
    .map((s,i) => `<div class="step"><span class="step-n">${i+1}</span><span>${esc(s)}</span></div>`)
    .join("");
  const commentsHtml = p.comments.length
    ? p.comments.map(c => `
      <div class="comment-item">
        <div class="comment-head">
          <div class="comment-avatar">${(c.userAvatar||c.userName.charAt(0)).toUpperCase()}</div>
          <span class="comment-author">${esc(c.userName)}</span>
          <span class="comment-time">${ago(c.createdAt)}</span>
        </div>
        <div class="comment-text">${esc(c.text)}</div>
      </div>`).join("")
    : `<div class="no-comments">No comments yet. Start the discussion!</div>`;

  document.getElementById("modalContent").innerHTML = `
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">
      <span class="tag tag-cat">${catEmoji(p.category)} ${cap(p.category)}</span>
      <span class="tag tag-${p.status.replace(" ","-")}">${p.status}</span>
      <span style="font-size:12px;color:var(--text3)">👤 ${esc(p.userName)} · ${ago(p.createdAt)} · ▲ ${p.votes||0} votes</span>
    </div>
    <div class="modal-title">${esc(p.title)}</div>
    ${p.image ? `<img class="modal-img" src="${p.image}" alt="" onerror="this.style.display='none'" />` : ""}
    <div class="modal-desc">${esc(p.description)}</div>

    <div class="modal-section">
      <div class="modal-section-title">🤖 AI Solution</div>
      <div class="modal-ai-sol">${marked.parse(p.aiSolution)}</div>
    </div>

    <div class="modal-section">
      <div class="modal-section-title">🏛️ Authority Guidance</div>
      <div class="auth-box">
        <div class="auth-name">${esc(p.authority.authority)}</div>
        <div class="auth-platform"><strong>📱 Platform:</strong> ${esc(p.authority.platform)}</div>
        <div class="steps">${stepsHtml}</div>
      </div>
    </div>

    ${p.location ? `
    <div class="modal-section">
      <div class="modal-section-title">📍 Reported Location</div>
      <div id="modalMap" class="modal-map"></div>
      <p style="font-size:12px;color:var(--text3);margin-top:6px">${esc(p.location.name||"")}</p>
    </div>` : ""}

    ${(() => {
      const isOwner = ME.id && p.userId && ME.id.toString() === p.userId.toString();
      if (isOwner) {
        return `
    <div class="modal-section">
      <div class="modal-section-title">🔄 Update Status & Vote</div>
      <div class="status-row">
        <select id="modalStatus">
          <option ${p.status==="Open"?"selected":""}>Open</option>
          <option ${p.status==="In Progress"?"selected":""}>In Progress</option>
          <option ${p.status==="Resolved"?"selected":""}>Resolved</option>
        </select>
        <button class="btn-primary" style="padding:8px 18px;font-size:13px" onclick="updateStatus('${p.id}')">Update</button>
        <button class="vote-btn" onclick="voteUpModal('${p.id}',this)">▲ Upvote <span>${p.votes||0}</span></button>
      </div>
    </div>`;
      } else {
        return `
    <div class="modal-section">
      <div class="modal-section-title">🔄 Vote</div>
      <div class="status-row">
        <button class="vote-btn" onclick="voteUpModal('${p.id}',this)">▲ Upvote <span>${p.votes||0}</span></button>
      </div>
    </div>`;
      }
    })()}

    <div class="modal-section" style="border-top:1px solid var(--border);padding-top:20px;margin-top:4px">
      <div class="modal-section-title" style="margin-bottom:14px">💬 Discussion (${p.comments.length})</div>
      <div class="comment-list" id="cList">${commentsHtml}</div>
      <div class="comment-input-row">
        <input type="text" id="cInput" placeholder="Add a comment… (press Enter)" 
          onkeydown="if(event.key==='Enter')addComment('${p.id}')" />
        <button class="btn-primary" style="padding:10px 18px;font-size:13px" onclick="addComment('${p.id}')">Send</button>
      </div>
    </div>`;

  if (p.location) {
    setTimeout(() => {
      const m = L.map("modalMap", { zoomControl: false, scrollWheelZoom: false })
        .setView([p.location.lat, p.location.lng], 13);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(m);
      L.marker([p.location.lat, p.location.lng]).addTo(m);
      document.getElementById("modalMap").classList.add("dark-map");
    }, 150);
  }
}

function closeModal() {
  document.getElementById("modalOverlay").classList.remove("open");
  document.body.style.overflow = "";
}

async function addComment(id) {
  const inp  = document.getElementById("cInput");
  const text = inp.value.trim();
  if (!text) return;
  try {
    const res  = await authFetch(`${API}/problems/${id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const c = await res.json();
    inp.value = "";
    const list = document.getElementById("cList");
    const noC  = list.querySelector(".no-comments");
    if (noC) noC.remove();
    list.insertAdjacentHTML("beforeend", `
      <div class="comment-item" style="animation:slideUp 0.3s ease">
        <div class="comment-head">
          <div class="comment-avatar">${ME.avatar || ME.name.charAt(0)}</div>
          <span class="comment-author">${esc(c.userName)}</span>
          <span class="comment-time">Just now</span>
        </div>
        <div class="comment-text">${esc(c.text)}</div>
      </div>`);
    toast("Comment added!", "ok");
    const p = allProblems.find(x => x.id === id);
    if (p) p.comments.push(c);
  } catch { toast("Could not post comment", "err"); }
}

async function updateStatus(id) {
  const status = document.getElementById("modalStatus").value;
  
  // Additional client-side check: ensure user is the problem owner
  const problem = allProblems.find(x => x.id === id);
  if (!problem || problem.userId !== ME.id) {
    toast("You can only update the status of your own problems", "err");
    return;
  }
  
  try {
    await authFetch(`${API}/problems/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (problem) problem.status = status;
    toast(`Status → "${status}"`, "ok");
  } catch { toast("Could not update status", "err"); }
}

async function voteUpModal(id, btn) {
  try {
    const res  = await authFetch(`${API}/problems/${id}/vote`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) return toast(data.error, "err");
    btn.querySelector("span").textContent = data.votes;
    toast("Voted!", "ok");
  } catch {}
}

// ══════════════════════════════════════════════════════════════════
//  COMMUNITY CHAT SECTION
// ══════════════════════════════════════════════════════════════════

async function initChat() {
  document.getElementById("chatUserName").textContent = ME.name;
  await loadRooms();
  // Show badge if there are messages
  authFetch(`${API}/chat`).then(r => r.json()).then(msgs => {
    if (msgs.length > 0) {
      document.getElementById("chatBadge").style.display = "inline";
    }
  }).catch(() => {});
}

async function loadRooms() {
  try {
    const res   = await authFetch(`${API}/chat/rooms`);
    const rooms = await res.json();
    const list  = document.getElementById("roomList");
    list.innerHTML = rooms.map(r => `
      <div class="room-item" onclick="joinRoom('${esc(r)}')" id="room-${esc(r).replace(/\s/g,'_')}">
        <span class="room-hash">#</span>
        <span>${esc(r)}</span>
      </div>`).join("");
  } catch {
    document.getElementById("roomList").innerHTML =
      `<div class="room-loading" style="color:var(--orange)">Could not load rooms</div>`;
  }
}

async function joinRoom(room) {
  currentRoom = room;

  // Update sidebar active state
  document.querySelectorAll(".room-item").forEach(el => el.classList.remove("active"));
  const rid = room.replace(/\s/g, "_");
  const el  = document.getElementById(`room-${rid}`);
  if (el) el.classList.add("active");

  // Update header
  document.getElementById("chatRoomName").textContent = `# ${room}`;
  document.getElementById("chatRoomSub").textContent  = `Live discussion about ${room}`;
  document.getElementById("chatRoomTag").textContent  = `# ${room}`;

  // Enable input
  const inp = document.getElementById("chatInput");
  inp.disabled = false;
  inp.placeholder = `Message #${room}…`;
  document.getElementById("sendBtn").disabled = false;

  // Load messages
  await loadRoomMessages(room);

  // Hide badge
  document.getElementById("chatBadge").style.display = "none";

  // Start polling every 5 seconds
  if (chatPollTimer) clearInterval(chatPollTimer);
  chatPollTimer = setInterval(() => refreshChat(), 5000);
}

async function loadRoomMessages(room) {
  try {
    const res  = await authFetch(`${API}/chat/room/${encodeURIComponent(room)}`);
    const msgs = await res.json();
    renderMessages(msgs);
  } catch {
    document.getElementById("chatMessages").innerHTML =
      `<div class="chat-empty"><p style="color:var(--orange)">Could not load messages.</p></div>`;
  }
}

function renderMessages(msgs) {
  const container = document.getElementById("chatMessages");
  if (!msgs.length) {
    container.innerHTML = `
      <div class="chat-empty">
        <div style="font-size:40px;margin-bottom:12px">💬</div>
        <h3>No messages yet</h3>
        <p>Be the first to start the conversation in this room!</p>
      </div>`;
    return;
  }

  // Group messages by author + consecutive
  const groups  = [];
  let   lastDate = null;

  msgs.forEach((msg, i) => {
    const msgDate = new Date(msg.createdAt).toDateString();
    if (msgDate !== lastDate) {
      groups.push({ type: "date", label: formatDate(msg.createdAt) });
      lastDate = msgDate;
    }
    const prev = msgs[i - 1];
    const sameAuthor = prev && prev.userId === msg.userId &&
      (new Date(msg.createdAt) - new Date(prev.createdAt)) < 5 * 60000;

    if (sameAuthor && groups.length && groups[groups.length - 1].type === "group"
        && groups[groups.length - 1].userId === msg.userId) {
      groups[groups.length - 1].messages.push(msg);
    } else {
      groups.push({ type: "group", userId: msg.userId, userName: msg.userName,
        userAvatar: msg.userAvatar, messages: [msg], isOwn: msg.userId === ME.id });
    }
  });

  container.innerHTML = groups.map(g => {
    if (g.type === "date") return `<div class="date-sep">${g.label}</div>`;
    const av = (g.userAvatar || g.userName.charAt(0)).toUpperCase();
    const bubblesHtml = g.messages.map(m => `
      <div class="msg-bubble ${g.isOwn ? "own" : ""}">
        ${esc(m.text)}
        ${g.isOwn ? `<button class="msg-delete-btn" onclick="deleteMsg('${m.id}')" title="Delete">✕</button>` : ""}
      </div>`).join("");
    return `
      <div class="msg-group ${g.isOwn ? "own" : ""}">
        <div class="msg-group-header">
          <div class="msg-avatar">${av}</div>
          <span class="msg-author">${esc(g.userName)}</span>
          <span class="msg-time">${ago(g.messages[0].createdAt)}</span>
        </div>
        ${bubblesHtml}
      </div>`;
  }).join("");

  // Scroll to bottom
  container.scrollTop = container.scrollHeight;
}

async function sendMessage() {
  if (!currentRoom) return toast("Select a room first", "err");
  const inp  = document.getElementById("chatInput");
  const text = inp.value.trim();
  if (!text) return;

  inp.value = "";
  try {
    const res = await authFetch(`${API}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, room: currentRoom }),
    });
    if (!res.ok) { const d = await res.json(); return toast(d.error, "err"); }
    await loadRoomMessages(currentRoom); // refresh
  } catch { toast("Could not send message", "err"); }
}

async function refreshChat() {
  if (currentRoom) await loadRoomMessages(currentRoom);
}

async function deleteMsg(id) {
  if (!confirm("Delete this message?")) return;
  try {
    const res = await authFetch(`${API}/chat/${id}`, { method: "DELETE" });
    if (!res.ok) { const d = await res.json(); return toast(d.error, "err"); }
    await loadRoomMessages(currentRoom);
    toast("Message deleted", "ok");
  } catch { toast("Could not delete", "err"); }
}

// ══════════════════════════════════════════════════════════════════
//  STATS
// ══════════════════════════════════════════════════════════════════

async function loadStats() {
  try {
    const [pRes, cRes] = await Promise.all([
      fetch(`${API}/problems`),
      authFetch(`${API}/chat`),
    ]);
    const problems = await pRes.json();
    const chats    = await cRes.json();

    document.getElementById("st-total").textContent  = problems.length;
    document.getElementById("st-open").textContent   = problems.filter(p => p.status === "Open").length;
    document.getElementById("st-msgs").textContent   = chats.length;

    // Count unique users from problems
    const uniqueUsers = new Set(problems.map(p => p.userId)).size;
    document.getElementById("st-users").textContent = uniqueUsers || "—";
  } catch {}
}

// ══════════════════════════════════════════════════════════════════
//  TOAST
// ══════════════════════════════════════════════════════════════════

function toast(msg, type = "") {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.className   = `toast ${type} show`;
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove("show"), 3200);
}

// ══════════════════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════════════════

function esc(str = "") {
  return String(str)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
function cap(s = "") { return s.charAt(0).toUpperCase() + s.slice(1); }
function ago(iso) {
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.floor(d / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h/24)}d ago`;
}
function formatDate(iso) {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Today";
  const yest = new Date(); yest.setDate(yest.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" });
}
function catEmoji(cat) {
  return { road:"🛣️", water:"💧", electricity:"⚡", garbage:"🗑️",
           health:"🏥", pollution:"🌫️", education:"📚", flood:"🌊", default:"🔎" }[cat] || "🔎";
}
