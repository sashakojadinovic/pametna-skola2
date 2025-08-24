/**
 * File: axiosInstance.js
 * Path: /frontend/src/api
 * Author: Saša Kojadinović
 */
import axios from 'axios';

function buildBaseURL() {
  let env = import.meta.env.VITE_API_BASE;
  if (env) {
    // ako nema http://, dodaj ga
    if (!/^https?:\/\//i.test(env)) {
      const { protocol } = window.location;
      env = env.replace(/^\/+/, '');
      return `${protocol}//${env}`;
    }
    return env;
  }
  // fallback: koristi hostname + :3000
  const { protocol, hostname } = window.location;
  return `${protocol}//${hostname}:3000/api`;
}

const api = axios.create({
  baseURL: buildBaseURL(),
  headers: { 'Content-Type': 'application/json' },
});

export default api;
