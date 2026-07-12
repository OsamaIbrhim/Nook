export type Role = 'customer' | 'admin'
export type User = { _id: string; name: string; email: string; role: Role; isActive: boolean; createdAt: string }
export type Category = { _id: string; name: string; slug: string; description?: string }
export type ProductImage = { url: string; publicId: string; alt: string }
export type Product = {
  _id: string; name: string; slug: string; description: string; price: number; compareAtPrice?: number
  stock: number; category: Category; images: ProductImage[]; isActive: boolean; createdAt: string
}
export type CartItem = { product: Product; quantity: number }
export type Address = { name: string; line1: string; line2?: string; city: string; state?: string; postalCode: string; country: string; phone?: string }
export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
export type PaymentStatus = 'unpaid' | 'paid' | 'failed' | 'refunded'
export type OrderItem = { product: string; name: string; image?: string; unitPrice: number; quantity: number; lineTotal: number }
export type Order = {
  _id: string; user: User | string; items: OrderItem[]; shippingAddress: Address; subtotal: number; shipping: number
  total: number; currency: string; status: OrderStatus; paymentStatus: PaymentStatus; createdAt: string
  statusHistory: { status: OrderStatus; at: string }[]
}
export type Pagination = { page: number; limit: number; total: number; pages: number }
export type ApiResponse<T> = { success: true; data: T }
