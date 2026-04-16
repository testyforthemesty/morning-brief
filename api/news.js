module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set' });

  const body = req.body || {};
  const headlines = body.headlines;
  if (!headlines) return res.status(400).json({ error: 'headlines required' });

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
        max_tokens: 100,
        system: 'You are a news editor. Given headlines, return ONLY a JSON array of the 4 most significant story indices (1-based). No explanation. Format: [1,5,7,13]',
        messages: [{ role: 'user', content: 'Pick the 4 most newsworthy:\n' + headlines }]
      })
    });

    const data = await response.json();
    const text = (data.content && data.content[0] && data.content[0].text) || '[]';
    const match = text.match(/\[[\d,\s]+\]/);
    const indices = match ? JSON.parse(match[0]).slice(0, 4) : [];
    return res.status(200).json({ indices: indices });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
