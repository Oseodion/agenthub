'use client'
import { useState, useEffect } from 'react'
import { encodeFunctionData, parseUnits } from 'viem'
import { publicClient, ESCROW_ABI, CONTRACT_ADDRESS } from '@/lib/web3'
import { useRouter } from 'next/navigation'

type Job = {
  id: string
  title: string
  tags: string[]
  status: 'OPEN' | 'LIVE' | 'REVIEW' | 'DONE'
  reward: number
  poster: string
  description?: string
  txHash?: string
  contract_job_id?: string
}

export default function BrowsePage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [filter, setFilter] = useState('ALL')
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState<string | null>(null)
  const [address, setAddress] = useState<string | null>(null)
  const router = useRouter()

  // Get connected wallet
  useEffect(() => {
    const provider = (window as any).okxwallet || (window as any).ethereum
    if (!provider) return
    provider.request({ method: 'eth_accounts' })
      .then((accounts: string[]) => {
        if (accounts.length > 0) setAddress(accounts[0])
      })
      .catch(() => { })
  }, [])

  // Fetch jobs from API
  const fetchJobs = async () => {
    try {
      const res = await fetch('/api/jobs')
      const data = await res.json()
      setJobs(data.jobs || [])
    } catch {
      console.error('Failed to fetch jobs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchJobs() }, [])

  const handleAccept = async (job: Job) => {
    if (!address) { alert('Connect your wallet first'); return }
    if (job.poster.toLowerCase() === address.toLowerCase()) {
      alert('You cannot accept your own job')
      return
    }

    setAccepting(job.id)
    try {
      const provider = (window as any).okxwallet || (window as any).ethereum

      // Call acceptJob on contract
      const tx = await provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: address,
          to: CONTRACT_ADDRESS,
          data: encodeFunctionData({
            abi: ESCROW_ABI,
            functionName: 'acceptJob',
            args: [BigInt(job.contract_job_id || job.id)],
          }),
        }],
      })

      await publicClient.waitForTransactionReceipt({ hash: tx })

      // Update job status in API
      await fetch(`/api/jobs/${job.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'LIVE', agent: address, txHash: tx }),
      })

      alert(`✅ Job accepted! TX: ${tx}`)
      fetchJobs()
    } catch (err: any) {
      alert(err.message || 'Failed to accept job')
    } finally {
      setAccepting(null)
    }
  }

  const filters = ['ALL', 'OPEN', 'LIVE', 'REVIEW']
  const filtered = filter === 'ALL' ? jobs : jobs.filter(j => j.status === filter)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="section-label">// II / 01 <span>Browse / All Jobs</span></div>

      {/* Filter bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {filters.map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            fontSize: 10, padding: '5px 14px', borderRadius: 3,
            border: '1px solid', borderColor: filter === f ? '#555' : '#1a1a1a',
            color: filter === f ? '#fff' : '#555',
            background: '#000', cursor: 'pointer',
            fontFamily: 'var(--mono)', letterSpacing: '.5px',
            transition: 'all .15s',
          }}>
            {f}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 11, color: '#444', fontFamily: 'var(--mono)' }}>
          {filtered.length} jobs
        </div>
      </div>

      {/* Jobs list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: '#111', border: '1px solid #111', borderRadius: 8, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 24, color: '#555', fontSize: 13, fontFamily: 'var(--mono)', background: '#000' }}>
            Loading jobs...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 24, color: '#555', fontSize: 13, fontFamily: 'var(--mono)', background: '#000' }}>
            No jobs found
          </div>
        ) : filtered.map((job, i) => (
          <div
            key={job.id}
            onClick={() => router.push('/browse/' + job.id)}
            style={{
              background: '#000',
              padding: '18px 22px',
              cursor: 'pointer',
              transition: 'background .1s',
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              gap: '12px 24px',
              alignItems: 'start',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#050505')}
            onMouseLeave={e => (e.currentTarget.style.background = '#000')}
          >
            {/* Left — job info */}
            <div style={{ minWidth: 0 }}>
              {/* Title row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span className={`tag tag-${job.status.toLowerCase()}`}>{job.status}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#e0e0e0', letterSpacing: '-.2px' }}>{job.title}</span>
              </div>
              {/* Description */}
              {job.description && (
                <div style={{ fontSize: 11, color: '#555', marginBottom: 8, lineHeight: 1.5, paddingLeft: 2 }}>
                  {job.description.length > 100 ? job.description.slice(0, 100) + '...' : job.description}
                </div>
              )}
              {/* Meta row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {job.tags.map((tag: string) => (
                  <span key={tag} style={{
                    fontSize: 9, color: '#444', fontFamily: 'var(--mono)',
                    background: '#0a0a0a', border: '1px solid #1a1a1a',
                    padding: '2px 7px', borderRadius: 2, letterSpacing: '.5px',
                  }}>{tag}</span>
                ))}
                <span style={{ fontSize: 10, color: '#333', fontFamily: 'var(--mono)' }}>·</span>
                <span style={{ fontSize: 10, color: '#444', fontFamily: 'var(--mono)' }}>
                  {job.poster?.slice(0, 6)}...{job.poster?.slice(-4)}
                </span>
              </div>
            </div>

            {/* Right — reward + action */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10, flexShrink: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', letterSpacing: '-.5px', whiteSpace: 'nowrap' }}>
                {job.reward} <span style={{ fontSize: 11, fontWeight: 400, color: '#555' }}>USDC</span>
              </div>
              {job.status === 'OPEN' && (
                <button
                  className="btn-primary"
                  style={{ fontSize: 10, padding: '5px 16px', opacity: accepting === job.id ? .5 : 1 }}
                  onClick={e => { e.stopPropagation(); handleAccept(job) }}
                  disabled={accepting === job.id}
                >
                  {accepting === job.id ? 'Accepting...' : 'Accept'}
                </button>
              )}
              {job.status === 'DONE' && (
                <span style={{ fontSize: 10, color: '#22c55e', fontFamily: 'var(--mono)' }}>✓ Completed</span>
              )}
              {job.status === 'LIVE' && (
                <span style={{ fontSize: 10, color: '#818cf8', fontFamily: 'var(--mono)' }}>● In progress</span>
              )}
              {job.status === 'REVIEW' && (
                <span style={{ fontSize: 10, color: '#999', fontFamily: 'var(--mono)' }}>⧗ In review</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}