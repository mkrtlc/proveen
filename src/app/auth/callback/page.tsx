'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import NameModal from '@/components/NameModal';

const AuthCallbackContent: React.FC = () => {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [showNameModal, setShowNameModal] = useState(false);

    useEffect(() => {
        const handleAuthCallback = async () => {
            try {
                // Since we're using HashRouter upstream (potentially), Supabase might append tokens to the hash
                // URL structure: #/auth/callback#access_token=... or #/auth/callback?access_token=...
                // In Next.js App Router, we are at /auth/callback. Hash fragments might still be there.
                const fullHash = window.location.hash;

                // Extract the fragment. If it starts with #, strip it.
                // The hash in Next.js will be just the part after hash, e.g. #access_token=...
                let hashFragment = fullHash;
                if (hashFragment.startsWith('#')) {
                    hashFragment = hashFragment.substring(1);
                }

                // Supabase might redirect with /#/auth/callback if misconfigured, but assuming standard redirect:
                // If we are at /auth/callback, existing logic for hash parsing is:

                const hashParams = new URLSearchParams(hashFragment);
                const accessToken = hashParams.get('access_token');
                const refreshToken = hashParams.get('refresh_token');
                const errorParam = hashParams.get('error') || searchParams.get('error');
                const errorDescription = hashParams.get('error_description') || searchParams.get('error_description');

                if (errorParam) {
                    throw new Error(errorDescription || errorParam);
                }

                if (accessToken && refreshToken) {
                    // Exchange the tokens for a session
                    const { data, error } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken,
                    });

                    if (error) throw error;

                    if (data.session) {
                        // Check if user has a name in metadata
                        const userName = data.session.user.user_metadata?.name;
                        if (!userName) {
                            // Show name modal before redirecting
                            setShowNameModal(true);
                        } else {
                            // Successfully authenticated, redirect to dashboard
                            router.push('/');
                        }
                    } else {
                        throw new Error('Failed to create session');
                    }
                } else {
                    // Also check URL search params (some Supabase configs use query params)
                    const code = searchParams.get('code');
                    if (code) {
                        // Exchange code for session
                        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
                        if (error) throw error;
                        if (data.session) {
                            // Check if user has a name in metadata
                            const userName = data.session.user.user_metadata?.name;
                            if (!userName) {
                                // Show name modal before redirecting
                                setShowNameModal(true);
                            } else {
                                router.push('/');
                            }
                        } else {
                            throw new Error('Failed to create session');
                        }
                    } else {
                        // If no code and no hash tokens, check if we are already logged in
                        const { data: { session } } = await supabase.auth.getSession();
                        if (session) {
                            router.push('/');
                            return;
                        }
                        // No tokens found, might be a different callback or error
                        // throw new Error('No authentication tokens found in URL');
                        // Just redirect to auth if nothing found
                        router.push('/auth');
                    }
                }
            } catch (err: any) {
                console.error('Auth callback error:', err);
                setError(err.message || 'Authentication failed');
                setLoading(false);
                // Redirect to auth page after 3 seconds
                setTimeout(() => {
                    router.push('/auth');
                }, 3000);
            }
        };

        handleAuthCallback();
    }, [router, searchParams]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background-light">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-text-muted">Confirming your email...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background-light">
                <div className="w-full max-w-md p-8 bg-surface-light/80 backdrop-blur-xl rounded-2xl border border-gray-100 shadow-2xl text-center">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold mb-2 text-text-main">Authentication Error</h2>
                    <p className="text-text-muted mb-6">{error}</p>
                    <p className="text-sm text-text-muted">Redirecting to login page...</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <NameModal
                isOpen={showNameModal}
                onClose={() => {
                    setShowNameModal(false);
                    router.push('/');
                }}
            />
        </>
    );
};

const AuthCallback: React.FC = () => {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background-light">Loading...</div>}>
            <AuthCallbackContent />
        </Suspense>
    );
};

export default AuthCallback;
