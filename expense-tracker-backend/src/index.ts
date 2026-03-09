import { Hono } from 'hono'
import { cors } from 'hono/cors'
import auth from './routes/auth'
import expenses from './routes/expenses'
import { initDB } from './db'

const app = new Hono()

app.use('*', cors())

app.route('/api/auth', auth)
app.route('/api/expenses', expenses)

app.get('/api/setup', async (c) => {
  await initDB(c.env)
  return c.json({ message: 'Database tables created!' })
})

app.get('/', (c) => c.json({ message: 'Expense Tracker API is running!' }))

export default app