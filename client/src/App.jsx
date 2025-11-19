import { useState, useEffect, use } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Auth from './components/Auth';
import Recorder from './components/Recorder';
import History from './components/History';
import Home from './components/Home';
import IntroLoader from './components/IntroLoader';
import { AuthProvider, AuthContext } from './AuthContext';
import './App.css';

const ProtectedRoute = ({ children }) => {
  const { token } = use(AuthContext);
  return token ? children : <Navigate to="/auth" replace />;
};

const GuestRoute = ({ children }) => {
  const { token } = use(AuthContext);
  return !token ? children : <Navigate to="/practice" replace />;
};

const MainLayout = () => {
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 2200);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      {isLoading && <IntroLoader />}
      <div className={`app-content ${isLoading ? 'hidden-content' : 'visible-content'}`}>
        <Navbar />
        <div className="container main-container">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/practice" element={<ProtectedRoute><Recorder /></ProtectedRoute>} />
            <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
            <Route path="/auth" element={<GuestRoute><Auth /></GuestRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </>
  );
};

function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}

export default App;