import { createClient } from '@libsql/client'

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
})

export async function initDb() {
  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      tags TEXT DEFAULT '[]',
      status TEXT DEFAULT 'OPEN',
      reward REAL NOT NULL,
      poster TEXT NOT NULL,
      agent TEXT,
      result TEXT,
      tx_hash TEXT,
      contract_job_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER,
      tx_hash TEXT NOT NULL,
      type TEXT NOT NULL,
      from_address TEXT,
      to_address TEXT,
      amount REAL,
      block_number TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `)
}

// ── Job queries ────────────────────────────────────────

export async function getAllJobs() {
  await initDb()
  const result = await client.execute('SELECT * FROM jobs ORDER BY created_at DESC')
  return result.rows.map(parseJob)
}

export async function getJobById(id: string) {
  const result = await client.execute({ sql: 'SELECT * FROM jobs WHERE id = ?', args: [id] })
  return result.rows.length > 0 ? parseJob(result.rows[0]) : null
}

export async function createJob(data: {
  title: string
  description?: string
  tags?: string[]
  reward: number
  poster: string
  txHash?: string
  contractJobId?: string
}) {
  const result = await client.execute({
    sql: `INSERT INTO jobs (title, description, tags, reward, poster, tx_hash, contract_job_id)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      data.title,
      data.description || '',
      JSON.stringify(data.tags || []),
      data.reward,
      data.poster,
      data.txHash || null,
      data.contractJobId || null,
    ],
  })
  return getJobById(String(result.lastInsertRowid))
}

export async function updateJob(id: string, data: {
  status?: string
  agent?: string
  result?: string
  txHash?: string
}) {
  const fields: string[] = []
  const values: any[] = []

  if (data.status) { fields.push('status = ?'); values.push(data.status) }
  if (data.agent)  { fields.push('agent = ?');  values.push(data.agent) }
  if (data.result) { fields.push('result = ?'); values.push(data.result) }
  if (data.txHash) { fields.push('tx_hash = ?'); values.push(data.txHash) }

  fields.push("updated_at = datetime('now')")
  values.push(id)

  await client.execute({
    sql: `UPDATE jobs SET ${fields.join(', ')} WHERE id = ?`,
    args: values,
  })
  return getJobById(id)
}

// ── Transaction queries ────────────────────────────────

export async function createTransaction(data: {
  jobId?: number
  txHash: string
  type: string
  fromAddress?: string
  toAddress?: string
  amount?: number
  blockNumber?: string
}) {
  await client.execute({
    sql: `INSERT INTO transactions (job_id, tx_hash, type, from_address, to_address, amount, block_number)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      data.jobId || null,
      data.txHash,
      data.type,
      data.fromAddress || null,
      data.toAddress || null,
      data.amount || null,
      data.blockNumber || null,
    ],
  })
}

export async function getAllTransactions() {
  await initDb()
  const result = await client.execute('SELECT * FROM transactions ORDER BY created_at DESC')
  return result.rows
}

export async function getTransactionsByAddress(address: string) {
  await initDb()
  const result = await client.execute({
    sql: 'SELECT * FROM transactions WHERE from_address = ? OR to_address = ? ORDER BY created_at DESC',
    args: [address, address],
  })
  return result.rows
}

// ── Helper ─────────────────────────────────────────────

function parseJob(row: any) {
  return {
    ...row,
    id: String(row.id),
    tags: JSON.parse((row.tags as string) || '[]'),
    reward: Number(row.reward),
  }
}
