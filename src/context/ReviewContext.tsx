'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ScrapedReview } from '@/lib/scrapers/trustpilot';
import { supabase } from '@/lib/supabase';

export interface ReviewSource {
    id: string;
    type: 'google' | 'trustpilot';
    url: string;
    lastUpdated: number;
    reviews: ScrapedReview[];
    autoRefresh: boolean;
    brandId?: string | null;
}

interface ReviewContextType {
    sources: ReviewSource[];
    loading: boolean;
    error: string | null;
    fetchReviewSources: () => Promise<void>;
    addSource: (source: ReviewSource) => Promise<void>;
    removeSource: (sourceId: string) => Promise<void>;
    toggleAutoRefresh: (sourceId: string) => Promise<void>;
    updateSourceReviews: (id: string, reviews: ScrapedReview[], lastUpdated: number) => void;
}

const ReviewContext = createContext<ReviewContextType | undefined>(undefined);

export const ReviewProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [sources, setSources] = useState<ReviewSource[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchReviewSources = useCallback(async () => {
        setLoading(true);
        try {
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError || !user) {
                setLoading(false);
                return;
            }

            const { data, error } = await supabase
                .from('review_sources')
                .select(`
                    id, type, url, last_updated, auto_refresh, brand_id,
                    scraped_reviews (id, author, rating, date, content, source, url)
                `)
                .eq('user_id', user.id);

            if (error) {
                console.error('Error fetching review sources:', error);
                setError(error.message);
            } else if (data) {
                setSources(data.map((s: any) => ({
                    id: s.id,
                    type: s.type,
                    url: s.url,
                    lastUpdated: s.last_updated ? new Date(s.last_updated).getTime() : 0,
                    autoRefresh: s.auto_refresh,
                    brandId: s.brand_id,
                    reviews: (s.scraped_reviews || []).map((r: any) => ({
                        id: r.id,
                        author: r.author,
                        rating: r.rating,
                        date: r.date,
                        content: r.content,
                        source: r.source,
                        url: r.url
                    }))
                })));
            }
        } catch (err: any) {
            console.error('Unexpected error fetching review sources:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const addSource = useCallback(async (source: ReviewSource) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user found');

            // Check existing
            if (source.brandId) {
                const { data: existing } = await supabase
                    .from('review_sources')
                    .select('id')
                    .eq('user_id', user.id)
                    .eq('brand_id', source.brandId)
                    .eq('type', source.type)
                    .maybeSingle();

                if (existing) throw new Error(`A ${source.type} source already exists for this brand.`);
            }

            const { data: insertedSource, error: sourceError } = await supabase
                .from('review_sources')
                .insert({
                    user_id: user.id,
                    brand_id: source.brandId || null,
                    type: source.type,
                    url: source.url,
                    last_updated: new Date(source.lastUpdated).toISOString(),
                    auto_refresh: source.autoRefresh
                })
                .select().single();

            if (sourceError) throw sourceError;

            // Insert reviews
            if (source.reviews.length > 0) {
                const reviewsToInsert = source.reviews.map((r, index) => ({
                    id: `${insertedSource.id}-${r.id}-${index}`,
                    source_id: insertedSource.id,
                    user_id: user.id,
                    author: r.author,
                    rating: r.rating,
                    date: r.date,
                    content: r.content || '',
                    source: r.source || (source.type === 'google' ? 'Google' : 'Trustpilot'),
                    url: r.url || source.url
                }));
                const { error: revErr } = await supabase.from('scraped_reviews').upsert(reviewsToInsert, { onConflict: 'id' });
                if (revErr) throw revErr;
            }

            setSources(prev => [...prev, { ...source, id: insertedSource.id }]);

        } catch (err: any) {
            console.error('Error adding source:', err);
            throw err;
        }
    }, []);

    const removeSource = useCallback(async (sourceId: string) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return; // Should handle error
            const { error } = await supabase.from('review_sources').delete().eq('id', sourceId).eq('user_id', user.id);
            if (error) throw error;
            setSources(prev => prev.filter(s => s.id !== sourceId));
        } catch (err) {
            console.error('Error removing source:', err);
        }
    }, []);

    const toggleAutoRefresh = useCallback(async (sourceId: string) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const source = sources.find(s => s.id === sourceId);
            if (!source) return;

            const { error } = await supabase
                .from('review_sources')
                .update({ auto_refresh: !source.autoRefresh })
                .eq('id', sourceId)
                .eq('user_id', user.id);

            if (error) throw error;
            setSources(prev => prev.map(s => s.id === sourceId ? { ...s, autoRefresh: !s.autoRefresh } : s));
        } catch (err) {
            console.error('Error toggling auto refresh:', err);
        }
    }, [sources]);

    const updateSourceReviews = useCallback((id: string, reviews: ScrapedReview[], lastUpdated: number) => {
        setSources(prev => prev.map(s => s.id === id ? { ...s, reviews, lastUpdated } : s));
    }, []);

    useEffect(() => {
        fetchReviewSources();
    }, [fetchReviewSources]);

    return (
        <ReviewContext.Provider value={{
            sources,
            loading,
            error,
            fetchReviewSources,
            addSource,
            removeSource,
            toggleAutoRefresh,
            updateSourceReviews
        }}>
            {children}
        </ReviewContext.Provider>
    );
};

export const useReviews = () => {
    const context = useContext(ReviewContext);
    if (context === undefined) {
        throw new Error('useReviews must be used within a ReviewProvider');
    }
    return context;
};
