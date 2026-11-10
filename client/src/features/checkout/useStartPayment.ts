import { redirectTo } from '../../shared/http/redirect'
import { useCreateCheckoutSessionMutation } from './api'

export function useStartPayment() {
  const [createSession] = useCreateCheckoutSessionMutation()
  return async (orderId: string) => {
    const session = await createSession(orderId).unwrap()
    redirectTo(session.url)
  }
}
