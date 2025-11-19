import axios from 'axios';

export const api = axios.create({
  baseURL: 'http://localhost:5000/api',
});


api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// аВТОРИЗАЦИЯ 
export const registerInit = async (data) => api.post('/auth/register-init', data);
export const loginInit = async (data) => api.post('/auth/login-init', data);
export const verifyCode = async (data) => api.post('/auth/verify', data);

// ФУНКЦИОНАЛ ПРИЛОЖЕНИЯ
export const analyzeSpeech = async (text, sec) => {
  return api.post('/analyze', { transcript: text, durationSeconds: sec });
};

export const fetchHistory = async () => {
  return api.get('/history');
};

export const clearHistory = async () => {
  return api.delete('/history');
};