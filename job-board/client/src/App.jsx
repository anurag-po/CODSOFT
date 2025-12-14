import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { Toaster } from 'react-hot-toast';

// Components
import Home from './pages/Home';
import Jobs from './pages/Jobs';
import JobDetail from './pages/JobDetail';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';

function Navbar({ session }) {
  const navigate = useNavigate();
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    // Added 'sticky top-0 z-50' to keep nav visible while scrolling
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      {/* Added a container wrapper to center content and prevent edge-to-edge stretching */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo with hover effect */}
          <Link to="/" className="text-xl font-bold text-blue-600 hover:text-blue-700 transition-colors">
            JobBoard
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center space-x-6">
            <Link 
              to="/jobs" 
              className="text-gray-600 hover:text-blue-600 font-medium transition-colors duration-200"
            >
              Browse Jobs
            </Link>
            
            {session ? (
              <>
                <Link 
                  to="/dashboard" 
                  className="text-gray-600 hover:text-blue-600 font-medium transition-colors duration-200"
                >
                  Dashboard
                </Link>
                <button 
                  onClick={handleLogout} 
                  className="text-red-500 hover:text-red-700 font-medium transition-colors duration-200"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link 
                to="/login" 
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-medium transition-colors shadow-sm hover:shadow"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default function App() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    const wakeUpServer = async () => {
      try {
        // Just ping the server to wake it up. We don't care about the response.
        await axios.get('https://job-board-api-rc22.onrender.com');
        console.log("Server poked!");
      } catch (error) {
        // Ignore errors, it's just a wake-up call
      }
    };
    wakeUpServer();
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <Router>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar session={session} />
        
        {/* WRAPPER: This ensures all your pages align perfectly with the navbar */}
        <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/jobs" element={<Jobs />} />
            <Route path="/jobs/:id" element={<JobDetail session={session} />} />
            <Route path="/dashboard" element={<Dashboard session={session} />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Routes>
        </main>
        
        <Toaster position="bottom-right" />
      </div>
    </Router>
  );
}
