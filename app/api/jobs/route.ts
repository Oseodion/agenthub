import { NextResponse } from 'next/server'
import { getAllJobs, createJob } from '@/lib/db'

export async function GET() {
  try {
    const jobs = await getAllJobs()
    return NextResponse.json({ jobs })
  } catch (err) {
    console.error('GET jobs error:', err)
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { title, description, tags, reward, poster, txHash, contractJobId } = body

    if (!title || !reward || !poster) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const job = await createJob({
      title,
      description,
      tags: tags || [],
      reward: parseFloat(reward),
      poster,
      txHash,
      contractJobId,
    })
    // Send Telegram notification
    try {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://agenthub-mauve.vercel.app'}/api/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `🆕 <b>New job posted on AgentHub!</b>\n\n<b>Title:</b> ${job?.title}\n<b>Reward:</b> ${job?.reward} USDC\n<b>Tags:</b> ${job?.tags?.join(', ')}\n<b>Posted by:</b> ${poster?.slice(0, 6)}...${poster?.slice(-4)}\n\n🔗 https://agenthub-mauve.vercel.app/browse/${job?.id}`,
        }),
      })
    } catch { }
    return NextResponse.json({ job }, { status: 201 })
  } catch (err) {
    console.error('POST job error:', err)
    return NextResponse.json({ error: 'Failed to create job' }, { status: 500 })
  }
}
