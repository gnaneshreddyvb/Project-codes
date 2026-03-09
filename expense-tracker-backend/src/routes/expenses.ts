import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import { getDB } from '../db'

const expenses = new Hono<{
    Bindings: {
        TURSO_DATABASE_URL: string
        TURSO_AUTH_TOKEN: string
        JWT_SECRET: string
    }
    Variables: { userId: number }
}>()

// Protect all routes
expenses.use('*', authMiddleware)

// GET all expenses with optional filters
expenses.get('/', async (c) => {
    const db = getDB(c.env)
    const userId = c.get('userId')

    // Read query parameters
    const category = c.req.query('category')
    const startDate = c.req.query('startDate')
    const endDate = c.req.query('endDate')

    // Build SQL dynamically based on filters
    let sql = 'SELECT * FROM expenses WHERE user_id = ?'
    let args: any[] = [userId]

    if (category) {
        sql += ' AND category = ?'
        args.push(category)
    }

    if (startDate) {
        sql += ' AND date >= ?'
        args.push(startDate)
    }

    if (endDate) {
        sql += ' AND date <= ?'
        args.push(endDate)
    }

    sql += ' ORDER BY date DESC, created_at DESC'

    const result = await db.execute({ sql, args })

    const expensesList = result.rows.map(row => ({
        id: Number(row.id),
        user_id: Number(row.user_id),
        amount: Number(row.amount),
        category: row.category,
        description: row.description,
        date: row.date,
        created_at: row.created_at,
    }))

    return c.json({ expenses: expensesList })
})

// POST create new expense
expenses.post('/', async (c) => {
    const { amount, category, description, date } = await c.req.json()
    const userId = c.get('userId')
    const db = getDB(c.env)

    if (!amount || !category || !date) {
        return c.json({ error: 'Amount, category, and date required' }, 400)
    }

    const result = await db.execute({
        sql: 'INSERT INTO expenses (user_id, amount, category, description, date) VALUES (?, ?, ?, ?, ?)',
        args: [userId, amount, category, description || null, date],
    })

    return c.json({
        message: 'Expense created',
        id: Number(result.lastInsertRowid)
    }, 201)
})

// PUT update expense
expenses.put('/:id', async (c) => {
    const { amount, category, description, date } = await c.req.json()
    const expenseId = c.req.param('id')
    const userId = c.get('userId')
    const db = getDB(c.env)

    await db.execute({
        sql: 'UPDATE expenses SET amount = ?, category = ?, description = ?, date = ? WHERE id = ? AND user_id = ?',
        args: [amount, category, description || null, date, expenseId, userId],
    })

    return c.json({ message: 'Expense updated' })
})

// DELETE expense
expenses.delete('/:id', async (c) => {
    const expenseId = c.req.param('id')
    const userId = c.get('userId')
    const db = getDB(c.env)

    await db.execute({
        sql: 'DELETE FROM expenses WHERE id = ? AND user_id = ?',
        args: [expenseId, userId],
    })

    return c.json({ message: 'Expense deleted' })
})

// GET statistics - total by category
expenses.get('/stats', async (c) => {
    const db = getDB(c.env)
    const userId = c.get('userId')

    // Read optional filters
    const startDate = c.req.query('startDate')
    const endDate = c.req.query('endDate')

    // Build SQL for category totals
    let sql = `
    SELECT category, SUM(amount) as total 
    FROM expenses 
    WHERE user_id = ?
  `
    let args: any[] = [userId]

    if (startDate) {
        sql += ' AND date >= ?'
        args.push(startDate)
    }

    if (endDate) {
        sql += ' AND date <= ?'
        args.push(endDate)
    }

    sql += ' GROUP BY category'

    const result = await db.execute({ sql, args })

    const stats = result.rows.map(row => ({
        category: row.category,
        total: Number(row.total),
    }))

    // Calculate grand total
    const grandTotal = stats.reduce((sum, stat) => sum + stat.total, 0)

    return c.json({
        byCategory: stats,
        total: grandTotal
    })
})

export default expenses