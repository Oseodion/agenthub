'use client'
import { useState, useEffect } from 'react'

type Transaction = {
  id: number
  job_id: number
  tx_hash: string
  type: string
  from_address: string
  to_address: string
  amount: number
  block_number: string
  created_at: string
}

export default function PaymentsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [address, setAddress] = useState<string | null>(null)
  const [stats, setStats] = useState({ total: 0, count: 0 })
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    const provider = (window as any).okxwallet || (window as any).ethereum
    if (!provider) return
    provider.request({ method: 'eth_accounts' })
      .then((accounts: string[]) => { if (accounts.length > 0) setAddress(accounts[0]) })
      .catch(() => { })
  }, [])

  useEffect(() => {
    const url = address ? `/api/transactions?address=${address}` : '/api/transactions'
    fetch(url)
      .then(r => r.json())
      .then(data => {
        const txs = data.transactions || []
        setTransactions(txs)
        const totalVolume = txs.reduce((sum: number, tx: Transaction) => sum + (tx.amount || 0), 0)
        setStats({ total: totalVolume, count: txs.length })
      })
      .catch(() => { })
      .finally(() => setLoading(false))
  }, [address])

  const getTxTypeLabel = (type: string) => {
    switch (type) {
      case 'accept': return 'Job accepted'
      case 'submit_result': return 'Result submitted'
      case 'payment_released': return 'Payment released'
      default: return type
    }
  }

  const getTxIcon = (type: string) => {
    if (type === 'payment_released') return (
      <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
        <path d="M2.5 7L5.5 10L11.5 4" stroke="#22c55e" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
    if (type === 'accept') return (
      <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
        <path d="M2.5 7H11.5M8.5 4L11.5 7L8.5 10" stroke="#666" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
    return (
      <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
        <circle cx="5" cy="5" r="2" stroke="#818cf8" strokeWidth="1.2" />
        <circle cx="9" cy="9" r="2" stroke="#818cf8" strokeWidth="1.2" />
      </svg>
    )
  }

  const timeAgo = (dateStr: string) => {
    const utcStr = dateStr.endsWith('Z') ? dateStr : dateStr + 'Z'
    const diff = Date.now() - new Date(utcStr).getTime()
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    return `${mins}m ago`
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="section-label">// IV / 01 <span>Payments / x402 History</span></div>

      {/* Stats */}
      <div className="grid-divider" style={{ gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(3,1fr)' }}>
        <div className="kpi">
          <div className="kpi-value">${stats.total.toFixed(2)}</div>
          <div className="kpi-label">Total volume</div>
          <div className="kpi-delta up">x402 protocol</div>
        </div>
        <div className="kpi" style={{ borderLeft: '1px solid #111' }}>
          <div className="kpi-value">{stats.count}</div>
          <div className="kpi-label">Transactions</div>
          <div className="kpi-delta up">All verified</div>
        </div>
        <div className="kpi" style={{ borderLeft: '1px solid #111' }}>
          <div className="kpi-value">$0.001</div>
          <div className="kpi-label">Avg gas fee</div>
          <div className="kpi-delta up">X Layer</div>
        </div>
      </div>

      {/* Transaction list */}
      <div className="card">
        <div className="panel-header">
          <span className="panel-title">Transaction history</span>
          <a href={`https://web3.okx.com/explorer/x-layer/address/${address || ''}`}
            target="_blank" rel="noopener noreferrer"
            className="panel-link" style={{ textDecoration: 'none' }}>
            Explorer →
          </a>
        </div>

        {loading ? (
          <div style={{ padding: 24, color: '#555', fontSize: 13, fontFamily: 'var(--mono)' }}>Loading...</div>
        ) : transactions.length === 0 ? (
          <div style={{ padding: 24, color: '#555', fontSize: 13, fontFamily: 'var(--mono)' }}>No transactions yet.</div>
        ) : transactions.map((tx, i) => (
          <div key={tx.id} style={{
            padding: isMobile ? '14px' : '14px 18px',
            borderBottom: i === transactions.length - 1 ? 'none' : '1px solid #0d0d0d',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}>
            {/* Row 1: icon + label + amount */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className={`icon-box ${tx.type === 'payment_released' ? 'icon-box-green' : tx.type === 'accept' ? 'icon-box-grey' : 'icon-box-blue'}`}>
                {getTxIcon(tx.type)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 13, color: '#ccc' }}>{getTxTypeLabel(tx.type)}</span>
              </div>
              {tx.amount > 0 && (
                <div style={{ fontSize: 13, fontWeight: 600, color: '#22c55e', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  +{tx.amount} USDC
                </div>
              )}
            </div>

            {/* Row 2: hash + time + confirmed + view */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 42, flexWrap: 'wrap' }}>
              <span className="mono-sm" style={{ color: '#444' }}>
                {tx.tx_hash?.slice(0, isMobile ? 14 : 20)}...
              </span>
              <span className="mono-sm" style={{ color: '#333' }}>·</span>
              <span className="mono-sm" style={{ color: '#444' }}>{timeAgo(tx.created_at)}</span>
              <span className="mono-sm" style={{ color: '#333' }}>·</span>
              <span className="tag-confirmed">CONFIRMED</span>
              <a href={`https://web3.okx.com/explorer/x-layer/tx/${tx.tx_hash}`}
                target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 10, color: '#22c55e', textDecoration: 'none', fontFamily: 'var(--mono)', marginLeft: 'auto' }}>
                View →
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
