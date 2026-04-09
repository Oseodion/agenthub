import crypto from 'crypto'

const BASE_URL = 'https://web3.okx.com/api/v5/waas'

function sign(timestamp: string, method: string, path: string, body: string = '') {
  const message = timestamp + method + path + body
  return crypto
    .createHmac('sha256', process.env.ONCHAINOS_SECRET_KEY!)
    .update(message)
    .digest('base64')
}

function headers(method: string, path: string, body: string = '') {
  const timestamp = new Date().toISOString()
  return {
    'Content-Type': 'application/json',
    'OK-ACCESS-KEY': process.env.ONCHAINOS_API_KEY!,
    'OK-ACCESS-SIGN': sign(timestamp, method, path, body),
    'OK-ACCESS-TIMESTAMP': timestamp,
    'OK-ACCESS-PASSPHRASE': process.env.ONCHAINOS_PASSPHRASE!,
  }
}

// ── Wallet ──────────────────────────────────────────────
export async function createAgenticWallet() {
  const path = '/mpc-wallet/create-wallet'
  const body = JSON.stringify({ chainIndex: '196' }) // X Layer mainnet
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: headers('POST', path, body),
    body,
  })
  return res.json()
}

export async function getWalletBalance(address: string) {
  const path = `/mpc-wallet/asset/query-all-assets`
  const body = JSON.stringify({
    accounts: [{ chainIndex: '196', address }],
  })
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: headers('POST', path, body),
    body,
  })
  return res.json()
}

export async function getTransactions(address: string) {
  const path = `/mpc-wallet/transaction/get-transactions`
  const body = JSON.stringify({
    address,
    chainIndex: '196',
    limit: '20',
  })
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: headers('POST', path, body),
    body,
  })
  return res.json()
}

// ── x402 Payment ────────────────────────────────────────
export async function createPayment(params: {
  fromAddress: string
  toAddress: string
  amount: string // in USDC, e.g. "8"
  jobId: string
}) {
  const path = '/payment/create-order'
  const body = JSON.stringify({
    chainIndex: '196',
    fromAddr: params.fromAddress,
    toAddr: params.toAddress,
    amount: params.amount,
    tokenAddress: process.env.NEXT_PUBLIC_USDC_ADDRESS,
    extInfo: { jobId: params.jobId },
  })
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: headers('POST', path, body),
    body,
  })
  return res.json()
}

export async function getPaymentStatus(orderId: string) {
  const path = `/payment/get-order?orderId=${orderId}`
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'GET',
    headers: headers('GET', path),
  })
  return res.json()
}

// ── Market Data ──────────────────────────────────────────
export async function getOKBPrice() {
  const path = '/market/current-price?chainIndex=196&tokenAddress=native'
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'GET',
    headers: headers('GET', path),
  })
  return res.json()
}

export async function getBlockNumber() {
  const res = await fetch('https://rpc.xlayer.tech', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_blockNumber',
      params: [],
      id: 1,
    }),
  })
  const data = await res.json()
  return parseInt(data.result, 16)
}
