import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const address = searchParams.get('address')

    if (!address) {
      return NextResponse.json({ error: 'Address required' }, { status: 400 })
    }

    // OnchainOS Security API — check wallet risk score
    const res = await fetch(
      `https://www.okx.com/api/v5/wallet/security/address-risk?address=${address}&chainIndex=196`,
      { headers: { 'Content-Type': 'application/json' } }
    )
    const data = await res.json()

    if (data.code === '0' && data.data?.[0]) {
      const risk = data.data[0]
      return NextResponse.json({
        address,
        riskLevel: risk.riskLevel || 'low',
        riskScore: risk.riskScore || 0,
        tags: risk.riskTags || [],
      })
    }

    return NextResponse.json({ address, riskLevel: 'low', riskScore: 0, tags: [] })
  } catch (err) {
    return NextResponse.json({ address: '', riskLevel: 'low', riskScore: 0, tags: [] })
  }
}