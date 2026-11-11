import { baseApi } from '../../shared/http/baseApi'
import { endSession, establishSession, type AuthSession } from './sessionLifecycle'

type Credentials = { email: string; password: string }
type Registration = Credentials & { name: string }
type SessionRequest = {
  dispatch: Parameters<typeof establishSession>[0]
  queryFulfilled: Promise<{ data: AuthSession }>
}

async function signIn({ dispatch, queryFulfilled }: SessionRequest) {
  try {
    establishSession(dispatch, (await queryFulfilled).data)
  } catch {
    // the failed request is reported to the caller through the mutation result
  }
}

const authApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    login: build.mutation<AuthSession, Credentials>({
      query: (body) => ({ url: '/auth/login', method: 'POST', body, auth: false }),
      onQueryStarted: (_, api) => signIn(api)
    }),
    register: build.mutation<AuthSession, Registration>({
      query: (body) => ({ url: '/auth/register', method: 'POST', body, auth: false }),
      onQueryStarted: (_, api) => signIn(api)
    }),
    logout: build.mutation<void, void>({
      query: () => ({ url: '/auth/logout', method: 'POST', auth: false }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled
        } catch {
          // the session ends locally whether or not the server could be told
        }
        endSession(dispatch)
      }
    })
  })
})

export const { useLoginMutation, useLogoutMutation, useRegisterMutation } = authApi
