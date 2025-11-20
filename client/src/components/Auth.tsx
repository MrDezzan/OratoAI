import { useState, useContext, ChangeEvent, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerInit, loginInit, verifyCode, RegisterRequest } from '../api'; // Импорт типизированных запросов
import { AuthContext } from '../AuthContext';
import { Loader2, ShieldCheck, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { AxiosError } from 'axios'; // Для типизации ошибок запроса

// Тип ответа с ошибкой (от нашего Go-сервера)
interface ErrorResponse {
  error: string;
}

const Auth = () => {
  // useContext(AuthContext) может вернуть null, поэтому проверяем или делаем cast
  const auth = useContext(AuthContext);
  const setAuth = auth?.setAuth || (() => {}); // Fallback если вдруг null
  
  const navigate = useNavigate();
  
  const [isLogin, setIsLogin] = useState(true);
  const [step, setStep] = useState<'INIT' | 'VERIFY'>('INIT'); // Enum строк
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState<RegisterRequest>({ 
    username: '', 
    email: '', 
    password: '', 
    telegramId: '' 
  });
  const [otp, setOtp] = useState('');

  // Шкала пароля (аргумент pass - строка)
  const getPasswordStrength = (pass: string) => {
    let score = 0;
    if (!pass) return 0;
    if (pass.length > 5) score += 1;
    if (pass.length > 9) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;
    return score;
  };
  
  const strength = getPasswordStrength(formData.password);
  const strengthColor = ['#334155', '#ef4444', '#f97316', '#eab308', '#84cc16', '#10b981'];
  const strengthLabel = ['-', 'Слабый', 'Средний', 'Нормальный', 'Хороший', 'Отличный'];

  // Типизация события input
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Типизация отправки формы
  const handleInitSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      if (isLogin) {
        const res = await loginInit({ email: formData.email, password: formData.password });
        
        // res.data уже типизировано! (AuthResponse)
        if (res.data.token) {
            setAuth(res.data.token);
            toast.success('С возвращением! 👋');
            navigate('/practice');
            return;
        }
      } else {
        await registerInit(formData);
      }
      
      toast.success('Код отправлен в Telegram ✈️');
      setStep('VERIFY');
    } catch (err) {
      const axiosError = err as AxiosError<ErrorResponse>;
      // TypeScript знает, что внутри data может быть { error: string }
      const msg = axiosError.response?.data?.error || 'Ошибка сервера';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await verifyCode({ email: formData.email, code: otp });
      
      if (isLogin) {
        if (res.data.token) {
          setAuth(res.data.token);
          toast.success('Вход выполнен успешно! 🚀');
          navigate('/practice');
        }
      } else {
        toast.success('Регистрация завершена! 🎉 Теперь войдите.');
        setIsLogin(true);
        setStep('INIT');
        setOtp('');
        // Сброс пароля в форме
        setFormData(prev => ({ ...prev, password: '' }));
      }
    } catch (err) {
      const axiosError = err as AxiosError<ErrorResponse>;
      const msg = axiosError.response?.data?.error || 'Неверный код';
      setError(msg);
      toast.error(msg + ' ❌');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '70vh' }}>
      <div className="card" style={{ width: '400px' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <ShieldCheck size={48} color="var(--primary)" style={{ marginBottom: '1rem' }} />
          <h2 style={{ margin: 0 }}>{isLogin ? 'Вход' : 'Регистрация'}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {step === 'VERIFY' ? 'Введите код из Telegram' : 'Защищено 2FA'}
          </p>
        </div>

        {error && (
          <div style={{ background: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e', padding: '10px', borderRadius: '8px', marginBottom: '1rem', textAlign: 'center' }}>
            {error}
          </div>
        )}

        {step === 'INIT' ? (
          <form onSubmit={handleInitSubmit} autoComplete="on">
            {!isLogin && (
              <>
                <input 
                  name="username" 
                  placeholder="Имя" 
                  onChange={handleChange} 
                  required 
                />
                <div style={{ marginBottom: '1.2rem' }}>
                  <input 
                    name="telegramId" 
                    placeholder="Telegram Chat ID" 
                    onChange={handleChange} 
                    required 
                  />
                  <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block', marginTop: '-10px' }}>
                    Напишите <b>/start</b> нашему боту, чтобы узнать ID
                  </small>
                </div>
              </>
            )}
            
            <input 
              name="email" 
              type="email" 
              placeholder="Email" 
              autoComplete="email"
              onChange={handleChange} 
              required 
            />
            
            <div style={{ marginBottom: '1.5rem' }}>
              <input 
                name="password" 
                type="password" 
                placeholder="Пароль" 
                autoComplete={isLogin ? "current-password" : "new-password"}
                onChange={handleChange} 
                required 
              />
              
              {!isLogin && formData.password && (
                <div style={{ marginTop: '-0.5rem' }}>
                   <div style={{ height: '4px', background: '#334155', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(strength / 5) * 100}%`, background: strengthColor[strength], transition: '0.3s' }}></div>
                   </div>
                   <div style={{ textAlign: 'right', fontSize: '0.75rem', color: strengthColor[strength], marginTop: '4px' }}>
                     {strengthLabel[strength]}
                   </div>
                </div>
              )}
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? <Loader2 className="spin" /> : (isLogin ? 'Далее' : 'Получить код')}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifySubmit} className="fade-in">
            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
              <Send color="var(--primary)" size={32} />
            </div>
            

            <input 
              key="otp-input"
              name="otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={otp} 
              onChange={(e) => setOtp(e.target.value)} 
              placeholder="123456" 
              style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '5px' }}
              maxLength={6} 
              required
            />
            
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? <Loader2 className="spin" /> : 'Подтвердить'}
            </button>
            <p onClick={() => setStep('INIT')} style={{ textAlign: 'center', marginTop: '1rem', cursor: 'pointer', color: 'var(--text-muted)' }}>Назад</p>
          </form>
        )}

        {step === 'INIT' && (
          <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-muted)' }}>
            {isLogin ? 'Нет аккаунта? ' : 'Уже есть аккаунт? '}
            <span style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => { setIsLogin(!isLogin); setStep('INIT'); }}>
              {isLogin ? 'Создать' : 'Войти'}
            </span>
          </p>
        )}
      </div>
    </div>
  );
};

export default Auth;