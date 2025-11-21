import { useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
// Добавлена иконка User для профиля
import { Mic, LogOut, LayoutDashboard, History as HistoryIcon, AudioWaveform, User } from 'lucide-react'; 
import { AuthContext } from '../AuthContext';

const Navbar = () => {
  const auth = useContext(AuthContext);
  const location = useLocation();
  
  // Функция для подсветки активной ссылки
  const isActive = (path: string) => location.pathname === path ? 'active' : '';

  return (
    <nav className="navbar">
      <Link to="/" className="nav-brand" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Mic color="var(--primary)" size={28} />
        <span style={{ background: 'linear-gradient(to right, #fff, #94a3b8)', WebkitBackgroundClip: 'text', color: 'transparent', fontWeight: 'bold', fontSize: '1.5rem' }}>
          Orato AI
        </span>
      </Link>
      
      <div className="nav-links" style={{ display: 'flex', alignItems: 'center' }}>
        {auth?.token ? (
          <>
            {/* Практика */}
            <Link to="/practice" className={isActive('/practice')} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <LayoutDashboard size={18} /> Практика
            </Link>
            
            {/* Live Тренер */}
            <Link to="/companion" className={isActive('/companion')} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <AudioWaveform size={18} /> Live Тренер
            </Link>

            {/* Профиль (Геймификация) */}
            <Link to="/profile" className={isActive('/profile')} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <User size={18} /> Профиль
            </Link>
            
            {/* История */}
            <Link to="/history" className={isActive('/history')} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <HistoryIcon size={18} /> История
            </Link>
            
            {/* Разделитель */}
            <div style={{ width: '1px', height: '24px', background: 'var(--glass-border)', margin: '0 1.5rem' }}></div>
            
            {/* Выход */}
            <button 
              onClick={() => auth.setAuth(null)} 
              className="btn btn-outline" 
              style={{ border: '1px solid var(--danger)', color: 'var(--danger)', padding: '0.5rem 1rem', fontSize: '0.8rem' }}
            >
              <LogOut size={16} /> Выход
            </button>
          </>
        ) : (
          <Link to="/auth" className="btn btn-primary" style={{ padding: '0.6rem 1.5rem', marginLeft: '1rem' }}>
            Войти
          </Link>
        )}
      </div>
    </nav>
  );
};

export default Navbar;