import { useState, useEffect } from 'react';
import { useCookies } from 'react-cookie';
import Home from './Pages/Home';
import Admin from './Pages/Admin';
import Dashboard from './Pages/Dashboard';
import LoginRegister from './Pages/LoginRegister';
import './App.css';
import { Routes, Route, Navigate } from 'react-router-dom';

function App() {
  const [cookies] = useCookies(['connect.sid']);
  const [cookie, setCookieState] = useState(false);

  useEffect(() => {
    console.log('Initial Cookie Check:', cookies['connect.sid']);
    if (cookies['connect.sid']) {
      setCookieState(true);
    } else {
      setCookieState(false);
    }
  }, []);

  useEffect(() => {
    console.log('Cookie:', cookies['connect.sid']);
    console.log('Cookie State:', cookie);
    if (cookies['connect.sid']) {
      setCookieState(true);
    } else {
      setCookieState(false);
    }
  }, [cookies]);

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<LoginRegister />} />
      <Route path="/admin" element={<Admin />} />
      <Route 
        path="/dashboard" 
        element={cookie ? <Dashboard /> : <Navigate to="/login" />} 
      />
    </Routes>
  );
}

export default App;
