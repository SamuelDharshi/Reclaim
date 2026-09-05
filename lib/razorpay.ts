// Razorpay REST API client — typed wrapper for test-mode API calls
// Uses Basic Auth: key_id:key_secret
// Base URL: https://api.razorpay.com/v1/

const BASE_URL = 'https://api.razorpay.com/v1'

function getAuthHeader(): string {
  const keyId = process.env.RAZORPAY_KEY_ID!
  const keySecret = process.env.RAZORPAY_KEY_SECRET!
  const credentials = Buffer.from(`${keyId}:${keySecret}`).toString('base64')
  return `Basic ${credentials}`
}

async function razorpayFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE_URL}${path}`
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: getAuthHeader(),
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`Razorpay API error ${res.status}: ${error}`)
  }

  return res.json() as Promise<T>
}

// ---- Types ----

export interface RazorpayPayment {
  id: string
  entity: string
  amount: number
  currency: string
  status: string
  order_id: string | null
  description: string | null
  email: string | null
  contact: string | null
  created_at: number
  error_code: string | null
  error_description: string | null
  error_source: string | null
  error_step: string | null
  error_reason: string | null
  error_metadata: Record<string, unknown> | null
  notes: Record<string, string>
}

export interface RazorpayOrder {
  id: string
  entity: string
  amount: number
  amount_paid: number
  amount_due: number
  currency: string
  status: string
  attempts: number
  created_at: number
  notes: Record<string, string>
}

export interface RazorpaySubscription {
  id: string
  entity: string
  plan_id: string
  status: string
  current_start: number | null
  current_end: number | null
  charge_at: number | null
  start_at: number | null
  end_at: number | null
  auth_attempts: number
  total_count: number
  paid_count: number
  customer_notify: boolean
  created_at: number
  quantity: number
  notes: Record<string, string>
}

export interface RazorpayPaymentLink {
  id: string
  short_url: string
  amount: number
  currency: string
  status: string
  description: string
  created_at: number
  expire_by: number | null
}

export interface RazorpayListResponse<T> {
  entity: string
  count: number
  items: T[]
}

// ---- API Methods ----

/**
 * Fetch failed payments from last N seconds
 */
export async function fetchFailedPayments(fromTimestamp?: number): Promise<RazorpayPayment[]> {
  const params = new URLSearchParams({
    count: '100',
  })
  if (fromTimestamp) {
    params.set('from', fromTimestamp.toString())
  }

  try {
    const data = await razorpayFetch<RazorpayListResponse<RazorpayPayment>>(
      `/payments?${params}`
    )
    // Filter for failed payments
    return data.items.filter((p) => p.status === 'failed')
  } catch (err) {
    console.error('fetchFailedPayments error:', err)
    return []
  }
}

/**
 * Fetch orders — used to detect abandoned checkouts
 */
export async function fetchOrders(count = 100): Promise<RazorpayOrder[]> {
  try {
    const data = await razorpayFetch<RazorpayListResponse<RazorpayOrder>>(
      `/orders?count=${count}`
    )
    return data.items
  } catch (err) {
    console.error('fetchOrders error:', err)
    return []
  }
}

/**
 * Fetch all payments for a specific order
 */
export async function fetchPaymentsForOrder(orderId: string): Promise<RazorpayPayment[]> {
  try {
    const data = await razorpayFetch<RazorpayListResponse<RazorpayPayment>>(
      `/orders/${orderId}/payments`
    )
    return data.items
  } catch (err) {
    console.error('fetchPaymentsForOrder error:', err)
    return []
  }
}

/**
 * Fetch subscriptions — used to detect failed mandate debits
 */
export async function fetchSubscriptions(count = 100): Promise<RazorpaySubscription[]> {
  try {
    const data = await razorpayFetch<RazorpayListResponse<RazorpaySubscription>>(
      `/subscriptions?count=${count}`
    )
    return data.items
  } catch (err) {
    console.error('fetchSubscriptions error:', err)
    return []
  }
}

/**
 * Create a payment link for recovery
 */
export async function createPaymentLink(params: {
  amount: number
  currency?: string
  description: string
  customerName?: string
  customerEmail?: string
  customerPhone?: string
  callbackUrl?: string
  expireBy?: number
}): Promise<RazorpayPaymentLink> {
  const payload: Record<string, unknown> = {
    amount: params.amount,
    currency: params.currency ?? 'INR',
    description: params.description,
    callback_url: params.callbackUrl ?? `${process.env.NEXT_PUBLIC_APP_URL}/recovery-complete`,
    callback_method: 'get',
    reminder_enable: false,
  }

  if (params.customerName || params.customerEmail || params.customerPhone) {
    payload.customer = {
      name: params.customerName ?? 'Customer',
      email: params.customerEmail,
      contact: params.customerPhone,
    }
  }

  if (params.expireBy) {
    payload.expire_by = params.expireBy
  }

  return razorpayFetch<RazorpayPaymentLink>('/payment_links', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/**
 * Fetch a specific payment by ID
 */
export async function fetchPayment(paymentId: string): Promise<RazorpayPayment> {
  return razorpayFetch<RazorpayPayment>(`/payments/${paymentId}`)
}

/**
 * Create a test order (for seeding)
 */
export async function createTestOrder(amount: number, currency = 'INR'): Promise<RazorpayOrder> {
  return razorpayFetch<RazorpayOrder>('/orders', {
    method: 'POST',
    body: JSON.stringify({
      amount,
      currency,
      receipt: `reclaim_seed_${Date.now()}`,
      notes: { source: 'reclaim_seed' },
    }),
  })
}
