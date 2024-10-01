import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Cookies from 'js-cookie';
import DOMAIN from '../Domain.jsx';
import './LoginRegister.css';

function LoginRegister() {
  const [isLogin, setIsLogin] = useState(true); // Toggle state for Login/Register
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
  });
  const [popupMessage, setPopupMessage] = useState(''); // For pop-up messages
  const [isPopupError, setIsPopupError] = useState(false); // To style the popup
  const navigate = useNavigate();

  // Handle input change
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.username || !formData.password) {
      return handlePopup('Please fill in all required fields', true);
    }

    if (!isLogin && formData.password !== formData.confirmPassword) {
      return handlePopup('Passwords do not match', true);
    }

    // Example API call
    try {
      const url = isLogin ? `${DOMAIN}/api/user/login` : `${DOMAIN}/api/user/register`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
        }),
        credentials: 'include', // This allows cookies to be sent/received
      });
      console.log(response);

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'An error occurred');
      }

      // On successful login, redirect to dashboard
      if (isLogin) {
        handlePopup('Login successful!', false);
        setTimeout(() => navigate('/dashboard'), 1000);
      } 
      // On successful registration, switch to login and show success message
      else {
        handlePopup('Registration successful! Please login.', false);
        setTimeout(() => setIsLogin(true), 1000);
      }

      setFormData({ username: '', password: '', confirmPassword: '' });
    } catch (error) {
      handlePopup(error.message, true);
    }
  };

  // Handle pop-up messages
  const handlePopup = (message, isError) => {
    setPopupMessage(message);
    setIsPopupError(isError);
    setTimeout(() => setPopupMessage(''), 3000); // Hide after 3 seconds
  };

  return (
    <div className="login-register-container">
      <div className="toggle-tabs">
        <button className={isLogin ? 'active' : ''} onClick={() => setIsLogin(true)}>
          Login
        </button>
        <button className={!isLogin ? 'active' : ''} onClick={() => setIsLogin(false)}>
          Register
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <label>Username</label>
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            required
          />
        </div>

        <div className="input-group">
          <label>Password</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
          />
        </div>

        {!isLogin && (
          <div className="input-group">
            <label>Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>
        )}

        <button type="submit" className="submit-btn">
          {isLogin ? 'Login' : 'Register'}
        </button>
      </form>

      {/* Popup for Success/Error messages */}
      {popupMessage && (
        <div className={`popup ${isPopupError ? 'error' : 'success'}`}>
          {popupMessage}
        </div>
      )}
    </div>
  );
}

export default LoginRegister;
