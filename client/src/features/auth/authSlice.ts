import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { User } from '../../shared/contract/types'
import { hasSessionHint, migrateLegacySession } from './session'

export type AuthStatus = 'unknown' | 'guest' | 'authenticated'
export type AuthState = { user: User | null; status: AuthStatus }

function initialState(): AuthState {
  migrateLegacySession()
  return { user: null, status: hasSessionHint() ? 'unknown' : 'guest' }
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    sessionStarted(state, action: PayloadAction<User>) {
      state.user = action.payload
      state.status = 'authenticated'
    },
    sessionEnded(state) {
      state.user = null
      state.status = 'guest'
    }
  }
})

export const { sessionStarted, sessionEnded } = authSlice.actions
export default authSlice.reducer
