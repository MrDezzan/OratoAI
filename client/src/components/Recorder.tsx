import { useState, useEffect, useRef, useTransition } from 'react';
import { Mic, StopCircle, Loader2, CheckCircle2, Sparkles, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { analyzeSpeech, AnalysisData } from '../api'; // Импортируем тип данных
import { AxiosError } from 'axios';

// --- Типизация Web Speech API ---
// Так как это экспериментальный API, мы описываем его сами,
// чтобы TS понимал методы .start(), .stop() и события.
interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: (event: any) => void; // event type is complex, 'any' is acceptable for simple MVP
  onerror: (event: any) => void;
}

// Расширяем глобальный объект Window, чтобы TS видел эти свойства
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const Recorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  // Дженерик указывает: тут либо полные данные анализа, либо null
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [timer, setTimer] = useState(0);
  const [showFillers, setShowFillers] = useState(false);
  
  const [isPending, startTransition] = useTransition();
  
  // Ссылки
  const transcriptRef = useRef<string>(''); 
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  // ReturnType<typeof setInterval> универсален для Node и Browser окружения
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognitionCtor();
      
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'ru-RU';

      recognition.onresult = (e: any) => {
        let finalChunk = '';
        for (let i = e.resultIndex; i < e.results.length; ++i) {
          if (e.results[i].isFinal) {
            finalChunk += e.results[i][0].transcript + ' ';
          }
        }
        if (finalChunk) {
          transcriptRef.current += finalChunk;
          setTranscript(prev => prev + finalChunk);
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech Error:", event.error);
        if (event.error === 'not-allowed') {
            toast.error('Доступ к микрофону запрещен! Разрешите его в настройках.');
        }
      };

      recognitionRef.current = recognition;
    } else {
        toast.error('Ваш браузер не поддерживает распознавание речи 😢');
    }

    // Cleanup при размонтировании
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (recognitionRef.current) try { recognitionRef.current.stop(); } catch {}
    };
  }, []);

  const startRecording = () => {
    setTranscript('');
    transcriptRef.current = ''; 
    setAnalysis(null);
    setTimer(0);
    setShowFillers(false);
    setIsRecording(true);
    
    try {
        recognitionRef.current?.start();
        // Таймер
        intervalRef.current = setInterval(() => setTimer(t => t + 1), 1000);
    } catch (e) { 
      console.error(e); 
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (recognitionRef.current) recognitionRef.current.stop();
    if (intervalRef.current) clearInterval(intervalRef.current);
    
    // Небольшая задержка перед анализом
    setTimeout(() => handleAnalysis(), 1000);
  };

  const handleAnalysis = () => {
      const textToAnalyze = transcriptRef.current;

      if (!textToAnalyze || textToAnalyze.trim().length === 0) {
          toast('Я ничего не услышал. Попробуйте громче! 🎤', { icon: '🤔' });
          return;
      }

      startTransition(async () => {
        try {
          const res = await analyzeSpeech(textToAnalyze, timer);
          setAnalysis(res.data);
          toast.success('Анализ готов! Смотрите ниже 👇');
        } catch (e) {
          console.error(e);
          const axiosError = e as AxiosError<{error: string}>;
          const msg = axiosError.response?.data?.error || 'Ошибка связи с сервером ИИ';
          toast.error(msg);
        }
      });
  };

  return (
    <div className="fade-in">
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1>Тренировка Речи</h1>
        <p style={{ color: 'var(--text-muted)' }}>Говорите свободно. Анализ запустится автоматически.</p>
      </div>

      <div className="card" style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div className="timer-display">
          {Math.floor(timer / 60)}:{String(timer % 60).padStart(2, '0')}
        </div>
        
        {!isRecording ? (
          <button onClick={startRecording} className="btn btn-primary" disabled={isPending} style={{ fontSize: '1.1rem', padding: '1rem 2.5rem', borderRadius: '50px' }}>
            {isPending ? <Loader2 className="spin" /> : <Mic />} 
            {isPending ? 'Анализирую...' : 'Начать запись'}
          </button>
        ) : (
          <button onClick={stopRecording} className="btn btn-danger" style={{ fontSize: '1.1rem', padding: '1rem 2.5rem', borderRadius: '50px' }}>
            <StopCircle className="spin" /> Стоп
          </button>
        )}

        <div className="transcript-box">
          {transcript || <span style={{opacity: 0.5}}>Нажмите запись и говорите...</span>}
        </div>
      </div>

      {isPending && (
          <div style={{ textAlign: 'center', margin: '2rem 0' }}><Loader2 className="spin" size={40} color="var(--primary)"/></div>
      )}

      {analysis && (
        <div className="card result-section">
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div className="score-circle">
              <div className="score-value">{analysis.clarityScore}</div>
              <div className="score-label">Баллов</div>
            </div>
            <h2 style={{ margin: 0 }}>Анализ завершен <Sparkles size={24} color="var(--accent)"/></h2>
          </div>

          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-val">{analysis.pace}</div>
              <div className="metric-label">Слов / Мин</div>
            </div>

            <div 
              className="metric-card interactive-card" 
              onClick={() => setShowFillers(!showFillers)}
              title="Нажмите, чтобы увидеть список"
            >
              <div className="metric-val" style={{ color: analysis.fillerWords.length > 0 ? 'var(--danger)' : 'var(--success)' }}>
                {analysis.fillerWords.length}
              </div>
              <div className="metric-label" style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px'}}>
                Слов-паразитов <ChevronDown size={14} style={{ transform: showFillers ? 'rotate(180deg)' : 'none', transition: '0.3s' }}/>
              </div>
              {showFillers && (
                <div className="fillers-list fade-in">
                  {analysis.fillerWords.length > 0 ? (
                    analysis.fillerWords.map((word, idx) => <span key={idx} className="filler-tag">{word}</span>)
                  ) : (
                    <span style={{color: 'var(--success)', fontSize: '0.9rem'}}>Чистая речь! 🎉</span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div style={{ marginTop: '2rem', display: 'grid', gap: '1rem' }}>
             <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '1.5rem', borderRadius: '1rem', borderLeft: '4px solid #10b981' }}>
                <h3 style={{ color: '#10b981', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={20} /> Что хорошо:
                </h3>
                <p style={{ margin: '0.5rem 0 0', lineHeight: '1.6' }}>{analysis.feedback}</p>
             </div>
             <div style={{ background: 'rgba(6, 182, 212, 0.1)', padding: '1.5rem', borderRadius: '1rem', borderLeft: '4px solid var(--accent)' }}>
                <h3 style={{ color: 'var(--accent)', margin: 0 }}>💡 Зона роста:</h3>
                <p style={{ margin: '0.5rem 0 0', lineHeight: '1.6' }}>{analysis.tip}</p>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Recorder;