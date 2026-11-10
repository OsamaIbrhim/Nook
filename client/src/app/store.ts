import { configureStore } from '@reduxjs/toolkit'
import { setupListeners } from '@reduxjs/toolkit/query'
import { authReducer, connectSession } from '../features/auth'
import { cartReducer, connectCartPersistence } from '../features/cart'
import { baseApi } from '../shared/http/baseApi'

export function createStore() {
  const store = configureStore({
    reducer: { auth: authReducer, cart: cartReducer, [baseApi.reducerPath]: baseApi.reducer },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(baseApi.middleware)
  })
  setupListeners(store.dispatch)
  connectCartPersistence(store)
  connectSession(store)
  return store
}

export type AppStore = ReturnType<typeof createStore>
export type RootState = ReturnType<AppStore['getState']>
export type AppDispatch = AppStore['dispatch']
