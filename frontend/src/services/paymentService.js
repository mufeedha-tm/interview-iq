import api from '../lib/api'

export async function fetchPaymentPlans() {
  const { data } = await api.get('/payments/plans')
  return data
}

export async function redirectToPremiumCheckout(planId) {
  const { data } = await api.post('/payments/checkout', { planId })

  if (data.checkoutUrl) {
    window.location.assign(data.checkoutUrl)
    return data
  }

  throw new Error('Checkout URL is missing from backend response. Please verify Stripe server configuration.')
}

export async function confirmPremiumCheckout(sessionId) {
  const { data } = await api.post('/payments/confirm', { sessionId })
  return data
}
