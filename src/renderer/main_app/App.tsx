
import React, { useEffect } from 'react';
import { MemoryRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Login from './pages/login/Login';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  useEffect(() => {
    console.log('App component mounted');
  }, []);

  return (
    <AuthProvider>
        <Login />
        <ToastContainer position="top-right" autoClose={3000} newestOnTop closeOnClick pauseOnHover theme="colored" />
    </AuthProvider>
  );
}

export default App;
