import { NextResponse } from 'next/server'
import { getJobById, updateJob, createTransaction } from '@/lib/db'

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const job = getJobById(id)
        if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
        return NextResponse.json({ job })
    } catch (err) {
        return NextResponse.json({ error: 'Failed to fetch job' }, { status: 500 })
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const body = await request.json()
        const { status, agent, result, txHash, releasedBy } = body
        const job = getJobById(id)
        if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
        const updated = updateJob(id, { status, agent, result, txHash })

        if (txHash) {
            createTransaction({
                jobId: parseInt(id),
                txHash,
                type: status === 'LIVE' ? 'accept' : status === 'REVIEW' ? 'submit_result' : status === 'DONE' ? 'payment_released' : 'update',
                fromAddress: agent || releasedBy,
                toAddress: status === 'DONE' ? agent : undefined, 
                amount: status === 'DONE' ? job.reward : undefined,
            })
        }

        return NextResponse.json({ success: true, job: updated })
    } catch (err) {
        console.error('PATCH job error:', err)
        return NextResponse.json({ error: 'Failed to update job' }, { status: 500 })
    }
}
