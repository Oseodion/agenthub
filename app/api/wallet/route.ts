import { NextResponse } from 'next/server'
import { getWalletBalance, getTransactions, getBlockNumber } from '@/lib/onchainos'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const address = searchParams.get('address')

  if (!address) {
    return NextResponse.json({ error: 'Address required' }, { status: 400 })
  }

  try {
    const [balance, transactions, blockNumber] = await Promise.all([
      getWalletBalance(address),
      getTransactions(address),
      getBlockNumber(),
    ])

    return NextResponse.json({
      balance,
      transactions,
      blockNumber,
    })
  } catch (err) {
    console.error('Wallet API error:', err)
    return NextResponse.json({ error: 'Failed to fetch wallet data' }, { status: 500 })
  }
}
