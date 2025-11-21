import axios, { InternalAxiosRequestConfig } from 'axios';

// --- 1. Типы данных (Контракт с Go сервером) ---

// Ответы авторизации (Токен, Шаг верификации или Ошибка)
export interface AuthResponse {
  token?: string;
  message?: string;
  step?: string; // "VERIFY"
  error?: string;
}

// Данные для регистрации (что отправляем)
export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  telegramId: string; // Строка, так как с Input всегда приходит string
}

// Данные для входа
export interface LoginRequest {
  email: string;
  password: string;
}

// Данные для проверки кода
export interface VerifyRequest {
  email: string;
  code: string;
}

// Результат анализа речи (совпадает с JSON от Gemini + Pace из Go)
export interface AnalysisData {
  clarityScore: number;
  pace: number;
  fillerWords: string[];
  feedback: string;
  tip: string;
  transcript?: string; // В истории есть, при анализе сразу может не быть в ответе, но полезно знать
}

// Элемент истории (наследует анализ + добавляет ID и Дату)
export interface HistoryItem extends AnalysisData {
  id: number;
  transcript: string;
  date: string; // ISO string date
}

export interface CompanionResponse {
  reply: string;
}

export interface UserProfile {
  username: string;
  xp: number;
  level: number;
  nextLvlXp: number; // Максимум XP для текущего уровня (для прогресс бара)
  streak: number;
  badges: string[];  // Массив ID бейджей, например ["clean_speaker", "level_5"]
  title: string;     // Звание (Новичок, Легенда)
}

// --- 2. Настройка Axios ---

export const api = axios.create({
  // В продакшене лучше использовать import.meta.env.VITE_API_URL
  baseURL: 'http://localhost:5000/api',
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- 3. Методы API ---

// АВТОРИЗАЦИЯ
export const registerInit = async (data: RegisterRequest) => {
  return api.post<AuthResponse>('/auth/register-init', data);
};

export const loginInit = async (data: LoginRequest) => {
  return api.post<AuthResponse>('/auth/login-init', data);
};

export const verifyCode = async (data: VerifyRequest) => {
  return api.post<AuthResponse>('/auth/verify', data);
};

// ФУНКЦИОНАЛ ПРИЛОЖЕНИЯ
export const analyzeSpeech = async (text: string, sec: number) => {
  // Важно: 'durationSeconds' должно совпадать с тем, что ждет Go структура
  return api.post<AnalysisData>('/analyze', { transcript: text, durationSeconds: sec });
};

export const fetchHistory = async () => {
  return api.get<HistoryItem[]>('/history');
};

export const clearHistory = async () => {
  return api.delete<{ msg: string }>('/history');
};

export const chatWithCompanion = async (message: string, mode: string = 'mentor') => {
  return api.post<CompanionResponse>('/companion/chat', { message, mode });
};

export const getProfile = async () => {
  return api.get<UserProfile>('/profile'); 
};