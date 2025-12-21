
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { BrandConfig } from '../../lib/layers/types';
import { INITIAL_BRAND_KIT } from '../../constants';
import { supabase } from '../../lib/supabase';

interface BrandRecord {
    id: string;
    name: string;
    primary_color: string;
    secondary_color: string;
    accent_color: string;
    primary_logo: string | null;
    background_pattern: string | null;
    created_at: string;
    updated_at: string;
}

interface BrandState {
    config: BrandConfig;
    brands: BrandRecord[];
    currentBrandId: string | null;
    loading: boolean;
    error: string | null;
}

const initialState: BrandState = {
    config: {
        colors: {
            primary: INITIAL_BRAND_KIT.primaryColor,
            secondary: INITIAL_BRAND_KIT.secondaryColor,
            text: '#000000', // Default
            background: '#ffffff', // Default
            accent: INITIAL_BRAND_KIT.accentColor,
        },
        logos: {
            primary: INITIAL_BRAND_KIT.primaryLogo || '',
        },
        typography: {
            fontFamily: INITIAL_BRAND_KIT.headingFont,
        }
    },
    brands: [],
    currentBrandId: null,
    loading: false,
    error: null,
};

export const fetchAllBrands = createAsyncThunk(
    'brand/fetchAllBrands',
    async (_, { rejectWithValue }) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user found');

            const { data, error } = await supabase
                .from('brands')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (err: any) {
            return rejectWithValue(err.message);
        }
    }
);

export const fetchBrand = createAsyncThunk(
    'brand/fetchBrand',
    async (brandId: string | null, { rejectWithValue }) => {
        try {
            let user;
            try {
                const { data: { user: userData }, error: userError } = await supabase.auth.getUser();
                if (userError) {
                    console.warn('Failed to get user for brand:', userError.message);
                    return null;
                }
                user = userData;
            } catch (authErr: any) {
                console.warn('Auth check failed for brand (network issue?):', authErr.message);
                return null;
            }

            if (!user) {
                return null;
            }

            if (!brandId) {
                // Fetch the most recent brand
                const { data, error } = await supabase
                    .from('brands')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                if (error) {
                    if (error.code === 'PGRST116') return null; // No rows found
                    console.error('Error fetching brand:', error);
                    return null;
                }
                return data;
            } else {
                const { data, error } = await supabase
                    .from('brands')
                    .select('*')
                    .eq('id', brandId)
                    .eq('user_id', user.id)
                    .single();

                if (error) {
                    if (error.code === 'PGRST116') return null;
                    console.error('Error fetching brand:', error);
                    return null;
                }
                return data;
            }
        } catch (err: any) {
            console.error('Unexpected error fetching brand:', err);
            return null;
        }
    }
);

export const saveBrand = createAsyncThunk(
    'brand/saveBrand',
    async ({ config, brandId }: { config: BrandConfig; brandId?: string | null }, { rejectWithValue }) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user found');

            const brandData = {
                user_id: user.id,
                name: config.name || 'My Brand',
                primary_color: config.colors.primary || INITIAL_BRAND_KIT.primaryColor,
                secondary_color: config.colors.secondary || INITIAL_BRAND_KIT.secondaryColor,
                accent_color: config.colors.accent || INITIAL_BRAND_KIT.accentColor,
                body_font: config.typography.fontFamily || INITIAL_BRAND_KIT.headingFont,
                heading_font: config.typography.fontFamily || INITIAL_BRAND_KIT.headingFont,
                primary_logo: config.logos.primary || null,
                background_pattern: config.backgroundPattern || null,
                updated_at: new Date().toISOString(),
            };

            if (brandId) {
                // Update existing brand
                const { data, error } = await supabase
                    .from('brands')
                    .update(brandData)
                    .eq('id', brandId)
                    .eq('user_id', user.id)
                    .select()
                    .single();
                if (error) throw error;
                return data;
            } else {
                // Create new brand
                const { data, error } = await supabase
                    .from('brands')
                    .insert(brandData)
                    .select()
                    .single();
                if (error) throw error;
                return data;
            }
        } catch (err: any) {
            return rejectWithValue(err.message);
        }
    }
);

export const deleteBrand = createAsyncThunk(
    'brand/deleteBrand',
    async (brandId: string, { rejectWithValue }) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user found');

            const { error } = await supabase
                .from('brands')
                .delete()
                .eq('id', brandId)
                .eq('user_id', user.id);

            if (error) throw error;
            return brandId;
        } catch (err: any) {
            return rejectWithValue(err.message);
        }
    }
);

const brandSlice = createSlice({
    name: 'brand',
    initialState,
    reducers: {
        updateBrandConfig(state, action: PayloadAction<Partial<BrandConfig>>) {
            // Deep merge for nested objects
            if (action.payload.colors) {
                state.config.colors = { ...state.config.colors, ...action.payload.colors };
            }
            if (action.payload.logos) {
                state.config.logos = { ...state.config.logos, ...action.payload.logos };
            }
            if (action.payload.typography) {
                state.config.typography = { ...state.config.typography, ...action.payload.typography };
            }
            // Merge other top-level properties
            if (action.payload.name !== undefined) {
                state.config.name = action.payload.name;
            }
            if (action.payload.backgroundPattern !== undefined) {
                state.config.backgroundPattern = action.payload.backgroundPattern;
            }
        },
        setCurrentBrandId(state, action: PayloadAction<string | null>) {
            state.currentBrandId = action.payload;
        },
        resetBrandConfig(state) {
            state.config = {
                colors: {
                    primary: INITIAL_BRAND_KIT.primaryColor,
                    secondary: INITIAL_BRAND_KIT.secondaryColor,
                    text: '#000000',
                    background: '#ffffff',
                    accent: INITIAL_BRAND_KIT.accentColor,
                },
                logos: {
                    primary: INITIAL_BRAND_KIT.primaryLogo || '',
                },
                typography: {
                    fontFamily: INITIAL_BRAND_KIT.headingFont,
                }
            };
            state.currentBrandId = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchAllBrands.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchAllBrands.fulfilled, (state, action) => {
                state.loading = false;
                state.brands = action.payload;
            })
            .addCase(fetchAllBrands.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            .addCase(fetchBrand.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchBrand.fulfilled, (state, action) => {
                state.loading = false;
                if (action.payload) {
                    const dbBrand = action.payload;
                    state.config = {
                        colors: {
                            primary: dbBrand.primary_color || INITIAL_BRAND_KIT.primaryColor,
                            secondary: dbBrand.secondary_color || INITIAL_BRAND_KIT.secondaryColor,
                            accent: dbBrand.accent_color || INITIAL_BRAND_KIT.accentColor,
                            text: state.config.colors.text,
                            background: state.config.colors.background,
                        },
                        logos: {
                            primary: dbBrand.primary_logo || '',
                        },
                        typography: {
                            fontFamily: dbBrand.heading_font || INITIAL_BRAND_KIT.headingFont,
                        },
                        backgroundPattern: dbBrand.background_pattern,
                        name: dbBrand.name,
                    };
                    state.currentBrandId = dbBrand.id;
                }
            })
            .addCase(fetchBrand.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            .addCase(saveBrand.fulfilled, (state, action) => {
                if (action.payload) {
                    state.currentBrandId = action.payload.id;
                    // Refresh brands list
                }
            })
            .addCase(deleteBrand.fulfilled, (state, action) => {
                state.brands = state.brands.filter(b => b.id !== action.payload);
                if (state.currentBrandId === action.payload) {
                    state.currentBrandId = null;
                    state.config = {
                        colors: {
                            primary: INITIAL_BRAND_KIT.primaryColor,
                            secondary: INITIAL_BRAND_KIT.secondaryColor,
                            text: '#000000',
                            background: '#ffffff',
                            accent: INITIAL_BRAND_KIT.accentColor,
                        },
                        logos: {
                            primary: INITIAL_BRAND_KIT.primaryLogo || '',
                        },
                        typography: {
                            fontFamily: INITIAL_BRAND_KIT.headingFont,
                        }
                    };
                }
            });
    }
});

export const { updateBrandConfig, setCurrentBrandId, resetBrandConfig } = brandSlice.actions;
export default brandSlice.reducer;
