import { Link } from 'react-router-dom';
import { useContext, ReactNode } from 'react'; // use -> useContext
import { AuthContext } from '../AuthContext';
import { Mic, Zap, Shield, TrendingUp, BrainCircuit, Sparkles } from 'lucide-react';

const Home = () => {
  const auth = useContext(AuthContext); // auth может быть null

  return (
    <div className="fade-in">
      {/*  HERO SECTION  */}
      <div style={{ textAlign: 'center', padding: '4rem 0 6rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', background: 'rgba(139, 92, 246, 0.1)', padding: '0.5rem 1rem', borderRadius: '50px', marginBottom: '1.5rem', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
          <Sparkles size={16} color="var(--primary)" />
          <span style={{ color: 'var(--primary)', fontSize: '0.9rem', fontWeight: 'bold' }}></span>
        </div>
        
        <h1 style={{ fontSize: '4rem', lineHeight: '1.1', marginBottom: '1.5rem' }}>
          Говори уверенно.<br />
          <span style={{ background: 'linear-gradient(to right, var(--primary), var(--accent))', WebkitBackgroundClip: 'text', color: 'transparent' }}>
            Побеждай страх.
          </span>
        </h1>
        
        <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto 3rem', lineHeight: '1.6' }}>
          Ваш персональный ИИ-тренер по ораторскому искусству. 
          Анализирует речь, находит слова-паразиты и дает советы, 
          как звучать более убедительно.
        </p>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <Link to={auth?.token ? "/practice" : "/auth"} className="btn btn-primary" style={{ padding: '1rem 2.5rem', fontSize: '1.1rem' }}>
            {auth?.token ? 'Продолжить тренировку' : 'Начать бесплатно'}
          </Link>
          {!auth?.token && (
            <Link to="/auth" className="btn btn-outline" style={{ padding: '1rem 2.5rem' }}>
              Войти
            </Link>
          )}
        </div>
      </div>

      {/*  FEATURES GRID  */}
      <div className="metrics-grid" style={{ marginBottom: '6rem' }}>
        <FeatureCard 
          icon={<Mic color="var(--primary)" />}
          title="Реальная практика"
          desc="Записывайте свою речь в браузере. Никаких живых зрителей — только вы и алгоритмы."
        />
        <FeatureCard 
          icon={<BrainCircuit color="var(--accent)" />}
          title="Умный Анализ"
          desc="Искусственный интеллект оценивает ясность, темп и структуру вашего выступления за секунды."
        />
        <FeatureCard 
          icon={<Zap color="#fbbf24" />}
          title="Детектор паразитов"
          desc="Мы найдем каждое «э-э», «ну» и «типа», чтобы ваша речь стала чистой и профессиональной."
        />
      </div>

      {/*  WHY US  */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', padding: '3rem', textAlign: 'center' }}>
        <h2>Почему Orato AI?</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem', textAlign: 'left' }}>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '12px', height: 'fit-content' }}><TrendingUp color="#10b981" /></div>
            <div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Отслеживание прогресса</h3>
              <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.95rem' }}>История сохраняет все оценки. Смотрите, как растет ваш навык с каждым днем.</p>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ background: 'rgba(244, 63, 94, 0.1)', padding: '12px', borderRadius: '12px', height: 'fit-content' }}><Shield color="#f43f5e" /></div>
            <div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Приватность</h3>
              <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.95rem' }}>Ваши записи анализируются и сразу удаляются. Текст хранится только у вас.</p>
            </div>
          </div>
        </div>
      </div>

      <footer style={{ textAlign: 'center', marginTop: '4rem', padding: '2rem', borderTop: '1px solid var(--glass-border)', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
        <p>© 2025 Orato AI. Развивайте голос будущего. From AITUCAP 2025 Hackathon</p>
      </footer>
    </div>
  );
};

// Интерфейс пропсов для компонента
interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  desc: string;
}

const FeatureCard = ({ icon, title, desc }: FeatureCardProps) => (
  <div className="card" style={{ padding: '2rem', textAlign: 'left', transition: 'transform 0.3s' }}>
    <div style={{ background: 'rgba(255,255,255,0.05)', width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
      {icon}
    </div>
    <h3 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>{title}</h3>
    <p style={{ color: 'var(--text-muted)', lineHeight: '1.6', margin: 0 }}>{desc}</p>
  </div>
);

export default Home;