const fs = require("fs");

function readJSON(filePath, def) {
  try {
    if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, JSON.stringify(def, null, 2));
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch { return def; }
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

module.exports = { readJSON, writeJSON };
