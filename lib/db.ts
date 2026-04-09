import Database from 'better-sqlite3'
import path from 'path'

const DB_PATH = process.env.VERCEL 
  ? '/tmp/agenthub.db' 
  : path.join(process.cwd(), 'agenthub.db')

let db: Database.Database

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH)
    db.pragma('journal_mode = WAL')
    initDb(db)
  }
  return db
}

function initDb(db: Database.Database) {
  db.exec(`
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

export function getAllJobs() {
  const db = getDb()
  const rows = db.prepare('SELECT * FROM jobs ORDER BY created_at DESC').all()
  return rows.map(parseJob)
}

export function getJobById(id: string) {
  const db = getDb()
  const row = db.prepare('SELECT * FROM jobs WHERE id = ?').get(id)
  return row ? parseJob(row) : null
}

export function createJob(data: {
  title: string
  description?: string
  tags?: string[]
  reward: number
  poster: string
  txHash?: string
  contractJobId?: string
}) {
  const db = getDb()
  const result = db.prepare(`
    INSERT INTO jobs (title, description, tags, reward, poster, tx_hash, contract_job_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.title,
    data.description || '',
    JSON.stringify(data.tags || []),
    data.reward,
    data.poster,
    data.txHash || null,
    data.contractJobId || null,
  )
  return getJobById(String(result.lastInsertRowid))
}

export function updateJob(id: string, data: {
  status?: string
  agent?: string
  result?: string
  txHash?: string
}) {
  const db = getDb()
  const fields: string[] = []
  const values: any[] = []

  if (data.status) { fields.push('status = ?'); values.push(data.status) }
  if (data.agent)  { fields.push('agent = ?');  values.push(data.agent) }
  if (data.result) { fields.push('result = ?'); values.push(data.result) }
  if (data.txHash) { fields.push('tx_hash = ?'); values.push(data.txHash) }

  fields.push("updated_at = datetime('now')")
  values.push(id)

  db.prepare(`UPDATE jobs SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  return getJobById(id)
}

// ── Transaction queries ────────────────────────────────

export function createTransaction(data: {
  jobId?: number
  txHash: string
  type: string
  fromAddress?: string
  toAddress?: string
  amount?: number
  blockNumber?: string
}) {
  const db = getDb()
  db.prepare(`
    INSERT INTO transactions (job_id, tx_hash, type, from_address, to_address, amount, block_number)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.jobId || null,
    data.txHash,
    data.type,
    data.fromAddress || null,
    data.toAddress || null,
    data.amount || null,
    data.blockNumber || null,
  )
}

export function getAllTransactions() {
  const db = getDb()
  return db.prepare('SELECT * FROM transactions ORDER BY created_at DESC').all()
}

export function getTransactionsByAddress(address: string) {
  const db = getDb()
  return db.prepare(
    'SELECT * FROM transactions WHERE from_address = ? OR to_address = ? ORDER BY created_at DESC'
  ).all(address, address)
}

// ── Helper ─────────────────────────────────────────────

function parseJob(row: any) {
  return {
    ...row,
    id: String(row.id),
    tags: JSON.parse(row.tags || '[]'),
    reward: Number(row.reward),
  }
}
