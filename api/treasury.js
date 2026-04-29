// Live treasury yields from Yahoo Finance (^FVX = 5Y, ^TNX = 10Y)
// 30D avg SOFR from NY Fed. Runs server-side to avoid CORS.
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  res.setHeader('Cache-Control', 'public, max-age=1800');

  const YF_HEADERS = { 'User-Agent': 'Mozilla/5.0' };

  async function fetchYF(symbol) {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
    const r = await fetch(url, { headers: YF_HEADERS });
    const j = await r.json();
    const meta = j?.chart?.result?.[0]?.meta;
    if (!meta) return { cur: null, prev: null };
    return {
      cur:  meta.regularMarketPrice ?? null,
      prev: meta.chartPreviousClose ?? null,
    };
  }

  async function fetchSofr() {
    const r = await fetch('https://markets.newyorkfed.org/api/rates/all/latest.json');
    const j = await r.json();
    const entry = (j.refRates || []).find(x => x.type === 'SOFRAI');
    return entry?.average30day ?? null;
  }

  try {
    const [y5, y10, sofr] = await Promise.all([
      fetchYF('^FVX'),
      fetchYF('^TNX'),
      fetchSofr().catch(() => null),
    ]);
    return res.status(200).json({
      y5: y5.cur,   y5Prev: y5.prev,
      y10: y10.cur, y10Prev: y10.prev,
      sofr,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
