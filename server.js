// ═══════════════════════════════════════════════════════════════════
//  SolvIt Server — Auth + Problems + Community Chat
// ═══════════════════════════════════════════════════════════════════
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");

const app = express();
const PORT = 3000;
const JWT_SECRET = "solvit_super_secret_2024_change_in_prod";

// ── Middleware ──────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static("public"));
app.use("/uploads", express.static("public/uploads"));

// ── File Upload ─────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "public/uploads/"),
  filename: (req, file, cb) =>
    cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) =>
    file.mimetype.startsWith("image/")
      ? cb(null, true)
      : cb(new Error("Images only")),
});

// ── DB Helpers ──────────────────────────────────────────────────────
function readJSON(filePath, def) {
  try {
    if (!fs.existsSync(filePath))
      fs.writeFileSync(filePath, JSON.stringify(def, null, 2));
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return def;
  }
}
function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

const PATHS = {
  users: path.join(__dirname, "data", "users.json"),
  problems: path.join(__dirname, "data", "problems.json"),
  chat: path.join(__dirname, "data", "chat.json"),
};

// ── Auth Middleware ─────────────────────────────────────────────────
function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer "))
    return res.status(401).json({ error: "Login required" });
  try {
    req.user = jwt.verify(header.split(" ")[1], JWT_SECRET);
    next();
  } catch {
    res
      .status(401)
      .json({ error: "Token expired or invalid. Please login again." });
  }
}

// ════════════════════════════════════════════════════════════════════
//  AUTH ROUTES
// ════════════════════════════════════════════════════════════════════

// REGISTER
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: "All fields are required" });
    if (password.length < 6)
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters" });

    const db = readJSON(PATHS.users, { users: [] });
    if (db.users.find((u) => u.email.toLowerCase() === email.toLowerCase()))
      return res
        .status(400)
        .json({ error: "An account with this email already exists" });

    const hashed = await bcrypt.hash(password, 12);
    const user = {
      id: uuidv4(),
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashed,
      avatar: name.trim().charAt(0).toUpperCase(),
      createdAt: new Date().toISOString(),
    };
    db.users.push(user);
    writeJSON(PATHS.users, db);

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, avatar: user.avatar },
      JWT_SECRET,
      { expiresIn: "7d" },
    );
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error during registration" });
  }
});

// LOGIN
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "Email and password are required" });

    const db = readJSON(PATHS.users, { users: [] });
    const user = db.users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase(),
    );
    if (!user)
      return res
        .status(400)
        .json({ error: "No account found with this email" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: "Incorrect password" });

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, avatar: user.avatar },
      JWT_SECRET,
      { expiresIn: "7d" },
    );
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error during login" });
  }
});

// GET current user profile
app.get("/api/auth/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// ════════════════════════════════════════════════════════════════════
//  PROBLEMS ROUTES
// ════════════════════════════════════════════════════════════════════

const AUTHORITY_MAP = {
  water: {
    authority: "Municipal Water Supply Department / Jal Board",
    platform: "Jal Jeevan Mission App / Local Municipal Portal / 1916 helpline",
    steps: [
      "Photograph the issue clearly as evidence",
      "Call water helpline 1916 immediately",
      "Visit nearest ward/municipal office with photos",
      "File written complaint, get receipt number",
      "Follow up after 7 days with complaint number",
      "Escalate to District Collector if unresolved in 14 days",
    ],
  },
  road: {
    authority: "Public Works Department (PWD) / NHAI for Highways",
    platform: "MyGov Portal / CPGRAMS (cpgrams.gov.in) / State PWD website",
    steps: [
      "Photograph road damage with landmarks visible",
      "Note exact GPS location and nearest landmark",
      "File on CPGRAMS portal or PWD website",
      "Contact local Ward Councillor for faster action",
      "Quote Motor Vehicles Act if accident risk exists",
      "Follow up weekly with complaint reference number",
    ],
  },
  electricity: {
    authority: "State Electricity Distribution Company (DISCOM)",
    platform: "DISCOM app / State Electricity Board portal / 1912 emergency",
    steps: [
      "Call 1912 immediately for dangerous electrical situations",
      "Note the transformer number or pole number nearby",
      "Lodge complaint on official DISCOM app",
      "Get complaint reference number via SMS",
      "Request meter inspection if billing issue",
      "Approach State Electricity Regulatory Commission if needed",
    ],
  },
  garbage: {
    authority:
      "Municipal Solid Waste Management Dept / Ward Sanitation Officer",
    platform: "Swachh Bharat Mission App / Local Corporation Portal",
    steps: [
      "Report on Swachh Bharat app with GPS location",
      "Contact ward sanitation officer directly",
      "File complaint at municipal office with photos",
      "Request regular pickup schedule in writing",
      "Involve local RWA/colony association",
      "Escalate to District Collector for chronic issues",
    ],
  },
  flood: {
    authority: "District Disaster Management Authority (DDMA)",
    platform: "NDMA Portal / State Disaster Response Portal / 1070 helpline",
    steps: [
      "Call National Disaster helpline 1070 immediately",
      "Contact District Collector / District Magistrate office",
      "Contact local police if evacuation is needed",
      "Register at nearest relief camp if displaced",
      "Apply for compensation via SDRF fund",
      "Document all damage with photos for claims",
    ],
  },
  pollution: {
    authority: "State Pollution Control Board (SPCB) / CPCB",
    platform: "CPCB Sameer App / State PCB Portal / National Green Tribunal",
    steps: [
      "Document pollution: photos, videos, time & date",
      "File complaint at State Pollution Control Board",
      "Report on CPCB Sameer mobile app with location",
      "Approach National Green Tribunal for serious cases",
      "File RTI for pollution data and action status",
      "Contact local media to amplify if chronic issue",
    ],
  },
  health: {
    authority: "District Health Officer / Chief Medical Officer (CMO)",
    platform: "Swasthya Seva / National Health Portal / 104 helpline",
    steps: [
      "Call health helpline 104 for immediate guidance",
      "Visit nearest government health center",
      "Contact District Medical Officer (DMO)",
      "Apply for free treatment under Ayushman Bharat scheme",
      "Report disease outbreaks to ICMR if needed",
      "Contact State Health Department for area-wide issues",
    ],
  },
  education: {
    authority:
      "District Education Officer (DEO) / Block Education Officer (BEO)",
    platform: "UDISE+ Portal / State Education Dept / MHRD Portal / NCPCR",
    steps: [
      "Contact School Management Committee (SMC) first",
      "Visit Block Education Officer (BEO) office",
      "File complaint with District Education Officer",
      "Use Right to Education (RTE) Act provisions",
      "Contact NCPCR for child rights violations",
      "File on CPGRAMS portal for central school issues",
    ],
  },
  default: {
    authority: "District Collector / Grievance Redressal Cell",
    platform: "CPGRAMS (cpgrams.gov.in) / State CM Helpline / Lokayukt",
    steps: [
      "Gather evidence: photos, documents, dates, witnesses",
      "Visit nearest government office related to your issue",
      "File written complaint, get acknowledgment receipt",
      "Use CPGRAMS portal for central government issues",
      "Use State CM Helpline for state government issues",
      "Approach Consumer Forum or Lokayukt if needed",
      "File RTI if information is being withheld",
    ],
  },
};

function detectCategory(text) {
  const t = text.toLowerCase();
  if (/(water|pipe|drain|sewer|tap|borewell|leak)/i.test(t)) return "water";
  if (/(road|pothole|street|highway|bridge|footpath|pavement)/i.test(t))
    return "road";
  if (/(electri|power|light|transformer|voltage|blackout|outage|wire)/i.test(t))
    return "electricity";
  if (/(garbage|waste|trash|dump|litter|sanit|sweep|bin)/i.test(t))
    return "garbage";
  if (/(flood|rain|waterlog|inundat)/i.test(t)) return "flood";
  if (/(pollut|smoke|dust|air quality|noise|chemical|effluent)/i.test(t))
    return "pollution";
  if (/(health|hospital|doctor|disease|medical|sick|clinic|ambulance)/i.test(t))
    return "health";
  if (/(school|education|teacher|student|college|study|fees)/i.test(t))
    return "education";
  return "default";
}

function generateSolution(text, cat) {
  const solutions = {
    water: `**Problem Analysis:** Water supply issues are among the most common civic problems and are typically resolved within 2–7 days once properly escalated.\n\n**Root Cause:** Usually caused by pipeline leakage, pump failure, valve issues, or unauthorized connections in the area.\n\n**Immediate Action:** Check if your overhead tank valve is open. Confirm with neighbors if it's a localized or area-wide problem. Call 1916 helpline right now.\n\n**Long-Term Fix:** Request the Municipal dept to conduct a full pipeline audit. Push for 24×7 water supply under Amrit 2.0 scheme. Demand installation of water meters to reduce wastage.\n\n**Legal Angle:** Access to clean water is a fundamental right under Article 21. Authorities are legally bound to act.`,
    road: `**Problem Analysis:** Road damage is a public safety hazard and authorities have legal obligation to repair it promptly.\n\n**Root Cause:** Potholes form due to poor drainage, overloaded vehicles, aging bitumen surfaces, or substandard construction materials.\n\n**Immediate Action:** Alert local police to place warning cones if accident-prone. File complaint on CPGRAMS with exact GPS coordinates and photos.\n\n**Long-Term Fix:** Demand construction using CC (Cement Concrete) roads instead of bitumen for permanent solution. Push for proper drainage channels alongside road repair.\n\n**Legal Angle:** Under Motor Vehicles Act, if an accident occurs due to a pothole, the responsible authority can be held liable for negligence. Use this as leverage in your complaint.`,
    electricity: `**Problem Analysis:** Power supply issues require immediate attention, especially if there's a safety risk.\n\n**Root Cause:** Outages caused by transformer overload, cable faults, equipment failure, or scheduled maintenance. Billing issues usually arise from meter malfunction.\n\n**Immediate Action:** Call 1912 emergency helpline. Check your MCB/fuse box first. Check DISCOM's website/app for scheduled outage info in your area.\n\n**Long-Term Fix:** Request meter audit and calibration test. Demand proper earthing and surge protection infrastructure. Push for underground cabling to prevent frequent storm-related disruptions.\n\n**Consumer Rights:** You are entitled to compensation for prolonged unscheduled outages under the Electricity Consumer Rights Regulations of your state.`,
    garbage: `**Problem Analysis:** Regular garbage collection is a basic municipal service — it's your legal right as a taxpaying citizen.\n\n**Root Cause:** Irregular collection usually due to staff shortage, vehicle breakdown, route mismanagement, or lack of accountability from sanitation supervisors.\n\n**Immediate Action:** Form a WhatsApp group with 10+ neighbors and file the same complaint collectively — group complaints get priority response. Contact your local Ward Councillor directly.\n\n**Long-Term Fix:** Push for door-to-door segregated collection (wet/dry waste separation). Request a fixed daily time schedule in writing. Demand community composting unit installation.\n\n**Smart Move:** File on Swachh Bharat Mission app — complaints with GPS location tags get fastest municipal response due to real-time monitoring.`,
    default: `**Problem Analysis:** Your problem has been categorized and a structured solution plan has been created.\n\n**Root Cause:** Civic problems typically arise from lack of accountability, resource constraints, or communication gaps between citizens and authorities.\n\n**Immediate Action:** Document everything with timestamps, photos, and witness contacts. Rally at least 5–10 neighbors to file the same complaint — collective complaints are prioritized.\n\n**Escalation Strategy:** Local Office → District Collector → State Grievance Portal → National CPGRAMS. Each escalation level typically gets 3× faster response.\n\n**Power Tools:** (1) RTI — Right to Information Act to track inaction. (2) Consumer Forum for service failures. (3) Lokayukt for government negligence. Always get a complaint number and follow up in writing every 7 days.`,
  };
  return solutions[cat] || solutions["default"];
}

function findSimilar(text, problems) {
  const words = text
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3);
  let best = null,
    bestScore = 0;
  for (const p of problems) {
    const pWords = (p.title + " " + p.description).toLowerCase().split(/\s+/);
    const common = words.filter((w) => pWords.includes(w));
    const score = common.length / Math.max(words.length, 1);
    if (score > 0.35 && score > bestScore) {
      bestScore = score;
      best = p;
    }
  }
  return best;
}

// GET all problems
app.get("/api/problems", (req, res) => {
  const db = readJSON(PATHS.problems, { problems: [] });
  res.json(
    db.problems.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
  );
});

// GET single problem
app.get("/api/problems/:id", (req, res) => {
  const db = readJSON(PATHS.problems, { problems: [] });
  const p = db.problems.find((p) => p.id === req.params.id);
  if (!p) return res.status(404).json({ error: "Problem not found" });
  res.json(p);
});

// POST new problem (protected)
app.post("/api/problems", requireAuth, upload.single("image"), (req, res) => {
  try {
    const { title, description, location } = req.body;
    if (!title || !description)
      return res
        .status(400)
        .json({ error: "Title and description are required" });

    const db = readJSON(PATHS.problems, { problems: [] });
    const similar = findSimilar(title + " " + description, db.problems);
    if (similar) return res.json({ similar: true, existingProblem: similar });

    const cat = detectCategory(title + " " + description);
    const problem = {
      id: uuidv4(),
      title: title.trim(),
      description: description.trim(),
      userName: req.user.name,
      userId: req.user.id,
      userAvatar: req.user.avatar,
      location: location ? JSON.parse(location) : null,
      image: req.file ? `/uploads/${req.file.filename}` : null,
      category: cat,
      aiSolution: generateSolution(title + " " + description, cat),
      authority: AUTHORITY_MAP[cat],
      status: "Open",
      votes: 0,
      votedBy: [],
      comments: [],
      createdAt: new Date().toISOString(),
    };
    db.problems.push(problem);
    writeJSON(PATHS.problems, db);
    res.json({ similar: false, problem });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST comment on problem (protected)
app.post("/api/problems/:id/comments", requireAuth, (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "Comment text required" });
  const db = readJSON(PATHS.problems, { problems: [] });
  const p = db.problems.find((p) => p.id === req.params.id);
  if (!p) return res.status(404).json({ error: "Problem not found" });
  const comment = {
    id: uuidv4(),
    userId: req.user.id,
    userName: req.user.name,
    userAvatar: req.user.avatar,
    text: text.trim(),
    createdAt: new Date().toISOString(),
  };
  p.comments.push(comment);
  writeJSON(PATHS.problems, db);
  res.json(comment);
});

// POST vote (protected, once per user)
app.post("/api/problems/:id/vote", requireAuth, (req, res) => {
  const db = readJSON(PATHS.problems, { problems: [] });
  const p = db.problems.find((p) => p.id === req.params.id);
  if (!p) return res.status(404).json({ error: "Problem not found" });
  if (!p.votedBy) p.votedBy = [];
  if (p.votedBy.includes(req.user.id))
    return res
      .status(400)
      .json({ error: "You already voted for this problem" });
  p.votes = (p.votes || 0) + 1;
  p.votedBy.push(req.user.id);
  writeJSON(PATHS.problems, db);
  res.json({ votes: p.votes });
});

// PATCH status (protected)
app.patch("/api/problems/:id/status", requireAuth, (req, res) => {
  const { status } = req.body;
  const db = readJSON(PATHS.problems, { problems: [] });
  const p = db.problems.find((p) => p.id === req.params.id);
  if (!p) return res.status(404).json({ error: "Problem not found" });
  p.status = status;
  writeJSON(PATHS.problems, db);
  res.json({ status: p.status });
});

// ════════════════════════════════════════════════════════════════════
//  COMMUNITY CHAT ROUTES
// ════════════════════════════════════════════════════════════════════

// GET chat messages (last 100)
app.get("/api/chat", requireAuth, (req, res) => {
  const db = readJSON(PATHS.chat, { messages: [] });
  res.json(db.messages.slice(-100));
});

// GET chat rooms list (distinct rooms)
app.get("/api/chat/rooms", requireAuth, (req, res) => {
  const db = readJSON(PATHS.chat, { messages: [] });
  const rooms = [...new Set(db.messages.map((m) => m.room))].filter(Boolean);
  const defaultRooms = [
    "General",
    "Road Issues",
    "Water & Utilities",
    "Health & Safety",
    "Education",
    "Announcements",
  ];
  const allRooms = [...new Set([...defaultRooms, ...rooms])];
  res.json(allRooms);
});

// GET messages for a specific room
app.get("/api/chat/room/:room", requireAuth, (req, res) => {
  const room = decodeURIComponent(req.params.room);
  const db = readJSON(PATHS.chat, { messages: [] });
  const msgs = db.messages.filter((m) => m.room === room).slice(-100);
  res.json(msgs);
});

// POST new chat message (protected)
app.post("/api/chat", requireAuth, (req, res) => {
  const { text, room } = req.body;
  if (!text || !text.trim())
    return res.status(400).json({ error: "Message cannot be empty" });
  const db = readJSON(PATHS.chat, { messages: [] });
  const msg = {
    id: uuidv4(),
    userId: req.user.id,
    userName: req.user.name,
    userAvatar: req.user.avatar,
    text: text.trim(),
    room: room || "General",
    createdAt: new Date().toISOString(),
  };
  db.messages.push(msg);
  // Keep only last 500 messages total
  if (db.messages.length > 500) db.messages = db.messages.slice(-500);
  writeJSON(PATHS.chat, db);
  res.json(msg);
});

// DELETE own message
app.delete("/api/chat/:id", requireAuth, (req, res) => {
  const db = readJSON(PATHS.chat, { messages: [] });
  const idx = db.messages.findIndex(
    (m) => m.id === req.params.id && m.userId === req.user.id,
  );
  if (idx === -1)
    return res.status(404).json({ error: "Message not found or not yours" });
  db.messages.splice(idx, 1);
  writeJSON(PATHS.chat, db);
  res.json({ success: true });
});

// ════════════════════════════════════════════════════════════════════
//  STATIC PAGE ROUTES
// ════════════════════════════════════════════════════════════════════

// Default route - redirect to login if not authenticated, otherwise serve dashboard
app.get("/", (req, res) => {
  const token = req.headers.authorization?.split(" ")[1] || 
                req.cookies?.solvit_token || 
                req.query.token;
  
  if (!token) {
    return res.redirect("/login.html");
  }
  
  try {
    jwt.verify(token, JWT_SECRET);
    res.sendFile(path.join(__dirname, "public", "userDashboard.html"));
  } catch {
    res.redirect("/login.html");
  }
});

// ── Start ───────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n✅ SolvIt running → http://localhost:${PORT}\n`);
  console.log("   Pages:");
  console.log("   • Login/Register : http://localhost:" + PORT + "/login.html");
  console.log(
    "   • User Dashboard : http://localhost:" + PORT + "/userDashboard.html\n",
  );
});
