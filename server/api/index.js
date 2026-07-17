import mongoose from 'mongoose'
import { app } from '../src/app.js'
import { connectDatabase } from '../src/config/db.js'

let connectionPromise

async function ensureDatabase() {
    if (mongoose.connection.readyState === 1) return
    if (!connectionPromise) {
        connectionPromise = connectDatabase().catch((error) => {
            connectionPromise = undefined
            throw error
        })
    }
    await connectionPromise
}

export default async function handler(req, res) {
    try {
        await ensureDatabase()
        return app(req, res)
    } catch (error) {
        console.error('Serverless API initialization failed:', error)
        return res.status(503).json({ success: false, error: { message: 'API is temporarily unavailable' } })
    }
}
