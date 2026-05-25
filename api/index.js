export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate')

  const { url, date } = req.query
  if (!url) return res.status(400).json({ error: 'Missing url' })

  const normalizedUrl = url.replace(/^https?:\/\//, '').replace(/^www\./, '')
  let waybackUrl = `https://archive.org/wayback/available?url=${normalizedUrl}`
  if (date) waybackUrl += `&timestamp=${date}`

  try {
    const waybackRes = await fetch(waybackUrl)
    const data = await waybackRes.json()
    const snapshot = data.archived_snapshots?.closest

    if (!snapshot?.available) {
      return res.status(404).json({ url: normalizedUrl, available: false, status: 404 })
    }

    res.status(200).json({
      url: normalizedUrl,
      snapshot_url: snapshot.url,
      timestamp: snapshot.timestamp,
      status: 200,
      available: true
    })
  } catch (e) {
    res.status(500).json({ error: 'Wayback fetch failed' })
  }
}
