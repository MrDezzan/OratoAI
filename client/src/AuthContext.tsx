import { createContext, useState, ReactNode } from 'react';

// 1. Описываем интерфейс для значения контекста
// Это то, что мы будем получать через useContext(AuthContext)
interface AuthContextType {
  token: string | null;
  setAuth: (newToken: string | null) => void;
}

// Создаем контекст.
// В начале он null, но провайдер сразу даст значение.
export const AuthContext = createContext<AuthContextType | null>(null);

// 2. Типизируем пропсы провайдера
interface AuthProviderProps {
  children: ReactNode; // Стандартный тип для вложенных компонентов
}

export const AuthProvider = ({ children }: AuthProviderProps) => {

  // State может быть строкой (если есть токен) или null
  const [token, setTokenState] = useState<string | null>(localStorage.getItem('token'));

  const setAuth = (newToken: string | null) => {
    if (newToken) {
      localStorage.setItem('token', newToken);
    } else {
      localStorage.removeItem('token');
    }
    setTokenState(newToken);
  };

  return (
    <AuthContext.Provider value={{ token, setAuth }}>
      {children}
    </AuthContext.Provider>
  );
};