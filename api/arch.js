// api/arch.js
// Serves today.json from the public folder.
// The Cowork daily job writes public/today.json each morning.
// This route just adds CORS headers so the homepage can fetch it cross-origin.

const path = require('path');
const fs = require('fs');

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const filePath = path.join(process.cwd(), 'public', 'today.json');
    const data = fs.readFileSync(filePath, 'utf8');
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.status(200).send(data);
  } catch (e) {
    return res.status(404).json({ error: 'today.json not yet generated' });
  }
};
