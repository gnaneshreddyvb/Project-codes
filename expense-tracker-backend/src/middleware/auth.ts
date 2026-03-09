import { createMiddleware } from 'hono/factory'
import jwt from '@tsndr/cloudflare-worker-jwt'

export const authMiddleware = createMiddleware<{
    Bindings: { JWT_SECRET: string }
    Variables: { userId: number }
}>(async (c, next) => {
    const authHeader = c.req.header('Authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.json({ error: 'No token provided' }, 401)
    }

    const token = authHeader.split(' ')[1]
    const isValid = await jwt.verify(token, c.env.JWT_SECRET)

    if (!isValid) {
        return c.json({ error: 'Invalid or expired token' }, 401)
    }

    const decoded = jwt.decode(token)
    const userId = (decoded.payload as any).userId
    c.set('userId', userId)

    await next()
})