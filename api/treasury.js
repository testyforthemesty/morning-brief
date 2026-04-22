// api/treasury.js
// Fetches previous trading day's official treasury yields from FRED (Federal Reserve).
// Runs server-side on Vercel so there are no browser CORS restrictions.
// Returns { dgs5: 4.35, dgs10: 4.40 } — values in percent.

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  res.setHeader('Cache-Control', 'public, max-age=3600');

  async function fetchFred(series) {
    const r = await fetch(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${series}`);
    const text = await r.text();
    const rows = text.trim().split('\n').slice(1);
    for (let i = rows.length - 1; i >= 0; i--) {
      const v = rows[i].split(',')[1]?.trim();
      if (v && v !== '.') return parseFloat(v);
    }
    return null;
  }

  try {
    const [dgs5, dgs10] = await Promise.all([fetchFred('DGS5'), fetchFred('DGS10')]);
    return res.status(200).json({ dgs5, dgs10 });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
