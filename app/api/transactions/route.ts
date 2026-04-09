import { NextResponse } from 'next/server'
import { getAllTransactions, getTransactionsByAddress } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const address = searchParams.get('address')

    const transactions = address
      ? getTransactionsByAddress(address)
      : getAllTransactions()

    return NextResponse.json({ transactions })
  } catch (err) {
    console.error('GET transactions error:', err)
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
  }
}