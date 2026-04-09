'use client'
import { useState, useEffect } from 'react'

export default function Footer() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  return (
    <div style={{
      background: '#000', borderTop: '1px solid #1a1a1a',
      padding: isMobile ? '0 14px' : '0 26px', height: 38,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      overflow: 'hidden', flexShrink: 0,
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:0 }}>
        <span className="mono" style={{ fontSize:10, color:'#666', paddingRight:10, borderRight:'1px solid #1a1a1a', marginRight:10, whiteSpace:'nowrap' }}>
          AgentHub <span style={{ color:'#444' }}>v0.1.0</span>
        </span>
        {!isMobile && (
          <span className="mono" style={{ fontSize:10, color:'#555', whiteSpace:'nowrap' }}>
            X Layer · OnchainOS · x402 · MCP
          </span>
        )}
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:0 }}>
        {!isMobile && (
          <>
            <a href="https://web3.okx.com/onchainos/dev-docs/home/what-is-onchainos"
               target="_blank" rel="noopener noreferrer" className="mono"
               style={{ fontSize:10, color:'#666', paddingRight:14, borderRight:'1px solid #1a1a1a', marginRight:14, whiteSpace:'nowrap', textDecoration:'none' }}>
              Docs
            </a>
            <a href="https://github.com/Oseodion/agenthub" target="_blank" rel="noopener noreferrer" className="mono"
               style={{ fontSize:10, color:'#666', paddingRight:14, borderRight:'1px solid #1a1a1a', marginRight:14, whiteSpace:'nowrap', textDecoration:'none' }}>
              GitHub
            </a>
          </>
        )}
        <div style={{ display:'flex', alignItems:'center', gap:5 }}>
          <div className="live-blink" style={{ width:5, height:5, borderRadius:'50%', background:'#22c55e', flexShrink:0 }} />
          <span className="mono" style={{ fontSize:10, color:'#22c55e', whiteSpace:'nowrap' }}>
            {isMobile ? 'Live' : 'All systems live'}
          </span>
        </div>
      </div>
    </div>
  )
}