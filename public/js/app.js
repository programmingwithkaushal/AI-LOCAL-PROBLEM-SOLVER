// ═══════════════════════════════════════════════════════════════════
//  SolvIt — Main Application JavaScript
//  Auth Guard · Problems · Community Chat
// ═══════════════════════════════════════════════════════════════════

const API = "http://localhost:3000/api";

// ── Auth Guard ──────────────────────────────────────────────────────
const TOKEN = localStorage.getItem("solvit_token");
const ME    = JSON.parse(localStorage.getItem("solvit_user") || "null");

if (!TOKEN || !ME) {
  window.location.href = "/login.html";
  throw new Error("Not authenticated");
}

function logout() {
  localStorage.removeItem("solvit_token");
  localStorage.removeItem("solvit_user");
  window.location.href = "/login.html";
}

// Check if user is blocked and auto-logout
async function checkBlockedStatus() {
  try {
    const res = await fetch(`${API}/auth/me`, {
      headers: {
        Authorization: `Bearer ${TOKEN}`
      }
    });
    
    if (!res.ok) {
      if (res.status === 403) {
        // User is blocked, force logout
        const data = await res.json();
        alert(data.error || "Your account has been blocked. Please contact support.");
        logout();
        return;
      }
      // Other auth errors, logout
      logout();
      return;
    }
    
    const data = await res.json();
    if (data.user.isBlocked) {
      alert("Your account has been blocked. Please contact support.");
      logout();
    }
  } catch (error) {
    console.error('Error checking blocked status:', error);
    // On error, assume auth issue and logout
    logout();
  }
}

// Check blocked status on page load
checkBlockedStatus();

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
    throw new Error("Unauthorized");
  }
  
  if (res.status === 403) {
    // User is blocked, force logout
    const data = await res.json();
    alert(data.error || "Your account has been blocked. Please contact support.");
    logout();
    throw new Error("Account blocked");
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

// Pagination variables
let currentPage = 1;
let problemsPerPage = 6;
let filteredProblems = [];

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
  if (name === "your-problems") loadYourProblems();
  if (name === "region") initRegionMap();
  if (name === "chat")   initChat();
}

// Pincode search function
async function searchByPincode() {
  const pincode = document.getElementById("pincodeInput").value.trim();
  if (!pincode) {
    toast("Please enter a pincode", "err");
    return;
  }
  
  try {
    // Using Nominatim API for geocoding pincode to coordinates
    const response = await fetch(`https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(pincode)}&country=india&format=json&limit=1`);
    const data = await response.json();
    
    if (data && data.length > 0) {
      const result = data[0];
      const lat = parseFloat(result.lat);
      const lng = parseFloat(result.lon);
      
      // Update map with new location
      if (submitMap) {
        submitMap.setView([lat, lng], 13);
        if (submitMarker) {
          submitMarker.setLatLng([lat, lng]);
        } else {
          submitMarker = L.marker([lat, lng]).addTo(submitMap);
        }
      }
      
      // Update location text
      document.getElementById("locText").textContent = `${pincode} - ${result.display_name || 'Location found'}`;
      selectedLoc = { lat, lng, name: result.display_name, pincode };
      
      toast(`Location found for pincode ${pincode}`, "ok");
    } else {
      toast("Location not found for this pincode", "err");
    }
  } catch (error) {
    console.error("Pincode search error:", error);
    toast("Error searching pincode. Please try again.", "err");
  }
}

// Get current location using browser's GPS
async function getCurrentLocation() {
  if (!navigator.geolocation) {
    toast("Geolocation is not supported by your browser", "err");
    return;
  }

  // Show loading state
  const liveBtn = event.target;
  const originalText = liveBtn.innerHTML;
  liveBtn.disabled = true;
  liveBtn.innerHTML = `<span class="spin"></span> Getting location...`;

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude } = position.coords;
      
      try {
        // Reverse geocoding to get address and pincode
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`);
        const data = await response.json();
        
        if (data && data.address) {
          const address = data.display_name || 'Current Location';
          const pincode = data.address.postcode || '';
          
          // Update map with current location
          if (submitMap) {
            submitMap.setView([latitude, longitude], 15);
            if (submitMarker) {
              submitMarker.setLatLng([latitude, longitude]);
            } else {
              submitMarker = L.marker([latitude, longitude]).addTo(submitMap);
            }
          }
          
          // Update location text
          document.getElementById("locText").textContent = pincode ? 
            `${pincode} - ${address}` : address;
          
          // Update pincode input if found
          if (pincode) {
            document.getElementById("pincodeInput").value = pincode;
          }
          
          selectedLoc = { 
            lat: latitude, 
            lng: longitude, 
            name: address, 
            pincode 
          };
          
          toast("✓ Current location detected!", "ok");
        } else {
          // Fallback if reverse geocoding fails
          if (submitMap) {
            submitMap.setView([latitude, longitude], 15);
            if (submitMarker) {
              submitMarker.setLatLng([latitude, longitude]);
            } else {
              submitMarker = L.marker([latitude, longitude]).addTo(submitMap);
            }
          }
          
          document.getElementById("locText").textContent = "Current Location";
          selectedLoc = { 
            lat: latitude, 
            lng: longitude, 
            name: "Current Location" 
          };
          
          toast("✓ Location found (no address details)", "ok");
        }
      } catch (error) {
        console.error("Reverse geocoding error:", error);
        // Fallback to coordinates only
        if (submitMap) {
          submitMap.setView([latitude, longitude], 15);
          if (submitMarker) {
            submitMarker.setLatLng([latitude, longitude]);
          } else {
            submitMarker = L.marker([latitude, longitude]).addTo(submitMap);
          }
        }
        
        document.getElementById("locText").textContent = "Current Location";
        selectedLoc = { 
          lat: latitude, 
          lng: longitude, 
          name: "Current Location" 
        };
        
        toast("✓ Location detected (address unavailable)", "ok");
      }
      
      // Reset button
      liveBtn.disabled = false;
      liveBtn.innerHTML = originalText;
    },
    (error) => {
      console.error("Geolocation error:", error);
      let errorMessage = "Could not get your location";
      
      switch(error.code) {
        case error.PERMISSION_DENIED:
          errorMessage = "Location access denied. Please enable location permissions.";
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage = "Location information unavailable.";
          break;
        case error.TIMEOUT:
          errorMessage = "Location request timed out.";
          break;
      }
      
      toast(errorMessage, "err");
      liveBtn.disabled = false;
      liveBtn.innerHTML = originalText;
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000 // 5 minutes cache
    }
  );
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
  
  // Check if location is provided (either via map click, pincode search, or live location)
  const pincode = document.getElementById("pincodeInput").value.trim();
  if (!selectedLoc && !pincode) {
    toast("Please provide a location by clicking on the map, entering pincode, or using live location", "err");
    return;
  }

  const btn = document.getElementById("submitBtn");
  btn.disabled = true;
  btn.innerHTML = `<span class="spin"></span> Analyzing with AI…`;

  try {
    const fd = new FormData();
    fd.append("title", title);
    fd.append("description", desc);
    // Include pincode in location data if available
    const pincode = document.getElementById("pincodeInput").value.trim();
    const locationData = selectedLoc ? { ...selectedLoc, pincode } : { pincode };
    if (locationData.pincode || selectedLoc) fd.append("location", JSON.stringify(locationData));
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
  filteredProblems = list;
  currentPage = 1; // Reset to first page when new data is loaded
  
  const grid = document.getElementById("problemsGrid");
  if (!list.length) {
    grid.innerHTML = `<div class="grid-empty">No problems found. Be the first to submit one!</div>`;
    document.getElementById("paginationControls").style.display = "none";
    return;
  }
  
  renderCurrentPage();
}

function renderCurrentPage() {
  const grid = document.getElementById("problemsGrid");
  const startIndex = (currentPage - 1) * problemsPerPage;
  const endIndex = startIndex + problemsPerPage;
  const currentProblems = filteredProblems.slice(startIndex, endIndex);
  
  console.log("Current problems for page:", currentProblems);
  console.log("Problem IDs:", currentProblems.map(p => p.id));
  
  grid.innerHTML = currentProblems.map(p => `
    <div class="prob-card" onclick="openModal('${p.id}')">
      ${p.image ? `<img class="prob-card-img" src="${p.image}" alt="" onerror="this.style.display='none'" />` : ""}
      <div class="prob-card-body">
        <div class="prob-tags">
          <span class="tag tag-id" style="background: var(--accent); color: white; font-family: monospace; font-size: 11px;">${p.problemId || 'PRB-XXXX'}</span>
          <span class="tag tag-cat">${catEmoji(p.category)} ${cap(p.category)}</span>
          <span class="tag tag-${p.status.replace(" ","-")}">${p.status}</span>
        </div>
        <div class="prob-title">${esc(p.title)}</div>
        <div class="prob-desc">${esc(p.description)}</div>
      </div>
      <div class="prob-card-foot">
        <span>👤 ${esc(p.userName)} · ${ago(p.createdAt)}${p.pincode ? ` · 📍 ${p.pincode}` : ''}</span>
        <div style="display:flex;align-items:center;gap:8px">
          <button class="vote-btn" onclick="event.stopPropagation();voteUp('${p.id}',this)">
            ▲ <span>${p.votes || 0}</span>
          </button>
          <span style="font-size:12px;color:var(--text3)">💬 ${p.comments.length}</span>
        </div>
      </div>
    </div>`).join("");
    
  updatePaginationControls();
}

function updatePaginationControls() {
  const totalPages = Math.ceil(filteredProblems.length / problemsPerPage);
  const paginationControls = document.getElementById("paginationControls");
  
  if (totalPages <= 1) {
    paginationControls.style.display = "none";
    return;
  }
  
  paginationControls.style.display = "flex";
  
  // Update info text
  const startIndex = (currentPage - 1) * problemsPerPage + 1;
  const endIndex = Math.min(currentPage * problemsPerPage, filteredProblems.length);
  document.getElementById("paginationInfo").textContent = 
    `Showing ${startIndex}-${endIndex} of ${filteredProblems.length} problems`;
  
  // Update buttons
  document.getElementById("prevBtn").disabled = currentPage === 1;
  document.getElementById("nextBtn").disabled = currentPage === totalPages;
  
  // Update page numbers
  const pageNumbers = document.getElementById("pageNumbers");
  let pageHtml = "";
  
  const maxVisiblePages = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
  
  if (endPage - startPage < maxVisiblePages - 1) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }
  
  for (let i = startPage; i <= endPage; i++) {
    pageHtml += `<span class="page-number ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</span>`;
  }
  
  pageNumbers.innerHTML = pageHtml;
}

function goToPage(page) {
  currentPage = page;
  renderCurrentPage();
}

function nextPage() {
  const totalPages = Math.ceil(filteredProblems.length / problemsPerPage);
  if (currentPage < totalPages) {
    currentPage++;
    renderCurrentPage();
  }
}

function previousPage() {
  if (currentPage > 1) {
    currentPage--;
    renderCurrentPage();
  }
}

function filterProblems() {
  const q   = document.getElementById("srchInput").value.toLowerCase();
  const cat = document.getElementById("srchCat").value;
  const st  = document.getElementById("srchStatus").value;
  const filtered = allProblems.filter(p => {
    const mQ   = !q   || p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || (p.problemId && p.problemId.toLowerCase().includes(q));
    const mCat = !cat || p.category === cat;
    const mSt  = !st  || p.status === st;
    return mQ && mCat && mSt;
  });
  renderProblems(filtered);
}

// Action buttons for Community Problems section
function refreshCommunityProblems() {
  loadProblems();
  toast("Refreshing community problems...", "ok");
}

function exportCommunityProblems() {
  const csvContent = [
    ["Title", "Description", "Category", "Status", "Votes", "Submitted By", "Created Date"].join(","),
    ...allProblems.map(p => [
      `"${p.title.replace(/"/g, '""')}"`,
      `"${p.description.replace(/"/g, '""')}"`,
      p.category,
      p.status,
      p.votes || 0,
      `"${p.userName}"`,
      new Date(p.createdAt).toLocaleDateString()
    ].join(","))
  ].join("\n");
  
  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `community-problems-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
  toast("Community problems exported successfully!", "ok");
}

function showCommunityProblemsStats() {
  const total = allProblems.length;
  const open = allProblems.filter(p => p.status === "Open").length;
  const inProgress = allProblems.filter(p => p.status === "In Progress").length;
  const resolved = allProblems.filter(p => p.status === "Resolved").length;
  const totalVotes = allProblems.reduce((sum, p) => sum + (p.votes || 0), 0);
  const uniqueUsers = [...new Set(allProblems.map(p => p.userName))].length;
  
  const statsHtml = `
    <div style="padding:20px">
      <h3 style="margin-bottom:20px">📊 Community Problems Statistics</h3>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:16px">
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px;text-align:center">
          <div style="font-size:24px;font-weight:bold;color:var(--accent)">${total}</div>
          <div style="font-size:12px;color:var(--text2)">Total Problems</div>
        </div>
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px;text-align:center">
          <div style="font-size:24px;font-weight:bold;color:var(--orange)">${open}</div>
          <div style="font-size:12px;color:var(--text2)">Open</div>
        </div>
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px;text-align:center">
          <div style="font-size:24px;font-weight:bold;color:var(--gold)">${inProgress}</div>
          <div style="font-size:12px;color:var(--text2)">In Progress</div>
        </div>
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px;text-align:center">
          <div style="font-size:24px;font-weight:bold;color:var(--green)">${resolved}</div>
          <div style="font-size:12px;color:var(--text2)">Resolved</div>
        </div>
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px;text-align:center">
          <div style="font-size:24px;font-weight:bold;color:var(--acc3)">${totalVotes}</div>
          <div style="font-size:12px;color:var(--text2)">Total Votes</div>
        </div>
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px;text-align:center">
          <div style="font-size:24px;font-weight:bold;color:var(--accent2)">${uniqueUsers}</div>
          <div style="font-size:12px;color:var(--text2)">Active Users</div>
        </div>
      </div>
      <div style="margin-top:20px;text-align:center">
        <button class="btn-primary" onclick="closeModal()">Close</button>
      </div>
    </div>
  `;
  
  document.getElementById("modalOverlay").classList.add("open");
  document.getElementById("modalContent").innerHTML = statsHtml;
  document.body.style.overflow = "hidden";
}

// View problems by specific pincode
async function viewByPincode() {
  const pincode = prompt("Enter pincode to view problems:");
  if (!pincode) return;
  
  const problemsByPincode = allProblems.filter(p => 
    p.pincode && p.pincode.toLowerCase().includes(pincode.toLowerCase())
  );
  
  if (problemsByPincode.length === 0) {
    toast(`No problems found for pincode ${pincode}`, "err");
    return;
  }
  
  renderProblems(problemsByPincode);
  toast(`Found ${problemsByPincode.length} problems for pincode ${pincode}`, "ok");
}

// View nearby problems within 20km radius
async function viewNearbyProblems() {
  if (!navigator.geolocation) {
    toast("Geolocation is not supported by your browser", "err");
    return;
  }
  
  // Show loading state
  toast("Getting your location...", "ok");
  
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude } = position.coords;
      const nearbyProblems = allProblems.filter(p => {
        if (!p.location || !p.location.lat || !p.location.lng) return false;
        
        // Calculate distance using Haversine formula
        const distance = calculateDistance(
          latitude, longitude,
          p.location.lat, p.location.lng
        );
        
        return distance <= 20; // Within 20km
      });
      
      if (nearbyProblems.length === 0) {
        toast("No problems found within 20km of your location", "err");
        return;
      }
      
      // Sort by distance (closest first)
      nearbyProblems.sort((a, b) => {
        const distA = calculateDistance(
          latitude, longitude,
          a.location.lat, a.location.lng
        );
        const distB = calculateDistance(
          latitude, longitude,
          b.location.lat, b.location.lng
        );
        return distA - distB;
      });
      
      renderProblems(nearbyProblems);
      toast(`Found ${nearbyProblems.length} problems within 20km of your location`, "ok");
      
      // Add distance indicator to problem cards
      setTimeout(() => {
        document.querySelectorAll('.prob-card').forEach((card, index) => {
          const problem = nearbyProblems[index];
          const distance = calculateDistance(
            latitude, longitude,
            problem.location.lat, problem.location.lng
          );
          const distanceText = distance < 1 ? 
            `${Math.round(distance * 1000)}m away` : 
            `${distance.toFixed(1)}km away`;
          
          const foot = card.querySelector('.prob-card-foot span');
          if (foot) {
            foot.innerHTML += ` · 📍 ${distanceText}`;
          }
        });
      }, 100);
    },
    (error) => {
      let errorMessage = "Could not get your location";
      
      switch(error.code) {
        case error.PERMISSION_DENIED:
          errorMessage = "Location access denied. Please enable location permissions.";
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage = "Location information unavailable.";
          break;
        case error.TIMEOUT:
          errorMessage = "Location request timed out.";
          break;
      }
      
      toast(errorMessage, "err");
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000
    }
  );
}

// Calculate distance between two coordinates using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  return distance;
}

// ══════════════════════════════════════════════════════════════════
//  YOUR PROBLEMS SECTION
// ══════════════════════════════════════════════════════════════════

async function loadYourProblems() {
  try {
    const res = await fetch(`${API}/problems`);
    allProblems = await res.json();
    const yourProblems = allProblems.filter(p => p.userId === ME.id);
    renderYourProblems(yourProblems);
  } catch {
    document.getElementById("yourProblemsGrid").innerHTML =
      `<div class="grid-empty">⚠️ Cannot reach server. Is it running?</div>`;
  }
}

function renderYourProblems(list) {
  const grid = document.getElementById("yourProblemsGrid");
  if (!list.length) {
    grid.innerHTML = `<div class="grid-empty">You haven't submitted any problems yet. Be the first to submit one!</div>`;
    return;
  }
  grid.innerHTML = list.map(p => `
    <div class="prob-card" onclick="openModal('${p.id}')">
      ${p.image ? `<img class="prob-card-img" src="${p.image}" alt="" onerror="this.style.display='none'" />` : ""}
      <div class="prob-card-body">
        <div class="prob-tags">
          <span class="tag tag-id" style="background: var(--accent); color: white; font-family: monospace; font-size: 11px;">${p.problemId || 'PRB-XXXX'}</span>
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
        </div>
      </div>
    </div>`).join("");
}

function filterYourProblems() {
  const q   = document.getElementById("yourProblemsSearch").value.toLowerCase();
  const pin = document.getElementById("yourProblemsPincode").value.toLowerCase();
  const cat = document.getElementById("yourProblemsCat").value;
  const st  = document.getElementById("yourProblemsStatus").value;
  const yourProblems = allProblems.filter(p => p.userId === ME.id);
  renderYourProblems(yourProblems.filter(p => {
    const mQ   = !q   || p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || (p.problemId && p.problemId.toLowerCase().includes(q));
    const mPin = !pin || (p.pincode && p.pincode.toLowerCase().includes(pin));
    const mCat = !cat || p.category === cat;
    const mSt  = !st  || p.status === st;
    return mQ && mPin && mCat && mSt;
  }));
}

// Action buttons for Your Problems section
function refreshYourProblems() {
  loadYourProblems();
  toast("Refreshing your problems...", "ok");
}

function exportYourProblems() {
  const yourProblems = allProblems.filter(p => p.userId === ME.id);
  const csvContent = [
    ["Title", "Description", "Category", "Status", "Votes", "Created Date"].join(","),
    ...yourProblems.map(p => [
      `"${p.title.replace(/"/g, '""')}"`,
      `"${p.description.replace(/"/g, '""')}"`,
      p.category,
      p.status,
      p.votes || 0,
      new Date(p.createdAt).toLocaleDateString()
    ].join(","))
  ].join("\n");
  
  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `your-problems-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
  toast("Your problems exported successfully!", "ok");
}

function showYourProblemsStats() {
  const yourProblems = allProblems.filter(p => p.userId === ME.id);
  const total = yourProblems.length;
  const open = yourProblems.filter(p => p.status === "Open").length;
  const inProgress = yourProblems.filter(p => p.status === "In Progress").length;
  const resolved = yourProblems.filter(p => p.status === "Resolved").length;
  const totalVotes = yourProblems.reduce((sum, p) => sum + (p.votes || 0), 0);
  
  const statsHtml = `
    <div style="padding:20px">
      <h3 style="margin-bottom:20px">📊 Your Problems Statistics</h3>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:16px">
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px;text-align:center">
          <div style="font-size:24px;font-weight:bold;color:var(--accent)">${total}</div>
          <div style="font-size:12px;color:var(--text2)">Total Problems</div>
        </div>
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px;text-align:center">
          <div style="font-size:24px;font-weight:bold;color:var(--orange)">${open}</div>
          <div style="font-size:12px;color:var(--text2)">Open</div>
        </div>
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px;text-align:center">
          <div style="font-size:24px;font-weight:bold;color:var(--gold)">${inProgress}</div>
          <div style="font-size:12px;color:var(--text2)">In Progress</div>
        </div>
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px;text-align:center">
          <div style="font-size:24px;font-weight:bold;color:var(--green)">${resolved}</div>
          <div style="font-size:12px;color:var(--text2)">Resolved</div>
        </div>
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px;text-align:center">
          <div style="font-size:24px;font-weight:bold;color:var(--acc3)">${totalVotes}</div>
          <div style="font-size:12px;color:var(--text2)">Total Votes</div>
        </div>
      </div>
      <div style="margin-top:20px;text-align:center">
        <button class="btn-primary" onclick="closeModal()">Close</button>
      </div>
    </div>
  `;
  
  document.getElementById("modalOverlay").classList.add("open");
  document.getElementById("modalContent").innerHTML = statsHtml;
  document.body.style.overflow = "hidden";
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
      <span class="tag tag-id" style="background: var(--accent); color: white; font-family: monospace; font-size: 11px;">${p.problemId || 'PRB-XXXX'}</span>
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

    <div class="modal-section">
      <div class="modal-section-title">📊 Status History</div>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        ${p.statusHistory && p.statusHistory.length > 0 ? `
          ${p.statusHistory.map((history, index) => `
            <div style="display: flex; align-items: center; gap: 12px; padding: 8px; background: var(--surf2); border-radius: 6px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="tag tag-${history.status.replace(' ', '-')}" style="font-size: 12px;">${history.status}</span>
                ${index === 0 ? '<span style="font-size: 10px; color: var(--text3);">Initial</span>' : ''}
              </div>
              <div style="flex: 1; text-align: right; color: var(--text3); font-size: 12px;">
                ${new Date(history.changedAt).toLocaleString()}
              </div>
            </div>
          `).join('')}
        ` : '<div style="color: var(--text3); text-align: center; padding: 12px;">No status history available</div>'}
      </div>
    </div>

    ${p.userId === ME.id ? `
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
    </div>` : `
    <div class="modal-section">
      <div class="modal-section-title">🗳️ Vote & Support</div>
      <div class="status-row">
        <button class="vote-btn" onclick="voteUpModal('${p.id}',this)">▲ Upvote <span>${p.votes||0}</span></button>
        <span style="font-size:13px;color:var(--text3);margin-left:12px">Only the problem uploader can update status</span>
      </div>
    </div>`}

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
  try {
    const res = await authFetch(`${API}/problems/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    
    if (!res.ok) {
      // Show specific error message from server
      return toast(data.error || "Could not update status", "err");
    }
    
    const p = allProblems.find(x => x.id === id);
    if (p) {
      p.status = status;
      p.statusHistory = data.statusHistory;
    }
    
    toast(`Status → "${status}"`, "ok");
    
    // Refresh the modal to show updated status history
    openModal(id);
    
  } catch (err) {
    console.error('Status update error:', err);
    toast("Could not update status", "err");
  }
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
  const pad = n => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function catEmoji(cat) {
  return { road:"🛣️", water:"💧", electricity:"⚡", garbage:"🗑️",
           health:"🏥", pollution:"🌫️", education:"📚", flood:"🌊", default:"🔎" }[cat] || "🔎";
}

// ════════════════════════════════════════════════
//  REGION MAP SECTION
// ══════════════════════════════════════════════════

let regionMap, regionMarkers = [];

function initRegionMap() {
  console.log("Initializing region map...");
  
  // Initialize map
  regionMap = L.map("regionMap", { 
    zoomControl: true,
    scrollWheelZoom: true
  }).setView([20.5937, 78.9629], 5);
  
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap",
  }).addTo(regionMap);
  
  document.getElementById("regionMap").classList.add("dark-map");
  
  console.log("Region map created:", !!regionMap);
  
  // Get user location and load nearby problems
  loadRegionProblems();
}

async function loadRegionProblems() {
  try {
    // Load all problems
    const res = await fetch(`${API}/problems`);
    const problems = await res.json();
    
    // Display all problems on map
    displayRegionProblems(problems);
    
    // Update sidebar list
    updateRegionProblemList(problems);
  } catch (error) {
    console.error("Error loading region problems:", error);
    toast("Error loading region problems", "err");
  }
}


function displayRegionProblems(problems, userLat = null, userLng = null) {
  console.log("Displaying problems on map:", problems);
  console.log("Region map exists:", !!regionMap);
  
  // Clear existing markers
  regionMarkers.forEach(marker => regionMap.removeLayer(marker));
  regionMarkers = [];
  
  problems.forEach(p => {
    if (!p.location || !p.location.lat || !p.location.lng) return;
    
    // Determine marker color based on status
    let markerColor;
    switch(p.status) {
      case 'Open':
        markerColor = '#d63031'; // Red
        break;
      case 'In Progress':
        markerColor = '#0984e3'; // Blue
        break;
      case 'Resolved':
        markerColor = '#00b894'; // Green
        break;
      default:
        markerColor = '#6c5ce7'; // Purple (default)
    }
    
    // Create custom icon
    const customIcon = L.divIcon({
      className: 'custom-marker',
      html: `<div style="
        background-color: ${markerColor};
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: bold;
        color: white;
      ">${p.status.charAt(0)}</div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });
    
    // Add marker to map
    const marker = L.marker([p.location.lat, p.location.lng], { icon: customIcon })
      .bindPopup(`
        <div style="min-width:200px">
          <strong>${esc(p.title)}</strong><br>
          <span style="color:var(--text2)">${esc(p.category)} · ${p.status}</span><br>
          <small>${esc(p.userName)} · ${ago(p.createdAt)}</small>
        </div>
      `)
      .on('click', () => {
        // Scroll to the problem card in the sidebar
        const problemCards = document.querySelectorAll('.region-problem-item');
        problemCards.forEach(card => {
          const cardTitle = card.querySelector('div[style*="font-weight:bold"]');
          if (cardTitle && cardTitle.textContent === esc(p.title)) {
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Highlight the card temporarily
            card.style.backgroundColor = 'var(--surf3)';
            card.style.transform = 'scale(1.02)';
            setTimeout(() => {
              card.style.backgroundColor = '';
              card.style.transform = '';
            }, 300);
            return;
          }
        });
      })
      .addTo(regionMap);
    
    regionMarkers.push(marker);
  });
  
  // Fit map to show all markers
  if (regionMarkers.length > 0) {
    const group = new L.featureGroup(regionMarkers);
    regionMap.fitBounds(group.getBounds().pad(0.1));
  }
}

function updateRegionProblemList(problems) {
  const listContainer = document.getElementById("regionProblemList");
  
  if (problems.length === 0) {
    listContainer.innerHTML = '<div class="list-loading">No problems found in your region</div>';
    return;
  }
  
  // Sort by status (Open first, then In Progress, then Resolved)
  const sortedProblems = [...problems].sort((a, b) => {
    const statusOrder = { 'Open': 0, 'In Progress': 1, 'Resolved': 2 };
    return statusOrder[a.status] - statusOrder[b.status];
  });
  
  listContainer.innerHTML = sortedProblems.map(p => `
    <div class="region-problem-item" onclick="openModal('${p.id}')" style="
      border-left: 4px solid ${
        p.status === 'Open' ? '#d63031' : 
        p.status === 'In Progress' ? '#0984e3' : '#00b894'
      };
      margin-bottom: 8px;
      padding: 12px;
      cursor: pointer;
      transition: all 0.2s;
    ">
      <div style="font-weight:bold;margin-bottom:4px">
        <span style="background: var(--accent); color: white; font-family: monospace; font-size: 10px; padding: 2px 6px; border-radius: 4px; margin-right: 8px;">${p.problemId || 'PRB-XXXX'}</span>
        ${esc(p.title)}
      </div>
      <div style="color:var(--text2);font-size:12px">
        ${esc(p.category)} · ${p.status} · ${esc(p.userName)}
      </div>
    </div>
  `).join('');
}

function refreshRegionMap() {
  loadRegionProblems();
  toast("Refreshing region map...", "ok");
}

