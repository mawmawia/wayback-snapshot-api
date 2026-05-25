export const runtime = 'edge'

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const url = searchParams.get('url')
  const date = searchParams.get('date')

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
    'Cache-Control': 's-maxage=60, stale-while-revalidate'
  }

  if (!url) {
    return new Response(
      JSON.stringify({ error: 'Missing required parameter: url' }),
      { status: 400, headers }
    )
  }

  const normalizedUrl = url.replace(/^https?:\/\//, '').replace(/^www\./, '')
  let waybackUrl = `https://archive.org/wayback/available?url=${normalizedUrl}`
  
  if (date) {
    if (!/^\d{8}$/.test(date)) {
      return new Response(
        JSON.stringify({ error: 'Invalid date format. Use YYYYMMDD' }),
        { status: 400, headers }
      )
    }
    waybackUrl += `&timestamp=${date}`
  }

  try {
    const waybackRes = await fetch(waybackUrl, { 
      signal: AbortSignal.timeout(4000) 
    })
    const data = await waybackRes.json()
    const snapshot = data.archived_snapshots?.closest

    if (!snapshot?.available) {
      return new Response(
        JSON.stringify({ url: normalizedUrl, available: false, status: 404 }),
        { status: 404, headers }
      )
    }

    return new Response(
      JSON.stringify({
        url: normalizedUrl,
        snapshot_url: snapshot.url,
        timestamp: snapshot.timestamp,
        status: 200,
        available: true
      }),
      { status: 200, headers }
    )
  } catch (e) {
    return new Response(
      JSON.stringify({ error: 'Wayback fetch failed', status: 500 }),
      { status: 500, headers }
    )
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  })
}
