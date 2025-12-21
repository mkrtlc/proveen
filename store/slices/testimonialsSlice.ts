
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Testimonial } from '../../lib/layers/types';
import { INITIAL_TESTIMONIALS } from '../../constants';
import { supabase } from '../../lib/supabase';

interface TestimonialsState {
    items: Testimonial[];
    result: Testimonial | null;
    loading: boolean;
    error: string | null;
}

const initialState: TestimonialsState = {
    items: [], // Start empty, will fetch
    result: null,
    loading: false,
    error: null,
};

export const fetchTestimonials = createAsyncThunk(
    'testimonials/fetchTestimonials',
    async (_, { rejectWithValue }) => {
        try {
            let user;
            try {
                const { data: { user: userData }, error: userError } = await supabase.auth.getUser();
                if (userError) {
                    // If auth fails (network error, etc.), return empty array
                    console.warn('Failed to get user for testimonials:', userError.message);
                    return [];
                }
                user = userData;
            } catch (authErr: any) {
                // Handle network errors gracefully
                console.warn('Auth check failed (network issue?):', authErr.message);
                return [];
            }

            if (!user) {
                // Return empty array if no user
                return [];
            }

            const { data, error } = await supabase
                .from('testimonials')
                .select(`
                    *,
                    brands:brand_id (
                        id,
                        name
                    )
                `)
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching testimonials:', error);
                // Return empty array on error instead of throwing
                return [];
            }

            if (!data || data.length === 0) return []; // Return empty array for new users

            return data.map(item => ({
                id: item.id,
                customerName: item.customer_name,
                companyTitle: item.company_title,
                content: item.content,
                rating: item.rating,
                date: item.date,
                status: item.status,
                avatar: item.avatar || '',
                source: item.source,
                brandId: item.brand_id || undefined,
                brandName: item.brands?.name || undefined
            }));
        } catch (err: any) {
            // Handle all errors gracefully - return empty array instead of failing
            console.error('Unexpected error fetching testimonials:', err);
            return [];
        }
    }
);

export const addTestimonial = createAsyncThunk(
    'testimonials/addTestimonial',
    async (testimonial: Testimonial, { rejectWithValue }) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user found');

            const dbItem: any = {
                user_id: user.id,
                customer_name: testimonial.customerName,
                company_title: testimonial.companyTitle,
                content: testimonial.content,
                rating: testimonial.rating,
                date: testimonial.date || new Date().toISOString(),
                status: testimonial.status || 'Processing',
                avatar: testimonial.avatar,
                source: testimonial.source || 'Direct'
            };

            // Add brand_id if provided
            if ((testimonial as any).brandId) {
                dbItem.brand_id = (testimonial as any).brandId;
            }

            const { data, error } = await supabase.from('testimonials').insert(dbItem).select().single();
            if (error) throw error;

            return { ...testimonial, id: data.id };
        } catch (err: any) {
            return rejectWithValue(err.message);
        }
    }
);

export const updateTestimonial = createAsyncThunk(
    'testimonials/updateTestimonial',
    async ({ id, updates }: { id: string; updates: Partial<Testimonial & { brandId?: string }> }, { rejectWithValue }) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user found');

            const dbUpdates: any = {};

            if (updates.customerName !== undefined) dbUpdates.customer_name = updates.customerName;
            if (updates.companyTitle !== undefined) dbUpdates.company_title = updates.companyTitle;
            if (updates.content !== undefined) dbUpdates.content = updates.content;
            if (updates.rating !== undefined) dbUpdates.rating = updates.rating;
            if (updates.date !== undefined) dbUpdates.date = updates.date;
            if (updates.status !== undefined) dbUpdates.status = updates.status;
            if (updates.avatar !== undefined) dbUpdates.avatar = updates.avatar;
            if (updates.source !== undefined) dbUpdates.source = updates.source;
            
            // Handle brand_id separately
            if (updates.brandId !== undefined) {
                dbUpdates.brand_id = updates.brandId || null;
            }

            const { data, error } = await supabase
                .from('testimonials')
                .update(dbUpdates)
                .eq('id', id)
                .eq('user_id', user.id)
                .select(`
                    *,
                    brands:brand_id (
                        id,
                        name
                    )
                `)
                .single();

            if (error) throw error;

            return {
                id: data.id,
                customerName: data.customer_name,
                companyTitle: data.company_title,
                content: data.content,
                rating: data.rating,
                date: data.date,
                status: data.status,
                avatar: data.avatar || '',
                source: data.source,
                brandId: data.brand_id || undefined,
                brandName: data.brands?.name || undefined
            };
        } catch (err: any) {
            return rejectWithValue(err.message);
        }
    }
);

const testimonialsSlice = createSlice({
    name: 'testimonials',
    initialState,
    reducers: {
        setTestimonials(state, action: PayloadAction<Testimonial[]>) {
            state.items = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchTestimonials.pending, (state) => {
                state.loading = true;
            })
            .addCase(fetchTestimonials.fulfilled, (state, action) => {
                state.loading = false;
                state.items = action.payload;
            })
            .addCase(fetchTestimonials.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            .addCase(addTestimonial.fulfilled, (state, action) => {
                state.items.unshift(action.payload);
            })
            .addCase(updateTestimonial.fulfilled, (state, action) => {
                const index = state.items.findIndex(item => item.id === action.payload.id);
                if (index !== -1) {
                    state.items[index] = action.payload;
                }
            });
    }
});

export const { setTestimonials } = testimonialsSlice.actions;
export default testimonialsSlice.reducer;
