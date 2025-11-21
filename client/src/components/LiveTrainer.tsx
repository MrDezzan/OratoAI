import { useState, useEffect, useRef } from 'react';
import { Mic, Square, Activity, HeartHandshake, Briefcase, Swords } from 'lucide-react';
import { chatWithCompanion } from '../api';
import toast from 'react-hot-toast';
import '../App.css';

type ModeType = 'mentor' | 'interview' | 'debate';

const LiveTrainer = () => {
  const [status, setStatus] = useState<'IDLE' | 'LISTENING' | 'THINKING' | 'SPEAKING'>('IDLE');
  const [lastPhrase, setLastPhrase] = useState("Выберите режим и нажмите микрофон.");
  const [mode, setMode] = useState<ModeType>('mentor');
  
  // Ключи из .env
  const ELEVEN_KEY = import.meta.env.VITE_ELEVEN_API_KEY;
  const VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Rachel (Стандартный, 100% работает)

  // Ссылки
  const audioRef = useRef<HTMLAudioElement | null>(null); // Для MP3
  const recognitionRef = useRef<any>(null);
  const modeRef = useRef<ModeType>('mentor'); // Хак для замыкания

  // Обновляем ref при смене режима
  useEffect(() => { modeRef.current = mode; }, [mode]);

  useEffect(() => {
    // Инициализация распознавания речи (как и раньше)
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.lang = 'ru-RU';

      recognitionRef.current.onresult = async (e: any) => {
        const text = e.results[0][0].transcript;
        handleSend(text);
      };

      recognitionRef.current.onerror = (e: any) => {
        if (e.error !== 'no-speech') {
           setStatus('IDLE');
           toast.error('Не удалось распознать...');
        }
      };

      recognitionRef.current.onend = () => {
        if (status === 'LISTENING') setStatus('IDLE');
      };
    }
  }, []);

  // --- УПРАВЛЕНИЕ СЕССИЕЙ ---
  
  const startSession = () => {
    stopAudio(); // Сброс звука
    setStatus('LISTENING');
    setLastPhrase("Слушаю...");
    try { recognitionRef.current?.start(); } catch {}
  };

  const stopSession = () => {
    stopAudio();
    recognitionRef.current?.stop();
    setStatus('IDLE');
  };

  const stopAudio = () => {
    if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
    }
  };

  // --- ОБРАБОТКА СООБЩЕНИЯ ---

  const handleSend = async (text: string) => {
    setStatus('THINKING');
    setLastPhrase(`Вы: "${text}"`);

    try {
      // 1. Идем к Gemini за текстом ответа
      const res = await chatWithCompanion(text, modeRef.current);
      const replyText = res.data.reply;
      
      setLastPhrase(replyText);
      
      // 2. Идем к ElevenLabs за звуком (ОЗВУЧКА)
      await streamAudioFromEleven(replyText);

    } catch (e) {
      console.error(e);
      setStatus('IDLE');
      toast.error('Сбой ИИ или Сети');
    }
  };

  // --- ELEVEN LABS TTS ---
  const streamAudioFromEleven = async (text: string) => {
    if (!ELEVEN_KEY) {
        toast.error("Нет API ключа ElevenLabs");
        setStatus('IDLE');
        return;
    }

    try {
        // Запрос к API ElevenLabs
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
            method: 'POST',
            headers: {
                'xi-api-key': ELEVEN_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: text,
                model_id: "eleven_multilingual_v2", // <--- ВАЖНО ДЛЯ РУССКОГО
                voice_settings: {
                    stability: 0.5,       // Экспрессия (ниже - больше эмоций)
                    similarity_boost: 0.8 // Похожесть голоса
                }
            })
        });

        if (!response.ok) throw new Error("ElevenLabs API Error");

        // Получаем аудио-файл (Blob)
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        
        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        // Запуск визуализации
        audio.onplay = () => setStatus('SPEAKING');
        audio.onended = () => setStatus('IDLE');
        
        // Запуск звука
        audio.play();

    } catch (err) {
        console.error("TTS Error:", err);
        toast.error("Не удалось озвучить текст");
        setStatus('IDLE');
    }
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '75vh', gap: '2rem' }}>
      
      {/* Выбор режима */}
      <div style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '6px', borderRadius: '16px', marginBottom:'1rem' }}>
          <ModeBtn label="Ментор" active={mode === 'mentor'} onClick={() => setMode('mentor')} color="#10b981" icon={<HeartHandshake size={16}/>} />
          <ModeBtn label="Интервью" active={mode === 'interview'} onClick={() => setMode('interview')} color="#8b5cf6" icon={<Briefcase size={16}/>} />
          <ModeBtn label="Дебаты" active={mode === 'debate'} onClick={() => setMode('debate')} color="#f43f5e" icon={<Swords size={16}/>} />
      </div>

      {/* Визуал Эквалайзер */}
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

      {/* Блок текста */}
      <div className="card" style={{ 
          minWidth: '300px', maxWidth: '650px', minHeight: '120px', 
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize: '1.3rem', padding: '2rem', lineHeight: '1.6', textAlign: 'center',
          border: status === 'SPEAKING' ? `2px solid ${getColor(mode)}` : '1px solid var(--glass-border)',
          boxShadow: status === 'SPEAKING' ? `0 0 40px ${getColor(mode, 0.25)}` : 'none',
          transition: 'all 0.4s ease'
      }}>
          <p style={{ margin: 0 }}>{lastPhrase}</p>
      </div>

      {/* Кнопки */}
      {status === 'IDLE' ? (
        <button onClick={startSession} className="btn btn-primary" style={{borderRadius: '50px', padding: '1rem 3.5rem', fontSize:'1.2rem', background: `linear-gradient(135deg, ${getColor(mode)}, #111)`}}>
          <Mic size={24} /> Начать
        </button>
      ) : (
        <button onClick={stopSession} className="btn btn-danger" style={{borderRadius: '50px', padding: '1rem 3.5rem', fontSize:'1.2rem'}}>
          <Square size={20} fill="white"/> Стоп
        </button>
      )}
    </div>
  );
};

// Helper Styles
const ModeBtn = ({label, active, onClick, color, icon}: any) => (
    <button onClick={onClick} style={{
        background: active ? color : 'transparent', color: active ? 'white' : 'var(--text-muted)',
        border: 'none', padding: '0.6rem 1rem', borderRadius: '10px',
        cursor: 'pointer', display:'flex', gap:'6px', alignItems:'center', fontWeight:'bold', fontSize:'0.9rem',
        transition: 'all 0.2s', boxShadow: active ? `0 0 15px ${color}66` : 'none'
    }}> {icon} {label} </button>
)

const getColor = (mode: string, alpha = 1) => {
    if (mode === 'interview') return `rgba(139, 92, 246, ${alpha})`; 
    if (mode === 'debate') return `rgba(244, 63, 94, ${alpha})`; 
    return `rgba(16, 185, 129, ${alpha})`; 
}

export default LiveTrainer;