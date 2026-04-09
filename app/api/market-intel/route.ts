import { NextResponse } from 'next/server'
import crypto from 'crypto'

const API_KEY = process.env.ONCHAINOS_API_KEY || ''
const SECRET_KEY = process.env.ONCHAINOS_SECRET_KEY || ''
const PASSPHRASE = process.env.ONCHAINOS_PASSPHRASE || ''
const PROJECT_ID = process.env.ONCHAINOS_PROJECT_ID || ''
const BASE_URL = 'https://www.okx.com'

function sign(timestamp: string, method: string, requestPath: string, queryString: string = '') {
    const message = timestamp + method + requestPath + queryString
    return crypto.createHmac('sha256', SECRET_KEY).update(message).digest('base64')
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

let cache: { data: any; timestamp: number } | null = null

export async function GET() {
    try {
        if (cache && Date.now() - cache.timestamp < 60000) {
            return NextResponse.json(cache.data)
        }

        // Fetch OKB price + 24h change
        const okbPath = '/api/v5/market/ticker'
        const okbQuery = '?instId=OKB-USDT'
        const okbRes = await fetch(`https://www.okx.com${okbPath}${okbQuery}`, {
            headers: { 'Content-Type': 'application/json' }
        })
        const okbData = await okbRes.json()

        // Fetch top tokens on X Layer via DEX token API
        const tokenPath = '/api/v6/dex/market/price-info'
        const tokenQuery = '?chainIndex=196'
        const tokenHeaders = getHeaders('GET', tokenPath, tokenQuery)
        const tokenRes = await fetch(`${BASE_URL}${tokenPath}${tokenQuery}`, { headers: tokenHeaders })
        const tokenData = await tokenRes.json()

        // Fetch trending tokens on X Layer
        const trendPath = '/api/v6/dex/market/ranking'
        const trendQuery = '?chainIndex=196&rankType=1&limit=5'
        const trendHeaders = getHeaders('GET', trendPath, trendQuery)
        const trendRes = await fetch(`${BASE_URL}${trendPath}${trendQuery}`, { headers: trendHeaders })
        const trendData = await trendRes.json()

        let okbPrice = '--'
        let okbChange = '--'
        let okbVolume = '--'

        if (okbData.code === '0' && okbData.data?.[0]) {
            const ticker = okbData.data[0]
            okbPrice = parseFloat(ticker.last).toFixed(2)
            const open24h = parseFloat(ticker.open24h)
            const last = parseFloat(ticker.last)
            const change = (((last - open24h) / open24h) * 100).toFixed(2)
            okbChange = (parseFloat(change) >= 0 ? '+' : '') + change + '%'
            okbVolume = (parseFloat(ticker.volCcy24h || ticker.vol24h) / 1000000).toFixed(1) + 'M'
        }

        // Parse trending tokens
        let trending: any[] = []
        if (trendData.code === '0' && trendData.data?.length > 0) {
            trending = trendData.data.slice(0, 5).map((t: any) => ({
                symbol: t.tokenSymbol || t.symbol,
                price: t.tokenUnitPrice ? `$${parseFloat(t.tokenUnitPrice).toFixed(4)}` : '--',
                change: t.priceChange24h ? (parseFloat(t.priceChange24h) >= 0 ? '+' : '') + parseFloat(t.priceChange24h).toFixed(2) + '%' : '--',
            }))
        }

        const result = {
            okb: { price: okbPrice, change: okbChange, volume: okbVolume },
            trending,
            timestamp: Date.now(),
        }

        cache = { data: result, timestamp: Date.now() }
        return NextResponse.json(result)
    } catch (err: any) {
        return NextResponse.json({
            okb: { price: '--', change: '--', volume: '--' },
            trending: [],
            timestamp: Date.now(),
        })
    }
}
