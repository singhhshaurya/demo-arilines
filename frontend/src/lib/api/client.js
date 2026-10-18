import axios from 'axios'
import { getToken } from '../auth'

const RAW_API_URL = (import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || '').trim().replace(/\/+$/, '')
export const API_BASE_URL = RAW_API_URL
  ? (RAW_API_URL.endsWith('/api') ? RAW_API_URL : `${RAW_API_URL}/api`)
  : '/api'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
})

// Request interceptor to attach JWT token
apiClient.interceptors.request.use(
  (config) => {
    const token = getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.warn('API error encountered:', error.response?.status, error.message)
    return Promise.reject(error)
  }
)

export default apiClient
