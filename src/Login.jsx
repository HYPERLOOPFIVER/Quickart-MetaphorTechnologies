import { useState, useEffect } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from './Firebase';
import { Link, useNavigate } from 'react-router-dom';
import './Login.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [animateWater, setAnimateWater] = useState(false);
  const navigate = useNavigate();
  
  // Initialize with saved email if available
  useEffect(() => {
    const savedEmail = localStorage.getItem('lakesmart_email');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
    
    // Start water animation after component mount
    setTimeout(() => setAnimateWater(true), 300);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    
    setError('');
    setLoading(true);
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
      
      // Handle "Remember Me" functionality
      if (rememberMe) {
        localStorage.setItem('lakesmart_email', email);
      } else {
        localStorage.removeItem('lakesmart_email');
      }
      
      localStorage.setItem('isLoggedIn', 'true');
      
      // Trigger ripple effect before navigating
      setAnimateWater(false);
      document.querySelector('.login-success-ripple').classList.add('active');
      
      // Delay navigation slightly for animation
      setTimeout(() => {
        navigate('/');
      }, 800);
    } catch (err) {
      console.error('Login error:', err);
      setError(getReadableErrorMessage(err.code));
      setLoading(false);
      localStorage.setItem('isLoggedIn', 'false');
      
      // Shake form on error
      const form = document.querySelector('.auth-form');
      form.classList.add('shake');
      setTimeout(() => form.classList.remove('shake'), 500);
    }
  };
  
  // Convert Firebase error codes to user-friendly messages
  const getReadableErrorMessage = (errorCode) => {
    switch(errorCode) {
      case 'auth/user-not-found':
        return 'No account found with this email. Please check or sign up.';
      case 'auth/wrong-password':
        return 'Incorrect password. Please try again.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later.';
      default:
        return 'Login failed. Please check your information and try again.';
    }
  };

  // Water bubbles animation elements
  const bubbles = [...Array(6)].map((_, i) => (
    <div key={i} className={`bubble bubble-${i+1} ${animateWater ? 'animate' : ''}`}></div>
  ));

  return (
    <div className="auth-container">
      <div className="water-container">
        {bubbles}
      </div>
      
      <div className="login-success-ripple"></div>
      
      <div className="auth-form">
        <div className="logo-container">
          <div className="logo">
            <span className="logo-wave"></span>
            <span className="logo-wave"></span>
            <span className="logo-wave"></span>
          </div>
          <h1 className="app-name">LakeSmart</h1>
        </div>
        
        <h2>Welcome Back!</h2>
        <p className="slogan">Groceries in Minutes, Smiles for Hours.</p>
        
        {error && (
          <div className="error-message">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>{error}</span>
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <svg className="input-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
              <polyline points="22,6 12,13 2,6"></polyline>
            </svg>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
              className={email ? 'has-value' : ''}
            />
            <label>Email</label>
          </div>
          
          <div className="input-group">
            <svg className="input-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              className={password ? 'has-value' : ''}
            />
            <label>Password</label>
            <button 
              type="button" 
              className="password-toggle" 
              onClick={() => setShowPassword(!showPassword)}
              tabIndex="-1"
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                  <line x1="1" y1="1" x2="23" y2="23"></line>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              )}
            </button>
          </div>
          
          <div className="form-options">
            <label className="remember-me">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={() => setRememberMe(!rememberMe)}
              />
              <span className="checkmark"></span>
              Remember me
            </label>
            <Link to="/forgot-password" className="forgot-password">Forgot Password?</Link>
          </div>
          
          <button type="submit" className={`login-button ${loading ? 'loading' : ''}`}>
            <span className="button-text">Login</span>
            <span className="button-loader"></span>
          </button>
        </form>
        










        
      
        <p className="auth-link">
          Don't have an account? <Link to="/signup">Sign Up</Link>
        </p>
      </div>
    </div>
  );
}
