// Fetches 5Y/10Y treasury yields from FRED (last 2 values for 1D bps change)
// and 30D avg SOFR from NY Fed. Runs server-side to avoid browser CORS.
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  res.setHeader('Cache-Control', 'public, max-age=1800');

  async function fetchFredLast2(series) {
    const r = await fetch(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${series}`);
    const text = await r.text();
    const rows = text.trim().split('\n').slice(1).reverse();
    const vals = [];
    for (const row of rows) {
      const v = row.split(',')[1]?.trim();
      if (v && v !== '.') { vals.push(parseFloat(v)); if (vals.length === 2) break; }
    }
    return { cur: vals[0] ?? null, prev: vals[1] ?? null };
  }

  async function fetchSofr() {
    const r = await fetch('https://markets.newyorkfed.org/api/rates/all/latest.json');
    const j = await r.json();
    const entry = (j.refRates || []).find(x => x.type === 'SOFRAI');
    return entry?.average30day ?? null;
  }

  try {
    const [y5, y10, sofr] = await Promise.all([
      fetchFredLast2('DGS5'),
      fetchFredLast2('DGS10'),
      fetchSofr().catch(() => null)
    ]);
    return res.status(200).json({
      y5: y5.cur, y5Prev: y5.prev,
      y10: y10.cur, y10Prev: y10.prev,
      sofr
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
