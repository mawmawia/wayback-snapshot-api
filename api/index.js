export default async function handler(req, res) {
  // CORS for RapidAPI
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  // Get URL param - handles both ?url= and edge cases
  const { searchParams } = new URL(req.url, `https://${req.headers.host}`);
  const url = searchParams.get('url');
  const date = searchParams.get('date');
  
  if (!url) {
    return res.status(400).json({ error: "Missing ?url= parameter" });
  }

  try {
    let waybackUrl = `https://archive.org/wayback/available?url=${encodeURIComponent(url)}`;
    if (date) waybackUrl += `&timestamp=${date}`;
    
    const waybackRes = await fetch(waybackUrl);
    const data = await waybackRes.json();
    
    if (data.archived_snapshots?.closest?.available) {
      return res.status(200).json({
        original_url: url,
        snapshot_url: data.archived_snapshots.closest.url,
        snapshot_timestamp: data.archived_snapshots.closest.timestamp,
        available: true
      });
    } else {
      return res.status(404).json({ 
        error: "No snapshot found for this URL/date",
        original_url: url,
        available: false 
      });
    }
  } catch (error) {
    return res.status(500).json({ error: "Wayback API error", details: error.message });
  }
}
