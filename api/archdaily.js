// Fetches ArchDaily RSS server-side to avoid CORS, returns first project item with thumbnail.
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  res.setHeader('Cache-Control', 'public, max-age=1800');

  try {
    const r = await fetch('https://www.archdaily.com/feed/', {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/rss+xml, text/xml' }
    });
    if (!r.ok) throw new Error('feed ' + r.status);
    const xml = await r.text();

    // Parse items from RSS without a DOM parser
    const items = [];
    const itemRe = /<item>([\s\S]*?)<\/item>/g;
    let m;
    while ((m = itemRe.exec(xml)) !== null) {
      const block = m[1];
      const get = (tag) => {
        const r = new RegExp('<' + tag + '[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*<\\/' + tag + '>|<' + tag + '[^>]*>([^<]*)<\\/' + tag + '>');
        const match = r.exec(block);
        return match ? (match[1] || match[2] || '').trim() : '';
      };
      const getAttr = (tag, attr) => {
        const r = new RegExp('<' + tag + '[^>]*\\s' + attr + '=["\']([^"\']*)["\']');
        const match = r.exec(block);
        return match ? match[1].trim() : '';
      };

      const title = get('title');
      if (!title.includes(' / ')) continue;

      const thumb = getAttr('media:thumbnail', 'url') || getAttr('enclosure', 'url') || '';
      if (!thumb) continue;

      const link = get('link') || getAttr('link', 'href');
      const desc = get('description').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      const parts = title.split(' / ');

      items.push({
        name: parts.slice(0, -1).join(' / '),
        architect: parts[parts.length - 1],
        imgUrl: thumb,
        desc: desc.length > 500 ? desc.substring(0, 500).replace(/\s\S+$/, '') + '…' : desc,
        link
      });

      if (items.length >= 1) break;
    }

    if (!items.length) throw new Error('no project items with thumbnail');
    return res.status(200).json(items[0]);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
