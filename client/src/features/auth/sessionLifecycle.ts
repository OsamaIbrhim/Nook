import type { UnknownAction } from '@reduxjs/toolkit'
import { configureHttp, request } from '../../shared/http/client'
import { isApiFailure } from '../../shared/http/errors'
import { baseApi } from '../../shared/http/baseApi'
import type { User } from '../../shared/contract/types'
import { sessionEnded, sessionStarted, type AuthState } from './authSlice'
import { clearSession, getAccessToken, setAccessToken, setSessionHint } from './session'

export type AuthSession = { user: User; accessToken: string }
type SessionStore = { dispatch: (action: UnknownAction) => unknown; getState: () => { auth: AuthState } }
type Dispatch = SessionStore['dispatch']

export function establishSession(dispatch: Dispatch, session: AuthSession) {
  setAccessToken(session.accessToken)
  setSessionHint()
  dispatch(sessionStarted(session.user))
}

export function endSession(dispatch: Dispatch) {
  clearSession()
  dispatch(sessionEnded())
  dispatch(baseApi.util.resetApiState())
}

type Exchange = { kind: 'signed-in'; session: AuthSession } | { kind: 'guest' } | { kind: 'unreachable' }

async function exchangeRefreshCookie(): Promise<Exchange> {
  try {
    const session = await request<AuthSession | undefined>('/auth/refresh', { method: 'POST', auth: false })
    return session ? { kind: 'signed-in', session } : { kind: 'guest' }
  } catch (error) {
    return isApiFailure(error) && error.status === 401 ? { kind: 'guest' } : { kind: 'unreachable' }
  }
}

export function connectSession(store: SessionStore) {
  const refreshSession = async () => {
    const exchange = await exchangeRefreshCookie()
    if (exchange.kind === 'signed-in') {
      establishSession(store.dispatch, exchange.session)
      return exchange.session.accessToken
    }
    if (exchange.kind === 'guest') endSession(store.dispatch)
    return null
  }
  configureHttp({ getToken: getAccessToken, refreshSession })
  if (store.getState().auth.status === 'unknown') {
    void refreshSession().then(() => {
      if (store.getState().auth.status === 'unknown') store.dispatch(sessionEnded())
    })
  }
}
