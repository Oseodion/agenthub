import { NextResponse } from 'next/server'
import { getAllJobs, createJob } from '@/lib/db'

// export async function GET() {
//   try {
//     const jobs = getAllJobs()
//     return NextResponse.json({ jobs })
//   } catch (err) {
//     console.error('GET jobs error:', err)
//     return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 })
//   }
// }
export async function GET() {
  try {
    const jobs = getAllJobs()
    // Seed a test job from different address if empty
    if (jobs.length === 0) {
      createJob({
        title: 'Test job from another agent',
        description: 'Accept this to test the payment flow',
        tags: ['TEST'],
        reward: 0.1,
        poster: '0x000000000000000000000000000000000000dead',
      })
    }
    return NextResponse.json({ jobs: getAllJobs() })
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

    const job = createJob({
      title,
      description,
      tags: tags || [],
      reward: parseFloat(reward),
      poster,
      txHash,
      contractJobId,
    })

    return NextResponse.json({ job }, { status: 201 })
  } catch (err) {
    console.error('POST job error:', err)
    return NextResponse.json({ error: 'Failed to create job' }, { status: 500 })
  }
}
