import { NextResponse } from 'next/server'
import crypto from 'crypto'

const API_KEY = process.env.ONCHAINOS_API_KEY || ''
const SECRET_KEY = process.env.ONCHAINOS_SECRET_KEY || ''
const PASSPHRASE = process.env.ONCHAINOS_PASSPHRASE || ''
const PROJECT_ID = process.env.ONCHAINOS_PROJECT_ID || ''
const BASE_URL = 'https://www.okx.com'

const USDC_XLAYER = '0x74b7F16337b8972027F6196A17a631aC6dE26d22'
const OKB_NATIVE = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
const CHAIN_INDEX = '196'

const TOKEN_MAP: Record<string, string> = {
  OKB: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
  ETH: '0x5a77f1443d16ee5761d310e38b62f77f726bc71c',
  USDT: '0x1e4a5963abfd975d8c9021ce480b42188849d41d',
}

function sign(timestamp: string, method: string, requestPath: string, queryString: string = '') {
  return crypto.createHmac('sha256', SECRET_KEY)
    .update(timestamp + method + requestPath + queryString)
    .digest('base64')
}

function getHeaders(method: string, requestPath: string, queryString: string = '') {
  const timestamp = new Date().toISOString()
  return {
    'Content-Type': 'application/json',
    'OK-ACCESS-KEY': API_KEY,
    'OK-ACCESS-SIGN': sign(timestamp, method, requestPath, queryString),
    'OK-ACCESS-TIMESTAMP': timestamp,
    'OK-ACCESS-PASSPHRASE': PASSPHRASE,
    'OK-ACCESS-PROJECT': PROJECT_ID,
  }
}

// GET — get quote
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const amount = searchParams.get('amount') || '10000'
    const toSymbol = searchParams.get('toToken') || 'OKB'
    const toToken = TOKEN_MAP[toSymbol] || OKB_NATIVE

    const requestPath = '/api/v6/dex/aggregator/quote'
    const queryString = `?chainIndex=${CHAIN_INDEX}&fromTokenAddress=${USDC_XLAYER}&toTokenAddress=${toToken}&amount=${amount}`
    const headers = getHeaders('GET', requestPath, queryString)

    const res = await fetch(`${BASE_URL}${requestPath}${queryString}`, { headers })
    const data = await res.json()

    if (data.code === '0' && data.data?.[0]) {
      const quote = data.data[0]
      const toDecimal = parseInt(quote.toToken?.decimal || '18')
      return NextResponse.json({
        fromToken: quote.fromToken?.tokenSymbol || 'USDC',
        toToken: quote.toToken?.tokenSymbol || toSymbol,
        fromAmount: parseFloat(amount) / 1e6,
        toAmount: parseFloat(quote.toTokenAmount) / Math.pow(10, toDecimal),
        priceImpact: quote.priceImpactPercentage || '0',
        dex: quote.dexRouterList?.[0]?.dexProtocol?.dexName || 'OKX DEX',
        route: quote.dexRouterList?.map((r: any) => r.dexProtocol?.dexName).filter(Boolean).join(' → ') || 'OKX DEX',
        estimateGasFee: quote.estimateGasFee || '0',
        toTokenAddress: toToken,
        fromTokenAddress: USDC_XLAYER,
      })
    }

    return NextResponse.json({ error: 'Failed to get quote', code: data.code, msg: data.msg })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST — get approve data + swap calldata
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { amount, toToken: toSymbol, walletAddress, slippage = '1' } = body
    const toToken = TOKEN_MAP[toSymbol] || OKB_NATIVE

    if (!walletAddress) return NextResponse.json({ error: 'Wallet address required' }, { status: 400 })

    // Step 1: get approve transaction data to get correct spender address
    const approvePath = '/api/v6/dex/aggregator/approve-transaction'
    const approveQuery = `?chainIndex=${CHAIN_INDEX}&tokenContractAddress=${USDC_XLAYER}&approveAmount=${amount}`
    const approveHeaders = getHeaders('GET', approvePath, approveQuery)
    const approveRes = await fetch(`${BASE_URL}${approvePath}${approveQuery}`, { headers: approveHeaders })
    const approveData = await approveRes.json()

    let spenderAddress = ''
    let approveCalldata = ''
    if (approveData.code === '0' && approveData.data?.[0]) {
      spenderAddress = approveData.data[0].dexContractAddress || ''
      approveCalldata = approveData.data[0].data || ''
    }

    // Step 2: get swap calldata
    const swapPath = '/api/v6/dex/aggregator/swap'
    const swapQuery = `?chainIndex=${CHAIN_INDEX}&fromTokenAddress=${USDC_XLAYER}&toTokenAddress=${toToken}&amount=${amount}&slippagePercent=${slippage}&userWalletAddress=${walletAddress}`
    const swapHeaders = getHeaders('GET', swapPath, swapQuery)
    const swapRes = await fetch(`${BASE_URL}${swapPath}${swapQuery}`, { headers: swapHeaders })
    const swapData = await swapRes.json()

    if (swapData.code === '0' && swapData.data?.[0]) {
      const swap = swapData.data[0]
      return NextResponse.json({
        tx: swap.tx,
        routerResult: swap.routerResult,
        spenderAddress,
        approveCalldata,
      })
    }

    return NextResponse.json({ error: 'Failed to get swap data', code: swapData.code, msg: swapData.msg })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
