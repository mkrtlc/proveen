
import React, { useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';
import Dashboard from './pages/Dashboard';
import Library from './pages/Library';
import Generator from './pages/Generator';
import Analytics from './pages/Analytics';
import BrandSettings from './pages/BrandSettings';
import Auth from './pages/Auth';
import AuthCallback from './pages/AuthCallback';
import { useAppDispatch } from './store';
import { fetchBrand } from './store/slices/brandSlice';
import { fetchTestimonials } from './store/slices/testimonialsSlice';
import { fetchCreatives } from './store/slices/creativeSlice';
import { fetchReviewSources } from './store/slices/reviewsSlice';
import { supabase } from './lib/supabase';

// Protected Route Component
const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background-light">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};


const App: React.FC = () => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    // Listen for auth changes to fetch data
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
        try {
          dispatch(fetchBrand(null));
          dispatch(fetchTestimonials());
          dispatch(fetchCreatives());
          dispatch(fetchReviewSources());
        } catch (err) {
          console.warn('Error fetching data on auth change:', err);
        }
      }
    });

    // Also check initial session (with error handling)
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (session) {
          try {
            dispatch(fetchBrand(null));
            dispatch(fetchTestimonials());
            dispatch(fetchCreatives());
            dispatch(fetchReviewSources());
          } catch (err) {
            console.warn('Error fetching initial data:', err);
          }
        }
      })
      .catch((err) => {
        console.warn('Failed to get initial session (network issue?):', err);
        // App can continue to work - user can still use features that don't require auth
      });

    return () => subscription.unsubscribe();
  }, [dispatch]);

  return (
    <Router>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        <Route path="/" element={
          <PrivateRoute>
            <Layout><Dashboard /></Layout>
          </PrivateRoute>
        } />
        <Route path="/library" element={
          <PrivateRoute>
            <Layout><Library /></Layout>
          </PrivateRoute>
        } />
        <Route path="/generator" element={
          <PrivateRoute>
            <Layout><Generator /></Layout>
          </PrivateRoute>
        } />
        <Route path="/analytics" element={
          <PrivateRoute>
            <Layout><Analytics /></Layout>
          </PrivateRoute>
        } />
        <Route path="/settings" element={
          <PrivateRoute>
            <Layout><BrandSettings /></Layout>
          </PrivateRoute>
        } />
      </Routes>
    </Router>
  );
};

export default App;
