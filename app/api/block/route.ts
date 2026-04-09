import { NextResponse } from 'next/server'
import { getBlockNumber } from '@/lib/onchainos'

let cachedBlock = 0
let lastFetch = 0

export async function GET() {
  try {
    const now = Date.now()
    // Only fetch from RPC every 30 seconds, return cache in between
    if (now - lastFetch > 30000) {
      cachedBlock = await getBlockNumber()
      lastFetch = now
    } else {
      // Estimate block number based on ~2s block time
      const secondsSince = (now - lastFetch) / 1000
      cachedBlock = cachedBlock + Math.floor(secondsSince / 2)
    }
    return NextResponse.json({ block: cachedBlock })
  } catch (err) {
    return NextResponse.json({ block: cachedBlock || 0 })
  }
}