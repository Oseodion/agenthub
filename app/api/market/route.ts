import { NextResponse } from 'next/server'

let cache: { price: string; change: string; timestamp: number } | null = null

export async function GET() {
  try {
    if (cache && Date.now() - cache.timestamp < 60000) {
      return NextResponse.json(cache)
    }

    // Public endpoint — no API keys needed
    const res = await fetch('https://www.okx.com/api/v5/market/ticker?instId=OKB-USDT', {
      headers: { 'Content-Type': 'application/json' }
    })
    const data = await res.json()

    if (data.code === '0' && data.data?.[0]) {
      const ticker = data.data[0]
      const price = parseFloat(ticker.last).toFixed(2)
      const open24h = parseFloat(ticker.open24h)
      const last = parseFloat(ticker.last)
      const change = (((last - open24h) / open24h) * 100).toFixed(2)
      const changePrefix = parseFloat(change) >= 0 ? '+' : ''

      cache = { price, change: `${changePrefix}${change}%`, timestamp: Date.now() }
      return NextResponse.json(cache)
    }

    return NextResponse.json({ price: '--', change: '--', timestamp: Date.now() })
  } catch (err) {
    return NextResponse.json({ price: '--', change: '--', timestamp: Date.now() })
  }
}