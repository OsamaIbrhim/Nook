import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { api, errorMessage } from '../../api/client'
import type { ApiResponse, User } from '../../types'

type AuthState = { user: User | null; accessToken: string | null; loading: boolean; initialized: boolean }
const savedUser = localStorage.getItem('user')
const initialState: AuthState = { user: savedUser ? JSON.parse(savedUser) : null, accessToken: sessionStorage.getItem('accessToken'), loading: false, initialized: false }

export const restoreSession = createAsyncThunk('auth/restore', async () => {
  if (!sessionStorage.getItem('accessToken')) {
    const { data } = await api.post<ApiResponse<{ accessToken: string }>>('/auth/refresh')
    sessionStorage.setItem('accessToken', data.data.accessToken)
  }
  const { data } = await api.get<ApiResponse<{ user: User }>>('/auth/me')
  return data.data.user
})
export const login = createAsyncThunk('auth/login', async (body: { email: string; password: string }, { rejectWithValue }) => {
  try {
    const { data } = await api.post<ApiResponse<{ user: User; accessToken: string }>>('/auth/login', body)
    return data.data
  } catch (error) { return rejectWithValue(errorMessage(error)) }
})
export const register = createAsyncThunk('auth/register', async (body: { name: string; email: string; password: string }, { rejectWithValue }) => {
  try {
    const { data } = await api.post<ApiResponse<{ user: User; accessToken: string }>>('/auth/register', body)
    return data.data
  } catch (error) { return rejectWithValue(errorMessage(error)) }
})
export const logout = createAsyncThunk('auth/logout', async () => { await api.post('/auth/logout') })

const persist = (user: User, token: string) => { localStorage.setItem('user', JSON.stringify(user)); sessionStorage.setItem('accessToken', token) }
const clear = () => { localStorage.removeItem('user'); sessionStorage.removeItem('accessToken') }
const authSlice = createSlice({
  name: 'auth', initialState,
  reducers: {
    sessionExpired(state) { state.user = null; state.accessToken = null; state.initialized = true; clear() },
    tokenRefreshed(state, action: PayloadAction<string>) { state.accessToken = action.payload }
  },
  extraReducers: (builder) => builder
    .addCase(restoreSession.pending, (s) => { s.loading = true })
    .addCase(restoreSession.fulfilled, (s, a) => { s.user = a.payload; s.accessToken = sessionStorage.getItem('accessToken'); s.loading = false; s.initialized = true; localStorage.setItem('user', JSON.stringify(a.payload)) })
    .addCase(restoreSession.rejected, (s) => { s.user = null; s.accessToken = null; s.loading = false; s.initialized = true; clear() })
    .addCase(login.pending, (s) => { s.loading = true }).addCase(register.pending, (s) => { s.loading = true })
    .addCase(login.fulfilled, (s, a) => { s.user = a.payload.user; s.accessToken = a.payload.accessToken; s.loading = false; s.initialized = true; persist(a.payload.user, a.payload.accessToken) })
    .addCase(register.fulfilled, (s, a) => { s.user = a.payload.user; s.accessToken = a.payload.accessToken; s.loading = false; s.initialized = true; persist(a.payload.user, a.payload.accessToken) })
    .addCase(login.rejected, (s) => { s.loading = false }).addCase(register.rejected, (s) => { s.loading = false })
    .addCase(logout.fulfilled, (s) => { s.user = null; s.accessToken = null; clear() })
})
export const { sessionExpired, tokenRefreshed } = authSlice.actions
export default authSlice.reducer
