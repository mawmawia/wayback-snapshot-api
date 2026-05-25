export const runtime = 'edge'

export default async function handler(req) {
  const { searchParams } = new URL(req.url)
  const url = searchParams.get('url')
  const date = searchParams.get('date')

  // CORS headers for RapidAPI + browsers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-RapidAPI-Key, X-RapidAPI-Host',
    'Content-Type': 'application/json',
    'Cache-Control': 's-maxage=60, stale-while-revalidate'
  }

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers })
  }

  // Validate required param
  if (!url) {
    return new Response(
      JSON.stringify({ error: 'Missing required parameter: url' }),
      { status: 400, headers }
    )
  }

  // Normalize URL - strip protocol and www
  const normalizedUrl = url.replace(/^https?:\/\//, '').replace(/^www\./, '')

  // Build Wayback API URL
  let waybackUrl = `https://archive.org/wayback/available?url=${normalizedUrl}`
  if (date) {
    // Validate date format YYYYMMDD
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
      signal: AbortSignal.timeout(5000) // 5s timeout
    })
    
    if (!waybackRes.ok) {
      throw new Error('Wayback API error')
    }

    const waybackData = await waybackRes.json()
    const snapshot = waybackData.archived_snapshots?.closest

    if (!snapshot || !snapshot.available) {
      return new Response(
        JSON.stringify({ 
          url: normalizedUrl, 
          available: false, 
          status: 404 
        }),
        { status: 404, headers }
      )
    }

    // Success response matching your RapidAPI example
    const responseBody = {
      url: normalizedUrl,
      snapshot_url: snapshot.url,
      timestamp: snapshot.timestamp,
      status: 200,
      available: true
    }

    return new Response(JSON.stringify(responseBody), { 
      status: 200, 
      headers 
    })

  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch from Wayback Machine', 
        details: error.message,
        status: 500 
      }),
      { status: 500, headers }
    )
  }
}
