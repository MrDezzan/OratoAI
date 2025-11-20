import { useState, useEffect, useRef } from 'react';
import { Mic, Square, Activity, HeartHandshake, Briefcase, Swords } from 'lucide-react';
import { chatWithCompanion } from '../api';
import toast from 'react-hot-toast';
import '../App.css';

type ModeType = 'mentor' | 'interview' | 'debate';

const LiveTrainer = () => {
  const [status, setStatus] = useState<'IDLE' | 'LISTENING' | 'THINKING' | 'SPEAKING'>('IDLE');
  const [lastPhrase, setLastPhrase] = useState("Выберите режим и нажмите микрофон.");
  
  // НОВЫЙ СТЕЙТ РЕЖИМА
  const [mode, setMode] = useState<ModeType>('mentor');
  
  // Для хака голоса в Linux/Chrome
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Принудительная подгрузка голосов
    const initVoices = () => window.speechSynthesis.getVoices();
    initVoices();
    window.speechSynthesis.onvoiceschanged = initVoices;

    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.lang = 'ru-RU';

      recognitionRef.current.onresult = async (e: any) => {
        handleSend(e.results[0][0].transcript);
      };

      recognitionRef.current.onerror = (e: any) => {
        console.error(e);
        setStatus('IDLE');
        if (e.error === 'not-allowed') toast.error('Нет доступа к микрофону');
      };

      recognitionRef.current.onend = () => {
        if (status === 'LISTENING') setStatus('IDLE');
      };
    }
  }, []);

  const startSession = () => {
    window.speechSynthesis.cancel();
    setStatus('LISTENING');
    setLastPhrase("Слушаю...");
    recognitionRef.current?.start();
  };

  const stopSession = () => {
    window.speechSynthesis.cancel();
    recognitionRef.current?.stop();
    setStatus('IDLE');
  };

  const handleSend = async (text: string) => {
    setStatus('THINKING');
    setLastPhrase(`Вы: "${text}"`);

    try {
      // ПЕРЕДАЕМ ВЫБРАННЫЙ MODE
      const res = await chatWithCompanion(text, mode);
      const reply = res.data.reply;
      setLastPhrase(reply);
      speak(reply);
    } catch (e) {
      setStatus('IDLE');
      toast.error('Сбой ИИ');
    }
  };

  const speak = (text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    synthRef.current = utterance;

    // Немного меняем интонацию в зависимости от режима
    if (mode === 'interview') {
        utterance.rate = 0.9; // Медленнее, строже
        utterance.pitch = 0.8; 
    } else if (mode === 'debate') {
        utterance.rate = 1.15; // Быстрее, агрессивнее
        utterance.pitch = 1.0;
    } else {
        utterance.rate = 1.1; // Позитивный ментор
        utterance.pitch = 1.1;
    }

    const voices = window.speechSynthesis.getVoices();
    // Пытаемся найти хороший русский голос (Google preferred)
    const ruVoice = voices.find(v => v.name.includes('Google') && v.lang.includes('ru')) || 
                    voices.find(v => v.lang.includes('ru'));
    
    if (ruVoice) utterance.voice = ruVoice;

    utterance.onstart = () => setStatus('SPEAKING');
    utterance.onend = () => setStatus('IDLE');
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="fade-in" style={{ 
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
        height: '80vh', gap: '1.5rem' 
    }}>
      
      {/* ВЫБОР РЕЖИМА (КРАСИВЫЕ КНОПКИ) */}
      <div className="mode-selector" style={{ display: 'flex', gap: '10px', background: 'rgba(0,0,0,0.3)', padding: '5px', borderRadius: '12px' }}>
          
          <button 
            onClick={() => setMode('mentor')}
            className={`mode-btn ${mode === 'mentor' ? 'active' : ''}`}
            style={getBtnStyle(mode === 'mentor', 'var(--success)')}
          >
             <HeartHandshake size={18}/> Ментор
          </button>

          <button 
            onClick={() => setMode('interview')}
            className={`mode-btn ${mode === 'interview' ? 'active' : ''}`}
            style={getBtnStyle(mode === 'interview', 'var(--primary)')}
          >
             <Briefcase size={18}/> Собеседование
          </button>

          <button 
            onClick={() => setMode('debate')}
            className={`mode-btn ${mode === 'debate' ? 'active' : ''}`}
            style={getBtnStyle(mode === 'debate', 'var(--danger)')}
          >
             <Swords size={18}/> Дебаты
          </button>
      </div>

      {/* ВИЗУАЛ */}
      <div style={{ height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {status === 'IDLE' && <Activity size={64} color="var(--text-muted)" style={{opacity:0.3}} />}
        {status === 'LISTENING' && <div className="pulse-mic"><Mic size={64} color="var(--primary)" /></div>}
        {status === 'THINKING' && <div className="loader-dots"><span></span><span></span><span></span></div>}
        {status === 'SPEAKING' && (
            <div className="voice-wave">
                <div className="bar"></div><div className="bar"></div><div className="bar"></div><div className="bar"></div><div className="bar"></div>
            </div>
        )}
      </div>

      {/* ТЕКСТ */}
      <div className="card" style={{ 
          minWidth: '300px', maxWidth: '600px', minHeight: '120px', 
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize: '1.25rem', padding: '2rem', lineHeight: '1.5', textAlign: 'center',
          border: status === 'SPEAKING' ? `1px solid ${getColor(mode)}` : '1px solid var(--glass-border)',
          boxShadow: status === 'SPEAKING' ? `0 0 30px ${getColor(mode, 0.2)}` : 'none',
          transition: 'all 0.3s ease'
      }}>
          <p style={{ margin: 0 }}>{lastPhrase}</p>
      </div>

      {/* УПРАВЛЕНИЕ */}
      {status === 'IDLE' ? (
        <button onClick={startSession} className="btn btn-primary" style={{borderRadius: '50px', padding: '1rem 3rem', fontSize:'1.2rem', background: `linear-gradient(135deg, ${getColor(mode)}, #000)`}}>
          <Mic size={24} /> Ответить
        </button>
      ) : (
        <button onClick={stopSession} className="btn btn-danger" style={{borderRadius: '50px', padding: '1rem 3rem', fontSize:'1.2rem'}}>
          <Square size={20} fill="white"/> Стоп
        </button>
      )}
      
      <p style={{color:'var(--text-muted)', fontSize:'0.9rem'}}>
        Текущая роль: {mode === 'interview' ? 'Строгий HR' : mode === 'debate' ? 'Оппонент' : 'Добрый наставник'}
      </p>
    </div>
  );
};

// Helper Styles
const getColor = (mode: string, alpha = 1) => {
    if (mode === 'interview') return `rgba(139, 92, 246, ${alpha})`; // primary
    if (mode === 'debate') return `rgba(244, 63, 94, ${alpha})`; // danger
    return `rgba(16, 185, 129, ${alpha})`; // success
}

const getBtnStyle = (isActive: boolean, color: string) => ({
    background: isActive ? color : 'transparent',
    color: isActive ? '#fff' : 'var(--text-muted)',
    border: 'none',
    padding: '0.6rem 1.2rem',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    fontSize: '0.9rem',
    fontWeight: 'bold' as const,
    transition: '0.2s'
});

export default LiveTrainer;