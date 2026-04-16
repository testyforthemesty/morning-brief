// api/arch.js
// Proxies the Anthropic API for the architecture digest.
// Caches result in-memory for the calendar day so repeat page loads
// don't burn API credits.

let cache = { key: null, data: null };

function todayKey() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}`;
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

export default async function handler(req, res) {
  // CORS — allow the homepage to call this from any origin
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const key = todayKey();

  // Return cached result if it's from today
  if (cache.key === key && cache.data) {
    return res.status(200).json(cache.data);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set' });
  }

  const focus = FOCUSES[new Date().getUTCDate() % FOCUSES.length];

  const systemPrompt = `You are an architecture critic and historian. Select ONE under-recognised building completed after 1950 for a daily digest.

CRITERIA:
- Completed after 1950
- NOT a widely recognised landmark (no Guggenheim Bilbao, Sydney Opera House, Pompidou, Sagrada Familia, Fallingwater)
- NOT a top-10 or award-ceremony staple
- Valued for design, material innovation, spatial concept, or urban impact
- Focus type today: ${focus}
- Date seed: ${key} — pick something different each day

Use web search to verify real, accurate details. Find 3 real publicly accessible image URLs (Wikimedia Commons 800px, ArchDaily, WikiArquitectura preferred).

Respond ONLY with a single valid JSON object, no markdown, no code fences:
{"name":"...","city":"...","country":"...","year":1970,"architect":"...","writeup":"3-5 sentences, intelligent understated tone, no hype, under 150 words","detail":"one sentence about a specific design detail worth noticing","lat":0.0,"lng":0.0,"images":[{"url":"https://...","caption":"..."},{"url":"https://...","caption":"..."},{"url":"https://...","caption":"..."}]}`;

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
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
        messages: [{ role: 'user', content: `Research and select today's building. Date: ${key}. Return only JSON.` }]
      })
    });

    const apiData = await anthropicRes.json();

    if (!anthropicRes.ok) {
      console.error('Anthropic error:', apiData);
      return res.status(502).json({ error: 'Anthropic API error', detail: apiData.error?.message });
    }

    const textBlock = (apiData.content || []).find(b => b.type === 'text');
    const raw = (textBlock && textBlock.text) || '';
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) {
      console.error('No JSON in response. Raw:', raw.slice(0, 300));
      return res.status(502).json({ error: 'No JSON in API response' });
    }

    const data = JSON.parse(match[0]);

    // Cache for the day
    cache = { key, data };

    return res.status(200).json(data);

  } catch (err) {
    console.error('Handler error:', err);
    return res.status(500).json({ error: err.message });
  }
}
