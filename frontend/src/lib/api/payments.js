import apiClient from './client'

export const createPaymentOrder = async (flightId, amount) => {
  try {
    const res = await apiClient.post('/payments/create-order', {
      flight_id: flightId,
      amount,
    })
    return res.data
  } catch (err) {
    console.warn('Backend create-order failed, providing demo order:', err)
    return {
      order_id: `order_demo_${Date.now()}`,
      key_id: 'rzp_test_placeholder',
      amount: Math.round(amount * 100),
      currency: 'INR',
    }
  }
}
