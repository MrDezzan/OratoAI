import { useState, useEffect } from 'react';
import { getProfile, UserProfile } from '../api';
import { Loader2, Flame, Trophy, Star, Sparkles, Medal, Target, Crown, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

const Profile = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProfile()
      .then(res => setProfile(res.data))
      .catch(() => toast.error("Не удалось загрузить профиль"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div style={{display:'flex', justifyContent:'center', marginTop:'4rem'}}><Loader2 className="spin" color="var(--primary)"/></div>;
  }

  if (!profile) return <div style={{textAlign:'center'}}>Профиль недоступен</div>;

  // Вычисляем процент заполнения бара
  // Защита от деления на 0, если вдруг с бэка придет 0
  const progressPercent = Math.min(100, Math.max(0, (profile.xp / (profile.nextLvlXp || 1)) * 100));

  return (
    <div className="fade-in">
      
      {/* --- ШАПКА ПРОФИЛЯ --- */}
      <div className="profile-header">
        <div className="avatar-placeholder">
            {/* Первая буква имени */}
            {profile.username.charAt(0)}
        </div>
        
        <div style={{ flex: 1, width: '100%' }}>
            <div style={{ display: 'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'5px' }}>
               <h1 style={{ fontSize: '2.5rem', margin: 0, lineHeight: 1 }}>{profile.username}</h1>
               {/* Иконка уровня справа */}
               <div style={{ background:'var(--primary)', width:'40px', height:'40px', borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'bold' }}>
                 {profile.level}
               </div>
            </div>
            
            <p className="rank-badge">{profile.title}</p>
            
            {/* PROGRESS BAR */}
            <div className="xp-bar-container">
                <div className="xp-info">
                    <span>XP: {profile.xp}</span>
                    <span>Цель: {profile.nextLvlXp}</span>
                </div>
                <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${progressPercent}%` }}></div>
                </div>
            </div>
        </div>
      </div>

      {/* --- СТАТИСТИКА (ГРИД) --- */}
      <div className="metrics-grid" style={{ marginTop: '2rem' }}>
        <div className="metric-card">
            <Flame size={32} color="#f97316" style={{marginBottom:'1rem'}}/>
            <div className="metric-val" style={{ color: '#f97316' }}>{profile.streak}</div>
            <div className="metric-label">Серия дней (Streak)</div>
        </div>
        <div className="metric-card">
            <Star size={32} color="#eab308" style={{marginBottom:'1rem'}}/>
            <div className="metric-val" style={{ color: '#eab308' }}>{profile.xp}</div>
            <div className="metric-label">Всего очков</div>
        </div>
        <div className="metric-card">
            <Trophy size={32} color="#8b5cf6" style={{marginBottom:'1rem'}}/>
            <div className="metric-val" style={{ color: '#8b5cf6' }}>{profile.badges.length}</div>
            <div className="metric-label">Наград получено</div>
        </div>
      </div>

      {/* --- КОЛЛЕКЦИЯ БЕЙДЖЕЙ --- */}
      <div style={{ marginTop: '4rem' }}>
        <h2 style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom: '1.5rem' }}>
            <Medal color="var(--accent)"/> Зал Славы
        </h2>
        
        <div className="badges-grid">
            {profile.badges.length === 0 ? (
                <div style={{ gridColumn: '1 / -1', textAlign:'center', padding:'2rem', color:'var(--text-muted)', border:'1px dashed var(--glass-border)', borderRadius:'1rem' }}>
                    <p>У вас пока нет наград. <br/> Проведите тренировку, чтобы получить первую!</p>
                </div>
            ) : (
                profile.badges.map((badgeId, idx) => (
                    <BadgeItem key={idx} id={badgeId} />
                ))
            )}
        </div>
      </div>

    </div>
  );
};

// Компонент отдельного бейджа
const BadgeItem = ({ id }: { id: string }) => {
    // Данные о всех возможных наградах (Mapping)
    const badgeConfig: Record<string, { name: string, desc: string, color: string, icon: any }> = {
        'level_2': { 
            name: 'Новое Начало', 
            desc: 'Достигнут 2 уровень мастерства', 
            color: '#60a5fa', // Blue
            icon: <Target size={28}/> 
        },
        'level_5': { 
            name: 'Опытный Спикер', 
            desc: 'Достигнут 5 уровень', 
            color: '#8b5cf6', // Violet
            icon: <Zap size={28}/> 
        },
        'clean_speaker': { 
            name: 'Чистая Речь', 
            desc: 'Анализ без слов-паразитов (90+)', 
            color: '#10b981', // Green
            icon: <Sparkles size={28}/> 
        },
        'streak_3': { 
            name: 'В огне (3 дня)', 
            desc: 'Практика 3 дня подряд', 
            color: '#f97316', // Orange
            icon: <Flame size={28}/> 
        },
        'streak_5': { 
            name: 'Марафонец (5 дней)', 
            desc: 'Практика 5 дней подряд', 
            color: '#ef4444', // Red
            icon: <Crown size={28}/> 
        }
    };

    // Если бейдж есть в базе, но нет в конфиге - ставим дефолт
    const info = badgeConfig[id] || { 
        name: 'Секретная Награда', 
        desc: 'Достижение разблокировано', 
        color: '#94a3b8', 
        icon: <Trophy size={28}/> 
    };

    return (
        <div className="badge-card" style={{ color: info.color, borderColor: info.color }}>
            <div style={{ marginBottom: '0.8rem' }}>{info.icon}</div>
            <h4 style={{ margin: '0 0 0.5rem 0', fontSize:'1.1rem' }}>{info.name}</h4>
            <p style={{ fontSize: '0.8rem', color:'var(--text-muted)', margin: 0, lineHeight: '1.4' }}>{info.desc}</p>
        </div>
    );
};

export default Profile;