'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import NameModal from '@/components/NameModal';
import { useAuth } from '@/lib/hooks/useAuth';

const Auth: React.FC = () => {
    const { session } = useAuth();
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showNameModal, setShowNameModal] = useState(false);
    const router = useRouter();

    // Redirect if already logged in using the hook's session state
    useEffect(() => {
        if (session) {
            router.push('/');
        }
    }, [session, router]);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (isSignUp) {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: `${window.location.origin}/auth/callback`,
                    },
                });

                if (error) throw error;

                if (data.session) {
                    // Sign up successful and auto-logged in
                    const userName = data.user?.user_metadata?.name;
                    if (!userName) {
                        setShowNameModal(true);
                    }
                    // Navigation will be handled by the useEffect above when session updates
                } else if (data.user) {
                    // Sign up successful but email confirmation required
                    alert('Confirmation email sent! Please check your inbox.');
                }
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });

                if (error) throw error;
                // No need to manually navigate; the session listener will update state,
                // and the useEffect will trigger the redirect.
            }
        } catch (err: any) {
            console.error('Auth error:', err);
            setError(err.message || 'An error occurred during authentication.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <NameModal
                isOpen={showNameModal}
                onClose={() => {
                    setShowNameModal(false);
                    // Navigation handled by session check
                }}
            />
            <div className="min-h-screen flex items-center justify-center bg-background-light text-text-main relative overflow-hidden">
                {/* Background Elements */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
                    <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-accent-teal/5 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl"></div>
                </div>

                <div className="w-full max-w-md p-8 bg-surface-light/80 backdrop-blur-xl rounded-2xl border border-gray-100 shadow-2xl">
                    <div className="text-center mb-8">
                        <div className="w-12 h-12 bg-primary text-white rounded-xl flex items-center justify-center mx-auto mb-4 font-bold text-xl shadow-lg">
                            P
                        </div>
                        <h2 className="text-2xl font-bold tracking-tight">
                            {isSignUp ? 'Create an account' : 'Welcome back'}
                        </h2>
                        <p className="text-text-muted mt-2 text-sm">
                            {isSignUp ? 'Start managing your testimonials today' : 'Enter your details to access your dashboard'}
                        </p>
                    </div>

                    <form onSubmit={handleAuth} className="space-y-4">
                        {error && (
                            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-100">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-text-muted mb-1">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all placeholder:text-gray-300"
                                placeholder="name@company.com"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text-muted mb-1">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all placeholder:text-gray-300"
                                placeholder="••••••••"
                                required
                                minLength={6}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 px-4 bg-primary hover:bg-primary-light text-white font-medium rounded-xl transition-all shadow-lg shadow-primary/20 hover:shadow-primary/30 flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                isSignUp ? 'Sign Up' : 'Sign In'
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center text-sm text-text-muted">
                        {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                        <button
                            onClick={() => {
                                setIsSignUp(!isSignUp);
                                setError(null);
                            }}
                            className="font-medium text-primary hover:text-primary-light transition-colors"
                        >
                            {isSignUp ? 'Sign In' : 'Sign Up'}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Auth;
