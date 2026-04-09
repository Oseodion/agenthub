'use client'
import { useState, useEffect } from 'react'
import { encodeFunctionData } from 'viem'
import { publicClient, ESCROW_ABI, CONTRACT_ADDRESS } from '@/lib/web3'
import { useParams, useRouter } from 'next/navigation'

type Job = {
  id: string
  title: string
  tags: string[]
  status: 'OPEN' | 'LIVE' | 'REVIEW' | 'DONE'
  reward: number
  poster: string
  agent?: string
  description?: string
  txHash?: string
  contract_job_id?: string
}

export default function JobDetailPage() {
  const params = useParams()
  const router = useRouter()
  const jobId = params.id as string
  const [job, setJob] = useState<Job | null>(null)
  const [address, setAddress] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [releasing, setReleasing] = useState(false)
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
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch('/api/jobs')
      .then(r => r.json())
      .then(data => {
        const found = data.jobs?.find((j: Job) => j.id === jobId)
        setJob(found || null)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [jobId])

  const handleSubmitResult = async () => {
    if (!address || !result || !job) return
    setSubmitting(true)
    try {
      const provider = (window as any).okxwallet || (window as any).ethereum
      const tx = await provider.request({
        method: 'eth_sendTransaction',
        params: [{ from: address, to: CONTRACT_ADDRESS, data: encodeFunctionData({ abi: ESCROW_ABI, functionName: 'submitResult', args: [BigInt(job.contract_job_id || job.id), result] }) }],
      })
      await publicClient.waitForTransactionReceipt({ hash: tx })
      await fetch('/api/jobs/' + job.id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'REVIEW', txHash: tx }) })
      alert('Result submitted! TX: ' + tx)
      router.refresh()
    } catch (err: any) {
      alert(err.message || 'Failed to submit result')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReleasePayment = async () => {
    if (!address || !job) return
    setReleasing(true)
    try {
      const provider = (window as any).okxwallet || (window as any).ethereum
      const tx = await provider.request({
        method: 'eth_sendTransaction',
        params: [{ from: address, to: CONTRACT_ADDRESS, data: encodeFunctionData({ abi: ESCROW_ABI, functionName: 'releasePayment', args: [BigInt(job.contract_job_id || job.id)] }) }],
      })
      await publicClient.waitForTransactionReceipt({ hash: tx })
      await fetch('/api/jobs/' + job.id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'DONE', txHash: tx }) })
      alert('Payment released! TX: ' + tx)
      router.push('/browse')
    } catch (err: any) {
      alert(err.message || 'Failed to release payment')
    } finally {
      setReleasing(false)
    }
  }

  if (loading) return <div style={{ padding: 24, color: '#555', fontFamily: 'var(--mono)', fontSize: 13 }}>Loading job...</div>
  if (!job) return <div style={{ padding: 24, color: '#555', fontFamily: 'var(--mono)', fontSize: 13 }}>Job not found</div>

  const isPoster = address?.toLowerCase() === job.poster?.toLowerCase()
  const isAgent = address?.toLowerCase() === job.agent?.toLowerCase()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 720 }}>
      <div className="section-label">// II / 02 <span>Browse / Job Detail</span></div>

      {/* Main card */}
      <div className="card">
        <div style={{ padding: isMobile ? '16px' : '24px' }}>

          {/* Title + status row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
            <div style={{ fontSize: isMobile ? 16 : 20, fontWeight: 700, color: '#fff', letterSpacing: '-.5px', lineHeight: 1.3, flex: 1 }}>
              {job.title}
            </div>
            <span className={'tag tag-' + job.status.toLowerCase()} style={{ flexShrink: 0 }}>{job.status}</span>
          </div>

          {/* Tags */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            {job.tags.map(tag => (
              <span key={tag} style={{
                fontSize: 9, color: '#444', fontFamily: 'var(--mono)',
                background: '#0a0a0a', border: '1px solid #1a1a1a',
                padding: '2px 7px', borderRadius: 2, letterSpacing: '.5px',
              }}>{tag}</span>
            ))}
          </div>

          {/* Description */}
          {job.description && (
            <div style={{ fontSize: 13, color: '#666', lineHeight: 1.6, marginBottom: 16 }}>
              {job.description}
            </div>
          )}

          {/* Reward */}
          <div style={{ padding: '12px 0', borderTop: '1px solid #111', borderBottom: '1px solid #111', marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: '#555', fontFamily: 'var(--mono)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Reward</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>
              {job.reward} <span style={{ fontSize: 12, fontWeight: 400, color: '#555' }}>USDC</span>
            </div>
          </div>

          {/* Meta info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <div style={{ fontSize: 9, color: '#444', fontFamily: 'var(--mono)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Poster</div>
              <div style={{ fontSize: 11, color: '#777', fontFamily: 'var(--mono)', wordBreak: 'break-all' }}>{job.poster}</div>
            </div>
            {job.agent && (
              <div>
                <div style={{ fontSize: 9, color: '#444', fontFamily: 'var(--mono)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Agent</div>
                <div style={{ fontSize: 11, color: '#777', fontFamily: 'var(--mono)', wordBreak: 'break-all' }}>{job.agent}</div>
              </div>
            )}
            {job.txHash && (
              <div>
                <div style={{ fontSize: 9, color: '#444', fontFamily: 'var(--mono)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Transaction</div>
                <a
                  href={'https://web3.okx.com/explorer/x-layer/tx/' + job.txHash}
                  target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 11, color: '#22c55e', fontFamily: 'var(--mono)', textDecoration: 'none', wordBreak: 'break-all' }}
                >
                  {job.txHash?.slice(0, isMobile ? 24 : 32)}...
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Submit result */}
      {isAgent && job.status === 'LIVE' && (
        <div className="card" style={{ padding: isMobile ? 16 : 24 }}>
          <div className="section-label" style={{ marginBottom: 16 }}>// Submit result</div>
          <label className="input-label">Result / proof of work</label>
          <textarea className="input-field" rows={4} placeholder="Paste your result, report, or IPFS hash here..." value={result} onChange={e => setResult(e.target.value)} style={{ resize: 'none' }} />
          <button className="btn-primary" style={{ marginTop: 12, opacity: submitting ? .5 : 1, width: isMobile ? '100%' : 'auto' }} onClick={handleSubmitResult} disabled={submitting || !result}>
            {submitting ? 'Submitting...' : 'Submit result'}
          </button>
        </div>
      )}

      {/* Release payment */}
      {isPoster && job.status === 'REVIEW' && (
        <div className="card" style={{ padding: isMobile ? 16 : 24 }}>
          <div className="section-label" style={{ marginBottom: 16 }}>// Release payment</div>
          <div style={{ fontSize: 13, color: '#666', marginBottom: 16, lineHeight: 1.5 }}>
            The agent has submitted their result. Review it and release payment if satisfied.
          </div>
          <button className="btn-primary" style={{ opacity: releasing ? .5 : 1, width: isMobile ? '100%' : 'auto' }} onClick={handleReleasePayment} disabled={releasing}>
            {releasing ? 'Releasing...' : `Release ${job.reward} USDC to agent`}
          </button>
        </div>
      )}

      <button className="btn-secondary" style={{ alignSelf: 'flex-start' }} onClick={() => router.push('/browse')}>
        ← Back to jobs
      </button>
    </div>
  )
}
