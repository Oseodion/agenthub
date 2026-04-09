import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

const API_BASE = process.env.AGENTHUB_API_URL || 'http://localhost:3000'

const server = new McpServer({ name: 'agenthub', version: '0.1.0' })

server.tool('post_job', 'Post a new job to AgentHub with USDC reward locked in x402 escrow on X Layer',
  { title: z.string(), description: z.string(), reward: z.number(), tags: z.array(z.string()), poster: z.string() },
  async ({ title, description, reward, tags, poster }) => {
    const res = await fetch(`${API_BASE}/api/jobs`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, description, reward, tags, poster }) })
    const data = await res.json()
    return { content: [{ type: 'text', text: data.job ? `Job posted!\nID: ${data.job.id}\nTitle: ${data.job.title}\nReward: ${data.job.reward} USDC` : `Error: ${data.error}` }] }
  }
)

server.tool('browse_jobs', 'Browse all available jobs on AgentHub',
  { status: z.enum(['ALL','OPEN','LIVE','REVIEW','DONE']).optional(), min_reward: z.number().optional() },
  async ({ status, min_reward }) => {
    const res = await fetch(`${API_BASE}/api/jobs`)
    const data = await res.json()
    let jobs = data.jobs || []
    if (status && status !== 'ALL') jobs = jobs.filter((j: any) => j.status === status)
    if (min_reward) jobs = jobs.filter((j: any) => j.reward >= min_reward)
    const formatted = jobs.map((j: any) => `[${j.id}] ${j.title} | ${j.reward} USDC | ${j.status}`).join('\n')
    return { content: [{ type: 'text', text: jobs.length > 0 ? `Found ${jobs.length} jobs:\n\n${formatted}` : 'No jobs found.' }] }
  }
)

server.tool('accept_job', 'Accept a job and assign it to an agent wallet',
  { job_id: z.string(), agent_wallet: z.string() },
  async ({ job_id, agent_wallet }) => {
    const res = await fetch(`${API_BASE}/api/jobs/${job_id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'LIVE', agent: agent_wallet }) })
    const data = await res.json()
    return { content: [{ type: 'text', text: data.success ? `Job ${job_id} accepted by ${agent_wallet}` : `Error: ${data.error}` }] }
  }
)

server.tool('submit_result', 'Submit completed work result for a job',
  { job_id: z.string(), result: z.string(), agent_wallet: z.string() },
  async ({ job_id, result, agent_wallet }) => {
    const res = await fetch(`${API_BASE}/api/jobs/${job_id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'REVIEW', result, agent: agent_wallet }) })
    const data = await res.json()
    return { content: [{ type: 'text', text: data.success ? `Result submitted for job ${job_id}. Awaiting payment release.` : `Error: ${data.error}` }] }
  }
)

server.tool('release_payment', 'Release x402 escrow payment to the completing agent',
  { job_id: z.string(), poster_wallet: z.string() },
  async ({ job_id, poster_wallet }) => {
    const res = await fetch(`${API_BASE}/api/jobs/${job_id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'DONE', releasedBy: poster_wallet }) })
    const data = await res.json()
    return { content: [{ type: 'text', text: data.success ? `Payment released for job ${job_id}. USDC sent via x402 on X Layer.` : `Error: ${data.error}` }] }
  }
)

server.tool('get_agent_stats', 'Get performance stats for an agent wallet address',
  { wallet_address: z.string() },
  async ({ wallet_address }) => {
    const res = await fetch(`${API_BASE}/api/jobs`)
    const data = await res.json()
    const jobs = data.jobs || []
    const agentJobs = jobs.filter((j: any) => j.agent?.toLowerCase() === wallet_address.toLowerCase() || j.poster?.toLowerCase() === wallet_address.toLowerCase())
    const completed = agentJobs.filter((j: any) => j.status === 'DONE')
    const active = agentJobs.filter((j: any) => j.status === 'LIVE' || j.status === 'REVIEW')
    const totalEarned = completed.reduce((sum: number, j: any) => sum + j.reward, 0)
    return { content: [{ type: 'text', text: `Agent Stats for ${wallet_address}\nCompleted: ${completed.length}\nActive: ${active.length}\nTotal earned: ${totalEarned} USDC\nSuccess rate: ${agentJobs.length > 0 ? Math.round(completed.length / agentJobs.length * 100) : 0}%` }] }
  }
)

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('AgentHub MCP server running...')
}

main().catch(console.error)
