let cache = { key: null, data: null };

function todayKey() {
  const d = new Date();
  return d.getUTCFullYear() + '-' + (d.getUTCMonth() + 1) + '-' + d.getUTCDate();
}

const FOCUSES = [
  'residential housing complex',
  'university or library building',
  'community or civic center',
  'mixed-use urban building',
  'cultural or arts institution',
  'office or workplace building',
  'infrastructure or transport building'
];

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const key = todayKey();
  if (cache.key === key && cache.data) {
    return res.status(200).json(cache.data);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set' });

  const focus = FOCUSES[new Date().getUTCDate() % FOCUSES.length];

  const systemPrompt = 'You are an architecture critic. Select ONE under-recognised building completed after 1950 — not a famous landmark, not a top-10 staple. Focus type: ' + focus + '. Date: ' + key + '. Use web search for real details and 3 real image URLs (Wikimedia 800px, ArchDaily). Respond ONLY with valid JSON, no markdown:\n{"name":"...","city":"...","country":"...","year":1970,"architect":"...","writeup":"3-5 sentences, intelligent understated tone, under 150 words","detail":"one sentence about a specific design detail","lat":0.0,"lng":0.0,"images":[{"url":"https://...","caption":"..."},{"url":"https://...","caption":"..."},{"url":"https://...","caption":"..."}]}';

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1200,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        system: systemPrompt,
        messages: [{ role: 'user', content: 'Research and select today\'s building. Return only JSON.' }]
      })
    });

    const apiData = await response.json();
    if (!response.ok) return res.status(502).json({ error: apiData.error?.message || 'API error' });

    const textBlock = (apiData.content || []).find(function(b) { return b.type === 'text'; });
    const raw = (textBlock && textBlock.text) || '';
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return res.status(502).json({ error: 'No JSON in response' });

    const data = JSON.parse(match[0]);
    cache = { key: key, data: data };
    return res.status(200).json(data);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
