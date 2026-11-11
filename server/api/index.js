import mongoose from 'mongoose'
import { app } from '../src/app.js'
import { connectDatabase } from '../src/config/db.js'

const state = (globalThis.nookDatabase ??= {})

async function ensureDatabase() {
    if (mongoose.connection.readyState === 1) return
    if (!state.connectionPromise) {
        state.connectionPromise = connectDatabase().catch((error) => {
            state.connectionPromise = undefined
            throw error
        })
    }
    await state.connectionPromise
}

export default async function handler(req, res) {
    try {
        await ensureDatabase()
        return app(req, res)
    } catch (error) {
        console.error('Serverless API initialization failed:', error)
        res.setHeader('Retry-After', '5')
        return res.status(503).json({ success: false, error: { message: 'API is temporarily unavailable', code: 'service_unavailable' } })
    }
}
