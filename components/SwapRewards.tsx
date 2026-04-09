'use client'
import { useState, useEffect, useCallback } from 'react'
import { publicClient, USDC_ABI, USDC_ADDRESS } from '@/lib/web3'
import { formatUnits, parseUnits, encodeFunctionData } from 'viem'

const TOKENS = ['OKB', 'ETH', 'USDT']
const USDC_CONTRACT = '0x74b7F16337b8972027F6196A17a631aC6dE26d22'

// OKX DEX Router on X Layer
const DEX_ROUTER = '0x1daB33Db8eC1745e7B3B669bE5D312B0DFB9B9b4'

export default function SwapRewards({ isMobile }: { isMobile: boolean }) {
  const [address, setAddress] = useState<string | null>(null)
  const [usdcBalance, setUsdcBalance] = useState('0.00')
  const [amount, setAmount] = useState('')
  const [toToken, setToToken] = useState('OKB')
  const [quote, setQuote] = useState<any>(null)
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [swapping, setSwapping] = useState(false)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const provider = (window as any).okxwallet || (window as any).ethereum
    if (!provider) return
    provider.request({ method: 'eth_accounts' })
      .then((accounts: string[]) => {
        if (accounts.length > 0) {
          setAddress(accounts[0])
          // fetch USDC balance
          publicClient.readContract({ address: USDC_ADDRESS, abi: USDC_ABI, functionName: 'balanceOf', args: [accounts[0] as `0x${string}`] })
            .then((bal: any) => setUsdcBalance(parseFloat(formatUnits(bal, 6)).toFixed(4)))
            .catch(() => { })
        }
      })
      .catch(() => { })
  }, [])

  const fetchQuote = useCallback(async () => {
    if (!amount || parseFloat(amount) <= 0) { setQuote(null); return }
    setQuoteLoading(true)
    setError(null)
    try {
      const amountMinimal = Math.round(parseFloat(amount) * 1e6)
      const res = await fetch(`/api/swap?amount=${amountMinimal}&toToken=${toToken}`)
      const data = await res.json()
      if (data.error) setError(data.msg || data.error)
      else setQuote(data)
    } catch {
      setError('Failed to fetch quote')
    } finally {
      setQuoteLoading(false)
    }
  }, [amount, toToken])

  useEffect(() => {
    const timer = setTimeout(fetchQuote, 600)
    return () => clearTimeout(timer)
  }, [fetchQuote])

  const handleSwap = async () => {
    if (!address || !amount || !quote) return
    setSwapping(true)
    setError(null)
    setTxHash(null)

    try {
      const provider = (window as any).okxwallet || (window as any).ethereum
      const amountMinimal = Math.round(parseFloat(amount) * 1e6)

      // Step 1: Get swap calldata
      const swapRes = await fetch('/api/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amountMinimal, toToken, walletAddress: address, slippage: '1' }),
      })
      const swapData = await swapRes.json()
      if (swapData.error) throw new Error(swapData.msg || swapData.error)
      const tx = swapData.tx
      if (!tx) throw new Error('No transaction data returned')

      // Step 2: Approve USDC using spender from API
      const spender = (swapData.spenderAddress || tx.to) as `0x${string}`
      const approveTx = await provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: address,
          to: USDC_CONTRACT,
          data: encodeFunctionData({
            abi: USDC_ABI,
            functionName: 'approve',
            args: [spender, BigInt(amountMinimal)],
          }),
        }],
      })
      await publicClient.waitForTransactionReceipt({ hash: approveTx })

      // Step 3: Execute swap
      const swapTx = await provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: address,
          to: tx.to,
          data: tx.data,
          value: tx.value || '0x0',
          gas: tx.gas ? `0x${parseInt(tx.gas).toString(16)}` : undefined,
        }],
      })
      await publicClient.waitForTransactionReceipt({ hash: swapTx })
      setTxHash(swapTx)
      setAmount('')
      setQuote(null)

      // Refresh balance
      publicClient.readContract({ address: USDC_ADDRESS, abi: USDC_ABI, functionName: 'balanceOf', args: [address as `0x${string}`] })
        .then((bal: any) => setUsdcBalance(parseFloat(formatUnits(bal, 6)).toFixed(4)))
        .catch(() => { })

    } catch (err: any) {
      setError(err.message || 'Swap failed')
    } finally {
      setSwapping(false)
    }
  }

  const hasRoute = quote?.route?.toLowerCase().includes('uniswap')

  return (
    <div className="card">
      <div className="panel-header">
        <span className="panel-title">Swap USDC — OKX DEX · Uniswap on X Layer</span>
        <span className="tag tag-open">LIVE</span>
      </div>
      <div style={{ padding: isMobile ? 14 : 20, display: 'flex', flexDirection: 'column', gap: 14 }}>

        {!address ? (
          <div style={{ fontSize: 12, color: '#555', fontFamily: 'var(--mono)' }}>Connect wallet to swap</div>
        ) : (
          <>
            {/* Balance */}
            <div style={{ fontSize: 10, color: '#444', fontFamily: 'var(--mono)' }}>
              USDC balance: <span style={{ color: '#777' }}>{usdcBalance} USDC</span>
              <button style={{ marginLeft: 8, fontSize: 9, color: '#22c55e', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--mono)' }}
                onClick={() => setAmount(usdcBalance)}>
                MAX
              </button>
            </div>

            {/* Input row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 10, alignItems: 'center' }}>
              <div style={{ background: '#050505', border: '1px solid #1a1a1a', borderRadius: 4, padding: '10px 14px' }}>
                <div style={{ fontSize: 9, color: '#444', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>From</div>
                <input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  style={{ width: '100%', background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: 16, fontWeight: 600, fontFamily: 'var(--mono)' }}
                />
                <div style={{ fontSize: 10, color: '#555', marginTop: 4 }}>USDC</div>
              </div>

              <div style={{ fontSize: 18, color: '#333', textAlign: 'center' }}>→</div>

              <div style={{ background: '#050505', border: '1px solid #1a1a1a', borderRadius: 4, padding: '10px 14px' }}>
                <div style={{ fontSize: 9, color: '#444', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>To</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#22c55e', minHeight: 24 }}>
                  {quoteLoading ? '...' : quote ? quote.toAmount.toFixed(6) : '0.000000'}
                </div>
                <select
                  value={toToken}
                  onChange={e => setToToken(e.target.value)}
                  style={{ background: 'none', border: 'none', outline: 'none', color: '#555', fontSize: 10, fontFamily: 'var(--mono)', cursor: 'pointer', marginTop: 4 }}
                >
                  {TOKENS.map(t => <option key={t} value={t} style={{ background: '#111' }}>{t}</option>)}
                </select>
              </div>
            </div>

            {/* Quote details */}
            {quote && !quoteLoading && (
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <div>
                  <span style={{ fontSize: 9, color: '#444', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: 1 }}>Route</span>
                  <div style={{ fontSize: 10, color: hasRoute ? '#22c55e' : '#818cf8', fontFamily: 'var(--mono)', marginTop: 2 }}>
                    {quote.route}
                    {hasRoute && <span style={{ color: '#22c55e', marginLeft: 4 }}>✓ Uniswap</span>}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: 9, color: '#444', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: 1 }}>Price impact</span>
                  <div style={{ fontSize: 10, color: '#555', fontFamily: 'var(--mono)', marginTop: 2 }}>{quote.priceImpact}%</div>
                </div>
                <div>
                  <span style={{ fontSize: 9, color: '#444', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: 1 }}>Slippage</span>
                  <div style={{ fontSize: 10, color: '#555', fontFamily: 'var(--mono)', marginTop: 2 }}>1%</div>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div style={{ fontSize: 11, color: '#cc4444', fontFamily: 'var(--mono)' }}>{error}</div>
            )}

            {/* Success */}
            {txHash && (
              <div style={{ fontSize: 11, color: '#22c55e', fontFamily: 'var(--mono)' }}>
                ✓ Swap complete!{' '}
                <a href={`https://web3.okx.com/explorer/x-layer/tx/${txHash}`} target="_blank" rel="noopener noreferrer" style={{ color: '#22c55e' }}>
                  View tx →
                </a>
              </div>
            )}

            {/* Swap button */}
            <button
              className="btn-primary"
              style={{ opacity: swapping || !amount || !quote ? 0.5 : 1, width: isMobile ? '100%' : 'auto', alignSelf: 'flex-start' }}
              onClick={handleSwap}
              disabled={swapping || !amount || !quote || quoteLoading}
            >
              {swapping ? 'Swapping...' : `Swap ${amount || '0'} USDC → ${toToken}`}
            </button>

            <div style={{ fontSize: 9, color: '#333', fontFamily: 'var(--mono)' }}>
              Powered by OKX DEX aggregator · Uniswap liquidity on X Layer · Zero gas fees
            </div>
          </>
        )}
      </div>
    </div>
  )
}
