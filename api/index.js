export default async function handler(req, res) {
  const { url, date } = req.query

  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate')

  if (!url) {
    return res.status(400).json({ error: 'Missing required parameter: url' })
  }

  const normalizedUrl = url.replace(/^https?:\/\//, '').replace(/^www\./, '')
  let waybackUrl = `https://archive.org/wayback/available?url=${normalizedUrl}`
  
  if (date && !/^\d{8}$/.test(date)) {
    return res.status(400).json({ error: 'Invalid date format. Use YYYYMMDD' })
  }
  if (date) waybackUrl += `&timestamp=${date}`

  try {
    const waybackRes = await fetch(waybackUrl)
    const data = await waybackRes.json()
    const snapshot = data.archived_snapshots?.closest

    if (!snapshot?.available) {
      return res.status(404).json({ url: normalizedUrl, available: false, status: 404 })
    }

    return res.status(200).json({
      url: normalizedUrl,
      snapshot_url: snapshot.url,
      timestamp: snapshot.timestamp,
      status: 200,
      available: true
    })
  } catch (e) {
    return res.status(500).json({ error: 'Wayback fetch failed', status: 500 })
  }
}
