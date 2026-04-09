'use client'
import { useEffect, useState } from 'react'

type Job = { id: string; title: string; tags: string[]; status: 'OPEN' | 'LIVE' | 'REVIEW' | 'DONE'; reward: number; poster: string; agent?: string }
type Transaction = { id: number; job_id: number; tx_hash: string; type: string; from_address: string; amount: number; created_at: string }

export default function DashboardPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [address, setAddress] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [marketIntel, setMarketIntel] = useState<any>(null)
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
    Promise.all([
      fetch('/api/jobs').then(r => r.json()),
      fetch('/api/transactions').then(r => r.json()),
    ]).then(([jobData, txData]) => {
      setJobs(jobData.jobs || [])
      setTransactions(txData.transactions || [])
    }).catch(() => { }).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetch('/api/market-intel')
      .then(r => r.json())
      .then(data => setMarketIntel(data))
      .catch(() => { })
  }, [])

  const completed = jobs.filter(j => j.status === 'DONE')
  const active = jobs.filter(j => j.status === 'LIVE' || j.status === 'REVIEW')
  const open = jobs.filter(j => j.status === 'OPEN')
  const totalEarned = transactions.filter(t => t.type === 'payment_released').reduce((sum, t) => sum + (t.amount || 0), 0)

  const timeAgo = (dateStr: string) => {
    const utcStr = dateStr.endsWith('Z') ? dateStr : dateStr + 'Z'
    const diff = Date.now() - new Date(utcStr).getTime()
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    if (hours > 0) return `${hours}h ago`
    return `${mins}m ago`
  }

  const getTxDesc = (tx: Transaction) => {
    switch (tx.type) {
      case 'accept': return 'accepted a job'
      case 'submit_result': return 'submitted result'
      case 'payment_released': return 'payment released'
      default: return tx.type
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="section-label">// I / 01 <span>Overview / Dashboard</span></div>

      {/* KPI Cards */}
      <div className="grid-divider" style={{ gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)' }}>        <div className="kpi">
        <div className="kpi-value">${totalEarned.toFixed(2)}</div>
        <div className="kpi-label">Total released</div>
        <div className="kpi-delta up">x402 payments</div>
      </div>
        <div className="kpi">
          <div className="kpi-value">{completed.length}</div>
          <div className="kpi-label">Completed</div>
          <div className={`kpi-delta ${completed.length > 0 ? 'up' : 'mute'}`}>{completed.length > 0 ? `${completed.length} done` : 'None yet'}</div>
        </div>
        <div className="kpi">
          <div className="kpi-value">{active.length}</div>
          <div className="kpi-label">Active</div>
          <div className="kpi-delta mute">{open.length} open</div>
        </div>
        <div className="kpi">
          <div className="kpi-value">{transactions.length}</div>
          <div className="kpi-label">x402 txns</div>
          <div className="kpi-delta up">Verified onchain</div>
        </div>
      </div>

      {/* Open Jobs + Live Feed */}
      <div style={{ display: isMobile ? 'flex' : 'grid', flexDirection: 'column', gridTemplateColumns: '1fr 1fr', gap: 1, background: '#111', border: '1px solid #111', borderRadius: 8, overflow: 'hidden' }}>
        {/* Open Jobs */}
        <div style={{ background: '#000' }}>
          <div className="panel-header">
            <span className="panel-title">Open jobs</span>
            <a href="/browse" className="panel-link" style={{ textDecoration: 'none' }}>View all →</a>
          </div>
          {loading ? (
            <div style={{ padding: 24, color: '#555', fontSize: 13, fontFamily: 'var(--mono)' }}>Loading...</div>
          ) : open.length === 0 ? (
            <div style={{ padding: 24, color: '#555', fontSize: 13, fontFamily: 'var(--mono)' }}>No open jobs yet</div>
          ) : open.slice(0, 4).map(job => (
            <a key={job.id} href={`/browse/${job.id}`} style={{ textDecoration: 'none' }}>
              <div className="row">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: '#ccc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.title}</div>
                  <div className="mono-sm" style={{ marginTop: 2, fontSize: 9, color: '#5c5c5c' }}>{job.tags.slice(0, 2).join(' · ')}</div>          </div>
                <span className="tag tag-open">OPEN</span>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', flexShrink: 0 }}>{job.reward} USDC</div>
              </div>
            </a>
          ))}
        </div>

        {/* Live Feed */}
        <div style={{ background: '#000', borderTop: isMobile ? '1px solid #111' : 'none', borderLeft: isMobile ? 'none' : '1px solid #111' }}>
          <div className="panel-header">
            <span className="panel-title">Live feed</span>
            <a href="/payments" className="panel-link" style={{ textDecoration: 'none' }}>All txns →</a>
          </div>
          {loading ? (
            <div style={{ padding: 24, color: '#555', fontSize: 13, fontFamily: 'var(--mono)' }}>Loading...</div>
          ) : transactions.length === 0 ? (
            <div style={{ padding: 24, color: '#555', fontSize: 13, fontFamily: 'var(--mono)' }}>No transactions yet</div>
          ) : transactions.slice(0, 4).map(tx => (
            <div key={tx.id} className="row">
              <div className={`icon-box ${tx.type === 'payment_released' ? 'icon-box-green' : tx.type === 'accept' ? 'icon-box-grey' : 'icon-box-blue'}`}>
                {tx.type === 'payment_released' && <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M2.5 7L5.5 10L11.5 4" stroke="#22c55e" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                {tx.type === 'accept' && <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M2.5 7H11.5M8.5 4L11.5 7L8.5 10" stroke="#666" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                {tx.type === 'submit_result' && <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><circle cx="5" cy="5" r="2" stroke="#5a5a9a" strokeWidth="1.2" /><circle cx="9" cy="9" r="2" stroke="#5a5a9a" strokeWidth="1.2" /></svg>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: '#aaa' }}>
                  <b style={{ color: '#ddd', fontWeight: 500 }}>{tx.from_address?.slice(0, 6)}...{tx.from_address?.slice(-4)}</b> {getTxDesc(tx)}
                </div>
                <div className="mono-sm" style={{ marginTop: 2, color: '#5c5c5c' }}>{tx.tx_hash?.slice(0, 16)}... · <span style={{ color: '#444' }}>{timeAgo(tx.created_at)}</span></div>
              </div>
              {tx.amount > 0 && <div style={{ fontSize: 12, fontWeight: 600, color: '#22c55e', whiteSpace: 'nowrap', flexShrink: 0 }}>${tx.amount}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="section-label">
          // II / 01 <span>Recent Activity</span>
          <span style={{ display: 'inline-block', width: 2, height: 14, background: '#777', marginLeft: 4, animation: 'cornerblink 1s ease-in-out infinite', verticalAlign: 'middle', borderRadius: 1 }} />
        </div>
        <div className="card">
          {loading ? (
            <div style={{ padding: 24, color: '#555', fontSize: 13, fontFamily: 'var(--mono)' }}>Loading...</div>
          ) : transactions.length === 0 ? (
            <div style={{ padding: 24, color: '#555', fontSize: 13, fontFamily: 'var(--mono)' }}>No activity yet — post or accept a job to get started</div>
          ) : transactions.slice(0, 5).map((tx, i) => (
            <div key={tx.id} style={{ padding: '12px 16px', borderBottom: i < transactions.length - 1 ? '1px solid #0d0d0d' : 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <div style={{ fontSize: 12, color: '#bbb' }}>
                  {tx.from_address?.slice(0, 6)}...{tx.from_address?.slice(-4)} · {getTxDesc(tx)}
                </div>
                {tx.amount > 0 && <div style={{ fontSize: 11, color: '#22c55e', fontWeight: 600, flexShrink: 0 }}>${tx.amount} USDC</div>}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span className="mono-sm" style={{ color: '#333' }}>{tx.tx_hash?.slice(0, 16)}...</span>
                <span className="mono-sm" style={{ color: '#333' }}>·</span>
                <span className="mono-sm" style={{ color: '#444' }}>{timeAgo(tx.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Market Intelligence */}
      {marketIntel && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="section-label">// III / 01 <span>X Layer Market Intelligence</span></div>
          <div className="card">
            <div className="panel-header">
              <span className="panel-title">Live market data — OnchainOS</span>
              <span className="tag tag-open">LIVE</span>
            </div>
            <div style={{ padding: isMobile ? 14 : 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3,1fr)', gap: 10 }}>
                <div style={{ background: '#050505', border: '1px solid #1a1a1a', borderRadius: 4, padding: '12px 14px' }}>
                  <div style={{ fontSize: 9, color: '#444', fontFamily: 'var(--mono)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>OKB Price</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>${marketIntel.okb?.price}</div>
                  <div style={{ fontSize: 11, color: marketIntel.okb?.change?.startsWith('+') ? '#22c55e' : '#cc4444', marginTop: 4, fontFamily: 'var(--mono)' }}>{marketIntel.okb?.change}</div>
                </div>
                <div style={{ background: '#050505', border: '1px solid #1a1a1a', borderRadius: 4, padding: '12px 14px' }}>
                  <div style={{ fontSize: 9, color: '#444', fontFamily: 'var(--mono)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>24h Volume</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{marketIntel.okb?.volume}</div>
                  <div style={{ fontSize: 11, color: '#555', marginTop: 4, fontFamily: 'var(--mono)' }}>OKB traded</div>
                </div>
                <div style={{ background: '#050505', border: '1px solid #1a1a1a', borderRadius: 4, padding: '12px 14px' }}>
                  <div style={{ fontSize: 9, color: '#444', fontFamily: 'var(--mono)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>Network</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#22c55e' }}>X Layer</div>
                  <div style={{ fontSize: 11, color: '#555', marginTop: 4, fontFamily: 'var(--mono)' }}>Chain ID 196</div>
                </div>
              </div>
              <div style={{ fontSize: 10, color: '#333', fontFamily: 'var(--mono)' }}>
                Powered by OnchainOS Market API · okx-dex-market skill · Data informs agent job decisions
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
