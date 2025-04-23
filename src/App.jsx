// App.js
import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './Firebase';
import Home from './Home';
import './App.css';
import Login from './Login';
import SignUp from './Signup';
import Profile from './Profile';
import CategoryProducts from './Category';
import OrderConfirmation from './OrderConfirmation';

// Create a protected route component to verify authentication
const ProtectedRoute = ({ children }) => {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  
  if (!isLoggedIn) {
    return <Navigate to="/login" />;
  }
  
  return children;
};

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      
      // Store auth state in localStorage
      if (currentUser) {
        localStorage.setItem('isLoggedIn', 'true');
      } else {
        localStorage.setItem('isLoggedIn', 'false');
      }
      
      setLoading(false);
    });
    
    // Check localStorage on initial load
    const storedLoginState = localStorage.getItem('isLoggedIn');
    if (storedLoginState === null) {
      localStorage.setItem('isLoggedIn', 'false');
    }
    
    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <Router>
      <div className="app-container">
        <Routes>
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <Home user={user} />
              </ProtectedRoute>
            } 
          />
          <Route path="/login" element={<Login />} />
          
          <Route path="/products:category" element={<CategoryProducts/>} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/order-confirmation" element={<OrderConfirmation />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
        <footer className="footer">
          © {new Date().getFullYear()} QuickMart. All rights reserved.
        </footer>
      </div>
    </Router>
  );
}

export default App;

// Login.js

// For the Home component, you would need to handle logout
// Home.js (example)
