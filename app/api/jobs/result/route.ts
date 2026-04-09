import { NextResponse } from 'next/server'
import { getJobById } from '@/lib/db'

const PLATFORM_WALLET = process.env.AGENTIC_WALLET_ADDRESS || '0xdf54982caada64c73f7f27afc11a9600a36625aa'
const USDC_ADDRESS_XLAYER = '0x74b7F16337b8972027F6196A17a631aC6dE26d22'
const ACCESS_FEE = '10000' // 0.01 USDC in minimal units (6 decimals)

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const jobId = searchParams.get('jobId')

  if (!jobId) {
    return NextResponse.json({ error: 'Job ID required' }, { status: 400 })
  }

  const job = getJobById(jobId)
  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  // Check if payment header is present
  const paymentHeader = request.headers.get('PAYMENT-SIGNATURE') || request.headers.get('X-PAYMENT')

  if (!paymentHeader) {
    // Return HTTP 402 with x402 payment payload
    const payload = {
      x402Version: 2,
      accepts: [{
        network: 'eip155:196',
        amount: ACCESS_FEE,
        payTo: PLATFORM_WALLET,
        asset: USDC_ADDRESS_XLAYER,
        maxTimeoutSeconds: 300,
        description: `Access fee for AgentHub job result #${jobId}`,
      }]
    }

    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64')

    return new NextResponse(encoded, {
      status: 402,
      headers: {
        'Content-Type': 'application/json',
        'X-Payment-Required': 'true',
      }
    })
  }

  // Payment header present — return the result
  return NextResponse.json({
    jobId,
    title: job.title,
    result: job.result || 'No result submitted yet',
    status: job.status,
    agent: job.agent,
    reward: job.reward,
  })
}