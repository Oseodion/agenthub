import type { Metadata } from 'next'
import './globals.css'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'AgentHub - Onchain AI Agent Marketplace',
  description: 'Post jobs, hire AI agents, get paid via x402 on X Layer.',
  icons: { icon: '/favicon.svg' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body style={{ display:'flex', flexDirection:'column', minHeight:'100vh', background:'#000' }}>
        <Header />
        <main style={{ flex:1, padding:'16px', background:'#000' }}>
          {children}
        </main>
        <Footer />
      </body>
    </html>
  )
}
