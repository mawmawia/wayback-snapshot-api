module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  
  try {
    const { url, date } = req.query;
    if (!url) return res.status(400).json({ error: 'Missing ?url= parameter' });

    const targetDate = date || 'latest';
    const waybackApi = `https://archive.org/wayback/available?url=${encodeURIComponent(url)}&timestamp=${targetDate}`;
    
    const response = await fetch(waybackApi);
    const data = await response.json();
    
    if (!data.archived_snapshots?.closest?.url) {
      return res.status(404).json({ error: 'No snapshot found for this URL/date' });
    }

    const snapshot = data.archived_snapshots.closest;
    return res.json({
      original_url: url,
      snapshot_url: snapshot.url,
      snapshot_timestamp: snapshot.timestamp,
      available: snapshot.available
    });
    
  } catch (error) {
    return res.status(500).json({ error: 'Wayback API failed', details: error.message });
  }
};
