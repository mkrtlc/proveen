

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { ScrapedReview } from '../../lib/scrapers/trustpilot';
import { supabase } from '../../lib/supabase';

export interface ReviewSource {
    id: string;
    type: 'google' | 'trustpilot';
    url: string;
    lastUpdated: number;
    reviews: ScrapedReview[];
    autoRefresh: boolean;
    brandId?: string | null;
}

interface ReviewsState {
    sources: ReviewSource[];
    loading: boolean;
    error: string | null;
}

const initialState: ReviewsState = {
    sources: [],
    loading: false,
    error: null,
};

export const fetchReviewSources = createAsyncThunk(
    'reviews/fetchSources',
    async (_, { rejectWithValue }) => {
        try {
            let user;
            try {
                const { data: { user: userData }, error: userError } = await supabase.auth.getUser();
                if (userError) {
                    console.warn('Failed to get user for review sources:', userError.message);
                    return [];
                }
                user = userData;
            } catch (authErr: any) {
                console.warn('Auth check failed for review sources (network issue?):', authErr.message);
                return [];
            }

            if (!user) {
                return [];
            }

            const { data: sources, error } = await supabase
                .from('review_sources')
                .select(`
                    id, 
                    type, 
                    url, 
                    last_updated, 
                    auto_refresh,
                    brand_id,
                    scraped_reviews (
                        id, author, rating, date, content, source, url
                    )
                `)
                .eq('user_id', user.id);

            if (error) {
                console.error('Error fetching review sources:', error);
                return [];
            }

            return (sources || []).map((s: any) => ({
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
            }));
        } catch (err: any) {
            return rejectWithValue(err.message);
        }
    }
);

export const addSource = createAsyncThunk(
    'reviews/addSource',
    async (source: ReviewSource, { getState, rejectWithValue }) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user found');

            // Check if source type already exists for this brand
            if (source.brandId) {
                const { data: existing, error: checkError } = await supabase
                    .from('review_sources')
                    .select('id')
                    .eq('user_id', user.id)
                    .eq('brand_id', source.brandId)
                    .eq('type', source.type)
                    .maybeSingle();

                if (checkError && checkError.code !== 'PGRST116') throw checkError;
                
                if (existing) {
                    throw new Error(`A ${source.type} source already exists for this brand. Please remove it first.`);
                }
            }

            // 1. Insert Source
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
                .select()
                .single();

            if (sourceError) throw sourceError;

            // 2. Insert Reviews (if any) - use upsert to handle duplicate IDs
            if (source.reviews.length > 0) {
                const reviewsToInsert = source.reviews.map((r, index) => ({
                    id: `${insertedSource.id}-${r.id}-${index}`, // Make IDs unique per source
                    source_id: insertedSource.id,
                    user_id: user.id,
                    author: r.author,
                    rating: r.rating,
                    date: r.date,
                    content: r.content || '',
                    source: r.source || (source.type === 'google' ? 'Google' : 'Trustpilot'),
                    url: r.url || source.url
                }));

                const { error: reviewsError } = await supabase
                    .from('scraped_reviews')
                    .upsert(reviewsToInsert, { onConflict: 'id' });

                if (reviewsError) throw reviewsError;
            }

            return { ...source, id: insertedSource.id };

        } catch (err: any) {
            return rejectWithValue(err.message);
        }
    }
);

export const removeSourceAsync = createAsyncThunk(
    'reviews/removeSourceAsync',
    async (sourceId: string, { rejectWithValue }) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user found');

            const { error } = await supabase
                .from('review_sources')
                .delete()
                .eq('id', sourceId)
                .eq('user_id', user.id);

            if (error) throw error;
            return sourceId;
        } catch (err: any) {
            return rejectWithValue(err.message);
        }
    }
);

export const toggleAutoRefreshAsync = createAsyncThunk(
    'reviews/toggleAutoRefreshAsync',
    async (sourceId: string, { getState, rejectWithValue }) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user found');

            const state = getState() as any;
            const source = state.reviews.sources.find((s: ReviewSource) => s.id === sourceId);
            if (!source) throw new Error('Source not found');

            const { error } = await supabase
                .from('review_sources')
                .update({ auto_refresh: !source.autoRefresh })
                .eq('id', sourceId)
                .eq('user_id', user.id);

            if (error) throw error;
            return { id: sourceId, autoRefresh: !source.autoRefresh };
        } catch (err: any) {
            return rejectWithValue(err.message);
        }
    }
);

const reviewsSlice = createSlice({
    name: 'reviews',
    initialState,
    reducers: {
        // Keeping sync actions for local updates if needed, but thunks should handle main sync
        updateSourceReviews(state, action: PayloadAction<{ id: string; reviews: ScrapedReview[]; lastUpdated: number }>) {
            const source = state.sources.find(s => s.id === action.payload.id);
            if (source) {
                source.reviews = action.payload.reviews;
                source.lastUpdated = action.payload.lastUpdated;
            }
        },
        removeSource(state, action: PayloadAction<string>) {
            state.sources = state.sources.filter(s => s.id !== action.payload);
        },
        toggleAutoRefresh(state, action: PayloadAction<string>) {
            const source = state.sources.find(s => s.id === action.payload);
            if (source) {
                source.autoRefresh = !source.autoRefresh;
            }
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchReviewSources.pending, (state) => {
                state.loading = true;
            })
            .addCase(fetchReviewSources.fulfilled, (state, action) => {
                state.loading = false;
                state.sources = action.payload;
            })
            .addCase(fetchReviewSources.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            .addCase(addSource.fulfilled, (state, action) => {
                state.sources.push(action.payload);
            })
            .addCase(removeSourceAsync.fulfilled, (state, action) => {
                state.sources = state.sources.filter(s => s.id !== action.payload);
            })
            .addCase(toggleAutoRefreshAsync.fulfilled, (state, action) => {
                const source = state.sources.find(s => s.id === action.payload.id);
                if (source) {
                    source.autoRefresh = action.payload.autoRefresh;
                }
            });
    }
});

export const { updateSourceReviews, removeSource, toggleAutoRefresh } = reviewsSlice.actions;
export default reviewsSlice.reducer;
