'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useWallet } from '@/lib/useWallet'
import { parseUnits, encodeFunctionData } from 'viem'
import { publicClient, ESCROW_ABI, USDC_ABI, CONTRACT_ADDRESS, USDC_ADDRESS } from '@/lib/web3'

const NAV_ITEMS = [
  { label: 'Overview', href: '/' },
  { label: 'Browse', href: '/browse' },
  { label: 'My agent', href: '/agent' },
  { label: 'Payments', href: '/payments' },
  { label: 'MCP', href: '/mcp' },
]

export default function Header() {
  const pathname = usePathname()
  const { address, connecting, connect, disconnect } = useWallet()
  const [showDropdown, setShowDropdown] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [block, setBlock] = useState('...')
  const [agentsOnline, setAgentsOnline] = useState(0)
  const [activeJobs, setActiveJobs] = useState(0)
  const [okbPrice, setOkbPrice] = useState('--')
  const [postOpen, setPostOpen] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', reward: '', tags: '' })
  const [posting, setPosting] = useState(false)
  const [posted, setPosted] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const fetchBlock = async () => {
    try {
      const res = await fetch('/api/block')
      const data = await res.json()
      if (data.block) setBlock(data.block.toLocaleString())
    } catch {
      setBlock(prev => {
        const n = parseInt(prev.replace(/,/g, '')) || 8841209
        return (n + 2).toLocaleString()
      })
    }
  }

  const fetchOkbPrice = async () => {
    try {
      const res = await fetch('/api/market')
      const data = await res.json()
      if (data.price && data.price !== '--') setOkbPrice(`$${data.price}`)
    } catch { }
  }

  useEffect(() => {
    fetchBlock()
    fetchOkbPrice()
    const id = setInterval(() => { fetchBlock(); fetchOkbPrice() }, 30000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    fetch('/api/jobs').then(r => r.json()).then(d => {
      const jobs = d.jobs || []
      setActiveJobs(jobs.filter((j: any) => j.status === 'OPEN' || j.status === 'LIVE').length)
      const agents = new Set([
        ...jobs.filter((j: any) => j.agent).map((j: any) => j.agent.toLowerCase()),
        ...jobs.map((j: any) => j.poster.toLowerCase())
      ])
      setAgentsOnline(agents.size)
    }).catch(() => { })
  }, [])

  const handlePost = async () => {
    if (!form.title || !form.reward) return
    if (!address) { alert('Please connect your wallet first'); return }
    setPosting(true)
    try {
      const provider = (window as any).okxwallet || (window as any).ethereum
      // Security check
      try {
        const secRes = await fetch(`/api/security?address=${address}`)
        const secData = await secRes.json()
        if (secData.riskLevel === 'high' || secData.riskLevel === 'severe') {
          alert('⚠️ Your wallet has been flagged as high risk by OnchainOS Security.')
          setPosting(false)
          return
        }
      } catch { }

      const rewardAmount = parseUnits(form.reward, 6)
      const approveTx = await provider.request({
        method: 'eth_sendTransaction',
        params: [{ from: address, to: USDC_ADDRESS, data: encodeFunctionData({ abi: USDC_ABI, functionName: 'approve', args: [CONTRACT_ADDRESS, rewardAmount] }) }],
      })
      await publicClient.waitForTransactionReceipt({ hash: approveTx })
      const postTx = await provider.request({
        method: 'eth_sendTransaction',
        params: [{ from: address, to: CONTRACT_ADDRESS, data: encodeFunctionData({ abi: ESCROW_ABI, functionName: 'postJob', args: [form.title, rewardAmount] }) }],
      })
      await publicClient.waitForTransactionReceipt({ hash: postTx })
      let contractJobId = '0'
      try {
        const count = await publicClient.readContract({ address: CONTRACT_ADDRESS, abi: ESCROW_ABI, functionName: 'getJobCount' })
        contractJobId = String(count)
      } catch { }
      await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title, description: form.description, reward: form.reward,
          tags: form.tags.split(',').map((t: string) => t.trim().toUpperCase()).filter(Boolean),
          poster: address, txHash: postTx, contractJobId,
        }),
      })
      setPosted(true)
      setTimeout(() => { setPostOpen(false); setPosted(false); setForm({ title: '', description: '', reward: '', tags: '' }) }, 1500)
    } catch (err: any) {
      alert(err.message || 'Failed to post job')
    } finally {
      setPosting(false)
    }
  }

  return (
    <div style={{ background: '#000', borderBottom: '1px solid #1a1a1a', position: 'sticky', top: 0, zIndex: 100 }}>

      {/* HEADER */}
      <div style={{ position: 'relative', height: isMobile ? '56px' : '72px', borderBottom: '1px solid #1a1a1a' }}>
        <div className="dot-grid" style={{ position: 'absolute', inset: 0, zIndex: 0 }} />
        <div style={{ position: 'relative', zIndex: 200, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isMobile ? '0 14px' : '0 26px' }}>

          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 18, textDecoration: 'none' }}>
            <div style={{ width: isMobile ? 28 : 36, height: isMobile ? 28 : 36, border: '1px solid #222', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 22 22" fill="none">
                <path d="M8 2L14 2L17 7L14 12L8 12L5 7Z" stroke="#444" strokeWidth="1" fill="none" />
                <path d="M10 10L16 10L19 15L16 20L10 20L7 15Z" stroke="#888" strokeWidth="1" fill="none" />
                <circle cx="12" cy="13" r="2" fill="#fff" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: isMobile ? 14 : 17, fontWeight: 700, color: '#fff', letterSpacing: '-.6px', lineHeight: 1 }}>AgentHub</div>
              {!isMobile && <div className="mono" style={{ fontSize: 9, color: '#555', letterSpacing: '1.2px', textTransform: 'uppercase', marginTop: 8 }}>// X Layer · OnchainOS</div>}
            </div>
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 9, position: 'relative', zIndex: 300 }}>
            {!isMobile && <div className="pill">CHAIN 196</div>}
            {address ? (
              <>
                <div style={{ position: 'relative' }}>
                  <div className="pill" style={{ color:'#999', cursor:'pointer', userSelect:'none', fontSize: isMobile ? 10 : 11, padding: isMobile ? '7px 12px' : '9px 22px', fontWeight:700, background:'#000', border:'1px solid #222', borderRadius:4, fontFamily:'var(--mono)', letterSpacing:'.5px', whiteSpace:'nowrap' }} onClick={() => setShowDropdown(p => !p)}>
                    {address.slice(0, 4)}…{address.slice(-3)} ▾
                  </div>
                  {showDropdown && (
                    <div style={{ position: 'fixed', top: isMobile ? 'auto' : undefined, right: isMobile ? '14px' : undefined, marginTop: 8, background: '#0d0d0d', border: '1px solid #1a1a1a', borderRadius: 6, padding: '4px 0', minWidth: 200, zIndex: 9999, boxShadow: '0 8px 32px rgba(0,0,0,.8)' }} onClick={e => e.stopPropagation()}>
                      <div style={{ padding: '8px 16px', fontSize: 11, color: '#555', fontFamily: 'var(--mono)', borderBottom: '1px solid #111', wordBreak: 'break-all' }}>{address}</div>
                      <div style={{ padding: '10px 16px', fontSize: 12, color: '#aaa', cursor: 'pointer' }} onClick={() => { window.open(`https://web3.okx.com/explorer/x-layer/address/${address}`, '_blank'); setShowDropdown(false) }}>View on explorer →</div>
                      <div style={{ padding: '10px 16px', fontSize: 12, color: '#cc4444', cursor: 'pointer', borderTop: '1px solid #111' }} onClick={() => { disconnect(); setShowDropdown(false) }}>Disconnect wallet</div>
                    </div>
                  )}
                </div>
                <button className="btn-primary" onClick={() => setPostOpen(true)} style={{ fontSize: isMobile ? 10 : 11, padding: isMobile ? '7px 12px' : '9px 22px' }}>
                  {isMobile ? '+ Post' : '+ Post job'}
                </button>
              </>
            ) : (
              <button className="btn-primary" onClick={connect} disabled={connecting} style={{ fontSize: isMobile ? 10 : 11, padding: isMobile ? '7px 12px' : '9px 22px' }}>
                {connecting ? '...' : isMobile ? 'Connect' : 'Connect wallet'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* NAV */}
      <div style={{ background: '#000', borderBottom: '1px solid #1a1a1a', padding: isMobile ? '0 14px' : '0 26px', display: 'flex', height: 44, overflowX: 'auto', scrollbarWidth: 'none' }}>
        {NAV_ITEMS.map(item => {
          const active = pathname === item.href
          return (
            <Link key={item.href} href={item.href} style={{
              fontSize: isMobile ? 11 : 12,
              color: active ? '#fff' : '#777',
              padding: isMobile ? '0 12px' : '0 16px',
              display: 'flex', alignItems: 'center',
              borderBottom: active ? '2px solid #fff' : '2px solid transparent',
              fontWeight: active ? 500 : 400,
              textDecoration: 'none', whiteSpace: 'nowrap', transition: 'color .15s', flexShrink: 0,
            }}>
              {item.label}
            </Link>
          )
        })}
      </div>

      {/* INFO STRIP — hidden on mobile */}
      {!isMobile && (
        <div style={{ background: '#000', borderBottom: '1px solid #1a1a1a', padding: '0 26px', height: 36, display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingRight: 20, borderRight: '1px solid #1a1a1a', flexShrink: 0 }}>
            <div className="live-blink" style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
            <span className="mono" style={{ fontSize: 10, color: '#666', whiteSpace: 'nowrap' }}>X Layer mainnet</span>
          </div>
          <StripItem label="Block" value={`#${block}`} />
          <StripItem label="Gas" value="~0.000012 OKB" />
          <StripItem label="OKB" value={okbPrice} />
          <StripItem label="x402 active" value={`${activeJobs} jobs`} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 20, flexShrink: 0 }}>
            <span className="mono" style={{ fontSize: 10, color: '#555', whiteSpace: 'nowrap' }}>Agents online</span>
            <span className="mono" style={{ fontSize: 10, color: '#777', whiteSpace: 'nowrap', fontWeight: 500 }}>{agentsOnline}</span>
          </div>
        </div>
      )}

      {/* POST JOB MODAL */}
      {postOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.88)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '16px' : '0' }} onClick={() => setPostOpen(false)}>
          <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 8, padding: isMobile ? '20px' : '32px', width: '100%', maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="section-label" style={{ marginBottom: 24, color: '#777' }}>// POST JOB <span style={{ color: '#666' }}>New task for agents</span></div>
            {posted ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 13, color: '#22c55e', fontFamily: 'var(--mono)' }}>✓ Job posted successfully</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label className="input-label">Job title</label>
                  <input className="input-field" placeholder="e.g. Analyze DeFi yield pools" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                </div>
                <div>
                  <label className="input-label">Description</label>
                  <textarea className="input-field" placeholder="What should the agent do?" rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={{ resize: 'none' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="input-label">Reward (USDC)</label>
                    <input className="input-field" placeholder="e.g. 0.1" type="number" min="0.01" value={form.reward} onChange={e => setForm(f => ({ ...f, reward: e.target.value }))} />
                  </div>
                  <div>
                    <label className="input-label">Tags</label>
                    <input className="input-field" placeholder="DEX, MARKET" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 8, justifyContent: 'flex-end' }}>
                  <button className="btn-secondary" onClick={() => setPostOpen(false)}>Cancel</button>
                  <button className="btn-primary" onClick={handlePost} disabled={posting} style={{ opacity: posting ? .6 : 1 }}>
                    {posting ? 'Posting...' : 'Post job'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function StripItem({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 20px', borderRight: '1px solid #1a1a1a', flexShrink: 0 }}>
      <span className="mono" style={{ fontSize: 10, color: '#555', whiteSpace: 'nowrap' }}>{label}</span>
      <span className="mono" style={{ fontSize: 10, color: '#777', whiteSpace: 'nowrap', fontWeight: 500 }}>{value}</span>
    </div>
  )
}
