import { useState, useEffect, useRef, useTransition } from 'react';
// Иконки
import { Mic, StopCircle, Loader2, CheckCircle2, Sparkles, ChevronDown, Dices } from 'lucide-react';
import toast from 'react-hot-toast';
import { analyzeSpeech, AnalysisData } from '../api';
import { AxiosError } from 'axios';
import { TOPICS } from '../topics'; 
// Импортируем компонент графика (убедись, что ты создал файл RadarChartSkill.tsx)
import RadarChartSkill from './RadarChartSkill'; 

interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: (event: any) => void; 
  onerror: (event: any) => void;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const Recorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [timer, setTimer] = useState(0);
  const [showFillers, setShowFillers] = useState(false);
  
  const [currentTopic, setCurrentTopic] = useState<string | null>(null);
  
  const [isPending, startTransition] = useTransition();
  const transcriptRef = useRef<string>(''); 
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const generateTopic = () => {
    const random = TOPICS[Math.floor(Math.random() * TOPICS.length)];
    setCurrentTopic(random);
    if (analysis) setAnalysis(null); 
    setTranscript('');
  };

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
          if (e.results[i].isFinal) finalChunk += e.results[i][0].transcript + ' ';
        }
        if (finalChunk) {
          transcriptRef.current += finalChunk;
          setTranscript(prev => prev + finalChunk);
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'not-allowed') {
            toast.error('Доступ к микрофону запрещен!');
        }
      };
      recognitionRef.current = recognition;
    } else {
        toast.error('Браузер не поддерживает речь 😢');
    }

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
        intervalRef.current = setInterval(() => setTimer(t => t + 1), 1000);
    } catch (e) { console.error(e); }
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (recognitionRef.current) recognitionRef.current.stop();
    if (intervalRef.current) clearInterval(intervalRef.current);
    setTimeout(() => handleAnalysis(), 1000);
  };

  const handleAnalysis = () => {
      const textToAnalyze = transcriptRef.current;
      if (!textToAnalyze || textToAnalyze.trim().length === 0) {
          toast('Я ничего не услышал. Попробуйте громче!', { icon: '🤔' });
          return;
      }
      startTransition(async () => {
        try {
          const res = await analyzeSpeech(textToAnalyze, timer);
          setAnalysis(res.data);
          toast.success('Анализ готов!');
        } catch (e) {
          console.error(e);
          const axiosError = e as AxiosError<{error: string}>;
          const msg = axiosError.response?.data?.error || 'Ошибка ИИ';
          toast.error(msg);
        }
      });
  };

  return (
    <div className="fade-in">
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1>Тренировка Речи</h1>
        <p style={{ color: 'var(--text-muted)' }}>
            Нажмите кнопку, чтобы получить случайную тему, или говорите свободно.
        </p>
        
        <div style={{ marginTop: '1.5rem' }}>
            {currentTopic ? (
                <div className="card" style={{ display: 'inline-flex', flexDirection: 'column', padding: '1.5rem', maxWidth: '600px', animation: 'fadeIn 0.5s' }}>
                    <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--primary)', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                        Тема выступления
                    </span>
                    <span style={{ fontSize: '1.4rem', lineHeight: '1.4', fontWeight: '500' }}>
                        {currentTopic}
                    </span>
                    <button onClick={generateTopic} style={{ marginTop: '1rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.9rem', display:'flex', alignItems:'center', justifyContent:'center', gap:'5px' }}>
                        <Dices size={16} /> Другая тема
                    </button>
                </div>
            ) : (
                <button onClick={generateTopic} className="btn btn-outline">
                    <Dices size={18} /> Генерировать тему
                </button>
            )}
        </div>
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
            
            {/* --- 💎 ГРАФИК НАВЫКОВ 💎 --- */}
            {analysis.metrics && (
                <div style={{ maxWidth: '500px', margin: '0 auto 2rem' }}>
                    <h3 style={{fontSize:'0.9rem', color:'var(--text-muted)', marginBottom:'10px', textTransform:'uppercase'}}>Карта Навыков</h3>
                    <RadarChartSkill metrics={analysis.metrics} />
                </div>
            )}

            <h2 style={{ margin: 0 }}>Анализ завершен <Sparkles size={24} color="var(--accent)"/></h2>
          </div>

          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-val">{analysis.pace}</div>
              <div className="metric-label">Слов / Мин</div>
            </div>

            <div className="metric-card interactive-card" onClick={() => setShowFillers(!showFillers)}>
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