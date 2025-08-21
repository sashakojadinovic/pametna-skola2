/**
 * File: axiosInstance.js
 * Path: /frontend/src/api
 * Author: Saša Kojadinović
 */
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api',
  headers: { 'Content-Type': 'application/json' }
})

export default api
