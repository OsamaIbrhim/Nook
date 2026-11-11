import { http, HttpResponse } from 'msw'
import type { ShopConfig } from '../shared/contract/types'

export const shopConfig: ShopConfig = {
  currency: 'egp',
  locale: 'en-US',
  freeShippingThreshold: 200,
  flatShippingRate: 50,
  returnWindowDays: 30,
  dispatchDaysMin: 1,
  dispatchDaysMax: 2,
  maxLineQuantity: 99,
  reservationMinutes: 35,
  supportEmail: 'hello@nook.store',
  shipsTo: ['EG']
}

export const shopConfigHandler = http.get('http://localhost:3000/api/v1/shop/config', () =>
  HttpResponse.json({ success: true, data: shopConfig })
)
