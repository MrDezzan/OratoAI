import { useState, useEffect } from 'react';
import { fetchHistory, clearHistory, HistoryItem } from '../api'; // Import Types
import { Loader2, X, FileText, Zap, Trash2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const History = () => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);

  useEffect(() => {
    fetchHistory()
      .then(res => {
          // Axios Response wrapper -> res.data
          setHistory(Array.isArray(res.data) ? res.data : []);
      })
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, []);

  const handleClear = async () => {
    if (!window.confirm('Вы уверены, что хотите удалить ВСЮ историю?')) return;
    
    const toastId = toast.loading('Удаляем историю...'); 

    try {
      await clearHistory();
      setHistory([]);
      toast.success('История очищена 🗑️', { id: toastId });
    } catch (e) {
      toast.error('Ошибка при удалении', { id: toastId });
    }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', marginTop: '50px' }}><Loader2 className="spin" color="var(--primary)"/></div>;

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1>История</h1>
        {history.length > 0 && (
          <button onClick={handleClear} className="btn btn-danger" style={{ padding: '0.6rem 1.2rem', fontSize: '0.8rem' }}>
            <Trash2 size={16} /> Очистить
          </button>
        )}
      </div>
      
      <div className="card">
        {history.length === 0 ? (
          <div style={{textAlign:'center', padding: '3rem', color:'var(--text-muted)'}}>
            <AlertCircle size={48} style={{opacity: 0.3, marginBottom: '1rem'}}/>
            <p>История чиста.</p>
          </div>
        ) : (
          <table className="history-table">
            <thead>
              <tr>
                <th>Дата</th>
                <th>Оценка</th>
                <th>Темп</th>
                <th>Совет</th>
              </tr>
            </thead>
            <tbody>
              {history.map(h => (
                <tr key={h.id} onClick={() => setSelectedItem(h)} className="history-row">
                  {/* Используем поле 'date' (ISO String) */}
                  <td>{new Date(h.date).toLocaleDateString()}</td>
                  <td>
                    <span style={{ color: h.clarityScore >= 80 ? '#4ade80' : h.clarityScore >= 50 ? '#facc15' : '#f43f5e', fontWeight: 'bold' }}>
                      {h.clarityScore}
                    </span>
                  </td>
                  <td>{h.pace}</td>
                  <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
                    {h.tip}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selectedItem && (
        <div className="modal-overlay" onClick={() => setSelectedItem(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedItem(null)}><X /></button>
            <h2 style={{borderBottom:'1px solid var(--glass-border)', paddingBottom:'1rem'}}>Детали</h2>
            
            <div style={{ display: 'flex', gap: '2rem', margin: '1rem 0' }}>
              <div>
                <div style={{fontSize:'0.8rem', color:'var(--text-muted)'}}>Оценка</div>
                <div style={{fontSize:'2rem', fontWeight:'bold', color:'var(--primary)'}}>{selectedItem.clarityScore}</div>
              </div>
              <div>
                <div style={{fontSize:'0.8rem', color:'var(--text-muted)'}}>WPM</div>
                <div style={{fontSize:'2rem', fontWeight:'bold'}}>{selectedItem.pace}</div>
              </div>
            </div>

            <div style={{ marginTop:'1rem' }}>
                <h3 style={{fontSize:'1.1rem', color:'var(--accent)', display:'flex', gap:'8px'}}><FileText size={18}/> Транскрипт:</h3>
                <div style={{background:'rgba(0,0,0,0.3)', padding:'1rem', borderRadius:'0.5rem', maxHeight:'200px', overflowY:'auto', color:'#cbd5e1'}}>
                    {selectedItem.transcript}
                </div>
                
                <h3 style={{fontSize:'1.1rem', color:'#10b981', display:'flex', gap:'8px', marginTop:'1.5rem'}}><Zap size={18}/> Анализ:</h3>
                <p>{selectedItem.feedback}</p>
                <p style={{color:'var(--danger)', marginTop:'0.5rem'}}>Совет: {selectedItem.tip}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default History;