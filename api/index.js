export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { searchParams } = new URL(req.url, `https://${req.headers.host}`);
  let url = searchParams.get('url');
  const date = searchParams.get('date');
  
  if (!url) {
    return res.status(400).json({ 
      error: "Missing required parameter: url",
      example: "/api?url=example.com"
    });
  }

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }

  try {
    let waybackUrl = `https://archive.org/wayback/available?url=${encodeURIComponent(url)}`;
    if (date) waybackUrl += `&timestamp=${date}`;
    
    // 8s timeout prevents Vercel/RapidAPI hangs
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    
    const waybackRes = await fetch(waybackUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'WaybackSnapshotAPI/1.0 (+https://rapidapi.com)'
      }
    });
    
    clearTimeout(timeout);
    
    if (!waybackRes.ok) {
      throw new Error(`Wayback responded with ${waybackRes.status}`);
    }
    
    const data = await waybackRes.json();
    
    if (data.archived_snapshots?.closest?.available) {
      return res.status(200).json({
        original_url: searchParams.get('url'),
        normalized_url: url,
        snapshot_url: data.archived_snapshots.closest.url,
        snapshot_timestamp: data.archived_snapshots.closest.timestamp,
        available: true
      });
    } else {
      return res.status(404).json({ 
        error: "No snapshot found for this URL/date",
        original_url: searchParams.get('url'),
        normalized_url: url,
        available: false
      });
    }
  } catch (error) {
    const isTimeout = error.name === 'AbortError';
    return res.status(isTimeout ? 504 : 500).json({ 
      error: isTimeout ? "Wayback Machine timeout" : "Failed to query Wayback Machine", 
      details: error.message 
    });
  }
}
