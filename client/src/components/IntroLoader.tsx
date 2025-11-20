import { Mic } from 'lucide-react';
import '../App.css';

const IntroLoader = () => {
  return (
    <div className="intro-loader">
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div className="pulse-ring"></div>
        <Mic size={64} color="#6366f1" style={{ zIndex: 2 }} />
      </div>
      <h1 style={{ marginTop: '2rem', background: 'linear-gradient(to right, #6366f1, #ec4899)', WebkitBackgroundClip: 'text', color: 'transparent' }}>
        Orato AI
      </h1>
    </div>
  );
};

export default IntroLoader;