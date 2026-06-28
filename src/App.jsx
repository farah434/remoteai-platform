import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Chatbot from './components/Chatbot';
import Home from './pages/Home';
import Jobs from './pages/Jobs';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Profile from './pages/Profile';
import './styles/global.css';

function Footer() {
  return (
    <footer className="footer">
      <p>© 2025 <strong>RemoteAI</strong> — AI-Powered Remote Jobs Platform</p>
      <p style={{ marginTop: 4, fontSize: 12 }}>Find your perfect remote role with AI-powered matching</p>
    </footer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/"        element={<Home />} />
          <Route path="/jobs"    element={<Jobs />} />
          <Route path="/login"   element={<Login />} />
          <Route path="/signup"  element={<Signup />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
        <Footer />
        <Chatbot />
      </BrowserRouter>
    </AuthProvider>
  );
}
