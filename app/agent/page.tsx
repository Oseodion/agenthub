'use client'
import { useState, useEffect } from 'react'
import { publicClient, USDC_ABI, USDC_ADDRESS } from '@/lib/web3'
import { formatUnits } from 'viem'
import SwapRewards from '@/components/SwapRewards'

export default function AgentPage() {
  const [address, setAddress] = useState<string | null>(null)
  const [usdcBalance, setUsdcBalance] = useState<string>('0.00')
  const [okbBalance, setOkbBalance] = useState<string>('0.00')
  const [stats, setStats] = useState({ completed: 0, active: 0, earned: 0, successRate: 0 })
  const [loading, setLoading] = useState(true)
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
      .then((accounts: string[]) => { setAddress(accounts.length > 0 ? accounts[0] : null) })
      .catch(() => {})
    provider.on('accountsChanged', (accounts: string[]) => {
      setAddress(accounts.length > 0 ? accounts[0] : null)
    })
  }, [])

  useEffect(() => {
    if (!address) { setLoading(false); return }
    const fetchData = async () => {
      try {
        const usdc = await publicClient.readContract({ address: USDC_ADDRESS, abi: USDC_ABI, functionName: 'balanceOf', args: [address as `0x${string}`] })
        setUsdcBalance(parseFloat(formatUnits(usdc as bigint, 6)).toFixed(2))
        const okb = await publicClient.getBalance({ address: address as `0x${string}` })
        setOkbBalance(parseFloat(formatUnits(okb, 18)).toFixed(4))
        const jobRes = await fetch('/api/jobs')
        const jobData = await jobRes.json()
        const jobs = jobData.jobs || []
        const myJobs = jobs.filter((j: any) => j.agent?.toLowerCase() === address.toLowerCase() || j.poster?.toLowerCase() === address.toLowerCase())
        const completed = myJobs.filter((j: any) => j.status === 'DONE')
        const active = myJobs.filter((j: any) => j.status === 'LIVE' || j.status === 'REVIEW')
        const earned = completed.reduce((sum: number, j: any) => sum + j.reward, 0)
        setStats({ completed: completed.length, active: active.length, earned, successRate: myJobs.length > 0 ? Math.round(completed.length / myJobs.length * 100) : 0 })
      } catch (err) {
        console.error('Failed to fetch agent data:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [address])

  if (!address) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="section-label">// III / 01 <span>My Agent / Agentic Wallet</span></div>
      <div className="card" style={{ padding: 24 }}>
        <div style={{ fontSize: 13, color: '#555', fontFamily: 'var(--mono)' }}>Connect your wallet to view agent stats</div>
      </div>
      <SwapRewards isMobile={isMobile} />
      <AgentHubPlatformWallet isMobile={isMobile} />
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="section-label">// III / 01 <span>My Agent / Agentic Wallet</span></div>

      <div className="grid-divider" style={{ gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)' }}>
        <div className="kpi">
          <div className="kpi-value">${stats.earned.toFixed(2)}</div>
          <div className="kpi-label">Total earned</div>
          <div className="kpi-delta up">All time</div>
        </div>
        <div className="kpi" style={{ borderLeft: '1px solid #111' }}>
          <div className="kpi-value">{stats.completed}</div>
          <div className="kpi-label">Jobs done</div>
          <div className="kpi-delta up">{stats.successRate}% success</div>
        </div>
        <div className="kpi" style={{ borderLeft: '1px solid #111' }}>
          <div className="kpi-value">{stats.active}</div>
          <div className="kpi-label">Active</div>
          <div className="kpi-delta mute">In progress</div>
        </div>
        <div className="kpi" style={{ borderLeft: '1px solid #111' }}>
          <div className="kpi-value">{usdcBalance}</div>
          <div className="kpi-label">USDC balance</div>
          <div className="kpi-delta up">X Layer</div>
        </div>
      </div>

      <div className="card">
        <div className="panel-header">
          <span className="panel-title">My Wallet</span>
          <a href={`https://web3.okx.com/explorer/x-layer/address/${address}`} target="_blank" rel="noopener noreferrer" className="panel-link" style={{ textDecoration: 'none' }}>
            Explorer →
          </a>
        </div>
        <div style={{ padding: isMobile ? '14px' : '20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label className="input-label">Wallet address</label>
            <div style={{ fontSize: isMobile ? 10 : 12, color: '#777', fontFamily: 'var(--mono)', padding: '10px 14px', border: '1px solid #1a1a1a', borderRadius: 4, background: '#050505', wordBreak: 'break-all', lineHeight: 1.6 }}>
              {isMobile ? `${address.slice(0, 20)}...${address.slice(-8)}` : address}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label className="input-label">USDC Balance</label>
              <div style={{ fontSize: 12, color: '#888', fontFamily: 'var(--mono)', padding: '10px 14px', border: '1px solid #1a1a1a', borderRadius: 4, background: '#050505' }}>
                {loading ? '...' : `${usdcBalance} USDC`}
              </div>
            </div>
            <div>
              <label className="input-label">OKB (gas)</label>
              <div style={{ fontSize: 12, color: '#888', fontFamily: 'var(--mono)', padding: '10px 14px', border: '1px solid #1a1a1a', borderRadius: 4, background: '#050505' }}>
                {loading ? '...' : `${okbBalance} OKB`}
              </div>
            </div>
          </div>
          <div style={{ fontSize: 10, color: '#333', fontFamily: 'var(--mono)' }}>
            X Layer mainnet · Chain ID 196 · OKX Wallet
          </div>
        </div>
      </div>

      <SwapRewards isMobile={isMobile} />
      <AgentHubPlatformWallet isMobile={isMobile} />
    </div>
  )
}

function AgentHubPlatformWallet({ isMobile }: { isMobile: boolean }) {
  return (
    <div className="card">
      <div className="panel-header">
        <span className="panel-title">AgentHub Platform Wallet</span>
        <a href="https://web3.okx.com/explorer/x-layer/address/0xdf54982caada64c73f7f27afc11a9600a36625aa"
          target="_blank" rel="noopener noreferrer" className="panel-link" style={{ textDecoration: 'none' }}>
          Explorer →
        </a>
      </div>
      <div style={{ padding: isMobile ? '14px' : '20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label className="input-label">Agentic Wallet Address (OnchainOS TEE)</label>
          <div style={{ fontSize: isMobile ? 10 : 12, color: '#777', fontFamily: 'var(--mono)', padding: '10px 14px', border: '1px solid #1a1a1a', borderRadius: 4, background: '#050505', wordBreak: 'break-all', lineHeight: 1.6 }}>
            {isMobile ? '0xdf54982caada64c73f7f27afc...36625aa' : '0xdf54982caada64c73f7f27afc11a9600a36625aa'}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label className="input-label">Type</label>
            <div style={{ fontSize: isMobile ? 10 : 12, color: '#22c55e', fontFamily: 'var(--mono)', padding: '10px 14px', border: '1px solid #1a1a1a', borderRadius: 4, background: '#050505' }}>
              {isMobile ? 'Agentic Wallet' : 'OnchainOS Agentic Wallet'}
            </div>
          </div>
          <div>
            <label className="input-label">Security</label>
            <div style={{ fontSize: isMobile ? 10 : 12, color: '#818cf8', fontFamily: 'var(--mono)', padding: '10px 14px', border: '1px solid #1a1a1a', borderRadius: 4, background: '#050505' }}>
              {isMobile ? 'TEE secured' : 'TEE - keys never exposed'}
            </div>
          </div>
        </div>
        <div style={{ fontSize: 10, color: '#333', fontFamily: 'var(--mono)', lineHeight: 1.5 }}>
          AgentHub project identity · OKX TEE · Zero gas on X Layer
        </div>
      </div>
    </div>
  )
}
