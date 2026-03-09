import { Hono } from 'hono'
import bcrypt from 'bcryptjs'
import jwt from '@tsndr/cloudflare-worker-jwt'
import { getDB } from '../db'

const auth = new Hono<{
    Bindings: {
        TURSO_DATABASE_URL: string
        TURSO_AUTH_TOKEN: string
        JWT_SECRET: string
    }
}>()

auth.post('/register', async (c) => {
    try {
        const { email, password } = await c.req.json()

        if (!email || !password) {
            return c.json({ error: 'Email and password required' }, 400)
        }

        const db = getDB(c.env)
        const hashedPassword = await bcrypt.hash(password, 10)

        await db.execute({
            sql: 'INSERT INTO users (email, password) VALUES (?, ?)',
            args: [email, hashedPassword],
        })

        return c.json({ message: 'Account created successfully' }, 201)

    } catch (error: any) {
        if (error.message?.includes('UNIQUE')) {
            return c.json({ error: 'Email already exists' }, 400)
        }
        return c.json({ error: 'Something went wrong' }, 500)
    }
})

auth.post('/login', async (c) => {
    try {
        const { email, password } = await c.req.json()
        const db = getDB(c.env)

        const result = await db.execute({
            sql: 'SELECT * FROM users WHERE email = ?',
            args: [email],
        })

        const user = result.rows[0]

        if (!user) {
            return c.json({ error: 'Invalid email or password' }, 401)
        }

        const validPassword = await bcrypt.compare(password, user.password as string)

        if (!validPassword) {
            return c.json({ error: 'Invalid email or password' }, 401)
        }

        const token = await jwt.sign(
            {
                userId: user.id,
                email: user.email,
                exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
            },
            c.env.JWT_SECRET
        )

        return c.json({ token, email: user.email })

    } catch (error) {
        return c.json({ error: 'Something went wrong' }, 500)
    }
})

export default auth