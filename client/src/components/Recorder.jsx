import { useState, useEffect, useRef, useTransition } from 'react';
import { Mic, StopCircle, Loader2, CheckCircle2, Sparkles, ChevronDown } from 'lucide-react'; // Добавил иконку ChevronDown
import { analyzeSpeech } from '../api';

const Recorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [timer, setTimer] = useState(0);
  
  // НОВОЕ СОСТОЯНИЕ: Показывать ли список слов-паразитов
  const [showFillers, setShowFillers] = useState(false);

  const [isPending, startTransition] = useTransition();
  
  const transcriptRef = useRef(''); 
  const recognitionRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'ru-RU';

      recognitionRef.current.onresult = (e) => {
        let finalChunk = '';
        for (let i = e.resultIndex; i < e.results.length; ++i) {
          if (e.results[i].isFinal) finalChunk += e.results[i][0].transcript + ' ';
        }
        if (finalChunk) {
          transcriptRef.current += finalChunk;
          setTranscript(prev => prev + finalChunk);
        }
      };
    }
  }, []);

  const startRecording = () => {
    setTranscript('');
    transcriptRef.current = ''; 
    setAnalysis(null);
    setTimer(0);
    setShowFillers(false); // Сбрас раскрытого списка при новой записи
    setIsRecording(true);
    
    try {
        recognitionRef.current.start();
        intervalRef.current = setInterval(() => setTimer(t => t + 1), 1000);
    } catch (e) { console.error(e); }
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (recognitionRef.current) recognitionRef.current.stop();
    clearInterval(intervalRef.current);
    
    setTimeout(() => handleAnalysis(), 1000);
  };

  const handleAnalysis = () => {
      const textToAnalyze = transcriptRef.current;
      if (!textToAnalyze || textToAnalyze.trim().length === 0) {
          alert('Ничего не записалось.');
          return;
      }

      startTransition(async () => {
        try {
          const res = await analyzeSpeech(textToAnalyze, timer);
          setAnalysis(res.data);
        } catch (e) { console.error(e); }
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

            {/* --- ИЗМЕНЕННАЯ КАРТОЧКА СЛОВ-ПАРАЗИТОВ --- */}
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

              {/* Раскрывающийся список */}
              {showFillers && (
                <div className="fillers-list fade-in">
                  {analysis.fillerWords.length > 0 ? (
                    analysis.fillerWords.map((word, idx) => (
                      <span key={idx} className="filler-tag">{word}</span>
                    ))
                  ) : (
                    <span style={{color: 'var(--success)', fontSize: '0.9rem'}}>Чистая речь! 🎉</span>
                  )}
                </div>
              )}
            </div>
            {/* ------------------------------------------- */}

          </div>

          <div style={{ marginTop: '2rem', display: 'grid', gap: '1rem' }}>
             <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '1.5rem', borderRadius: '1rem', borderLeft: '4px solid #10b981' }}>
                <h3 style={{ color: '#10b981', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={20} /> Что хорошо:
                </h3>
                <p style={{ margin: '0.5rem 0 0', lineHeight: '1.6' }}>{analysis.feedback}</p>
             </div>

             <div style={{ background: 'rgba(6, 182, 212, 0.1)', padding: '1.5rem', borderRadius: '1rem', borderLeft: '4px solid var(--accent)' }}>
                <h3 style={{ color: 'var(--accent)', margin: 0 }}>💡 Совет:</h3>
                <p style={{ margin: '0.5rem 0 0', lineHeight: '1.6' }}>{analysis.tip}</p>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Recorder;