import { NextResponse } from 'next/server'
import { getAllJobs } from '@/lib/db'

// MCP HTTP endpoint — public read-only tools
// Compatible with Claude Code, Cursor, OpenClaw and any MCP client

const TOOLS = [
  {
    name: 'browse_jobs',
    description: 'Browse all available jobs on AgentHub onchain AI agent marketplace',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['ALL', 'OPEN', 'LIVE', 'REVIEW', 'DONE'], description: 'Filter by job status' },
        min_reward: { type: 'number', description: 'Minimum reward in USDC' },
      },
    },
  },
  {
    name: 'get_agent_stats',
    description: 'Get platform statistics for AgentHub — total jobs, completed, active, and total USDC paid out',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
]

export async function GET() {
  // MCP server info endpoint
  return NextResponse.json({
    name: 'agenthub',
    version: '0.1.0',
    description: 'AgentHub — Onchain AI Agent Job Marketplace on X Layer',
    tools: TOOLS,
  })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { method, params } = body

    // MCP initialize
    if (method === 'initialize') {
      return NextResponse.json({
        jsonrpc: '2.0',
        id: body.id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'agenthub', version: '0.1.0' },
        },
      })
    }

    // MCP tools/list
    if (method === 'tools/list') {
      return NextResponse.json({
        jsonrpc: '2.0',
        id: body.id,
        result: { tools: TOOLS },
      })
    }

    // MCP tools/call
    if (method === 'tools/call') {
      const { name, arguments: args } = params

      if (name === 'browse_jobs') {
        const jobs = await getAllJobs()
        let filtered = jobs as any[]
        if (args?.status && args.status !== 'ALL') {
          filtered = filtered.filter(j => j.status === args.status)
        }
        if (args?.min_reward) {
          filtered = filtered.filter(j => j.reward >= args.min_reward)
        }
        const formatted = filtered.map(j =>
          `[${j.id}] ${j.title} | ${j.reward} USDC | ${j.status} | Tags: ${j.tags.join(', ')}`
        ).join('\n')

        return NextResponse.json({
          jsonrpc: '2.0',
          id: body.id,
          result: {
            content: [{
              type: 'text',
              text: filtered.length > 0
                ? `Found ${filtered.length} jobs on AgentHub:\n\n${formatted}`
                : 'No jobs found.',
            }],
          },
        })
      }

      if (name === 'get_agent_stats') {
        const jobs = await getAllJobs() as any[]
        const completed = jobs.filter(j => j.status === 'DONE')
        const active = jobs.filter(j => j.status === 'LIVE' || j.status === 'REVIEW')
        const open = jobs.filter(j => j.status === 'OPEN')
        const totalPaid = completed.reduce((sum: number, j: any) => sum + j.reward, 0)

        return NextResponse.json({
          jsonrpc: '2.0',
          id: body.id,
          result: {
            content: [{
              type: 'text',
              text: `AgentHub Platform Stats:\n\nTotal jobs: ${jobs.length}\nOpen: ${open.length}\nActive: ${active.length}\nCompleted: ${completed.length}\nTotal USDC paid: $${totalPaid.toFixed(3)}\nNetwork: X Layer (Chain ID 196)\nContract: 0xa9730ba605265505a6ccb1bdd614947fef7ce3ed`,
            }],
          },
        })
      }

      return NextResponse.json({
        jsonrpc: '2.0',
        id: body.id,
        error: { code: -32601, message: `Tool not found: ${name}` },
      })
    }

    return NextResponse.json({
      jsonrpc: '2.0',
      id: body.id,
      error: { code: -32601, message: `Method not found: ${method}` },
    })

  } catch (err: any) {
    return NextResponse.json({
      jsonrpc: '2.0',
      id: null,
      error: { code: -32700, message: err.message || 'Parse error' },
    }, { status: 500 })
  }
}
