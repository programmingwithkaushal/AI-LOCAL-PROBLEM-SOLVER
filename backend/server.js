// ═══════════════════════════════════════════════════════════════════
//  SolvIt Server — Modular Backend Architecture
// ═══════════════════════════════════════════════════════════════════
const app = require("./src/app");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;

// Ensure data directory exists
const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "../frontend/public/uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Start server
app.listen(PORT, () => {
  console.log(`\n✅ SolvIt Backend running → http://localhost:${PORT}\n`);
  console.log("   API Endpoints:");
  console.log("   • Auth          : http://localhost:" + PORT + "/api/auth");
  console.log("   • Problems      : http://localhost:" + PORT + "/api/problems");
  console.log("   • Chat          : http://localhost:" + PORT + "/api/chat");
  console.log("   • Health Check  : http://localhost:" + PORT + "/api/health\n");
  console.log("   Frontend:");
  console.log("   • Login/Register : http://localhost:" + PORT + "/login.html");
  console.log("   • Main App       : http://localhost:" + PORT + "/\n");
});
