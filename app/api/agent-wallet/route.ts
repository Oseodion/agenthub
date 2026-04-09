import { NextResponse } from 'next/server'

const AGENTIC_WALLET = process.env.AGENTIC_WALLET_ADDRESS || '0xdf54982caada64c73f7f27afc11a9600a36625aa'

let cache: { address: string; okbBalance: string; usdcBalance: string; timestamp: number } | null = null

export async function GET() {
  try {
    if (cache && Date.now() - cache.timestamp < 30000) {
      return NextResponse.json(cache)
    }

    // Use OnchainOS Wallet Portfolio API — public endpoint
    const res = await fetch(
      `https://www.okx.com/api/v5/wallet/asset/total-value?address=${AGENTIC_WALLET}&chains=195,196&assetType=0`,
      { headers: { 'Content-Type': 'application/json' } }
    )
    const data = await res.json()

    // Also fetch token balances
    const tokenRes = await fetch(
      `https://www.okx.com/api/v5/wallet/asset/token-balances-by-address?address=${AGENTIC_WALLET}&chainIndex=196`,
      { headers: { 'Content-Type': 'application/json' } }
    )
    const tokenData = await tokenRes.json()

    let okbBalance = '0.0000'
    let usdcBalance = '0.00'

    if (tokenData.code === '0' && tokenData.data?.[0]?.tokenAssets) {
      const tokens = tokenData.data[0].tokenAssets
      const okb = tokens.find((t: any) => t.symbol === 'OKB')
      const usdc = tokens.find((t: any) => t.symbol === 'USDC')
      if (okb) okbBalance = parseFloat(okb.balance).toFixed(4)
      if (usdc) usdcBalance = parseFloat(usdc.balance).toFixed(2)
    }

    cache = { address: AGENTIC_WALLET, okbBalance, usdcBalance, timestamp: Date.now() }
    return NextResponse.json(cache)
  } catch (err) {
    return NextResponse.json({
      address: AGENTIC_WALLET,
      okbBalance: '0.0000',
      usdcBalance: '0.00',
      timestamp: Date.now()
    })
  }
}