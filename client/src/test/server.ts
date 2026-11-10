import { setupServer } from 'msw/node'
import { shopConfigHandler } from './shopConfig'

export const server = setupServer(shopConfigHandler)
