import { createClient } from '@libsql/client'

export function getDB(env: {
    TURSO_DATABASE_URL: string;
    TURSO_AUTH_TOKEN: string;
}) {
    return createClient({
        url: env.TURSO_DATABASE_URL,
        authToken: env.TURSO_AUTH_TOKEN,
    })
}

export async function initDB(env: any) {
    const db = getDB(env)

    // Users table (same as notes app)
    await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      email      TEXT UNIQUE NOT NULL,
      password   TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `)

    // Expenses table (NEW!)
    await db.execute(`
    CREATE TABLE IF NOT EXISTS expenses (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL,
      amount      REAL NOT NULL,
      category    TEXT NOT NULL,
      description TEXT,
      date        TEXT NOT NULL,
      created_at  TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `)
}