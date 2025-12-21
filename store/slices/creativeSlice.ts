
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { CreativeFormat, SocialPlatform, WiroAIInput } from '../../lib/layers/types';
import { WiroAIService } from '../../lib/layers/wiro_ai';
import { supabase } from '../../lib/supabase';

export interface GeneratedCreative {
    id: string;
    title: string;
    subtitle: string;
    format: CreativeFormat;
    socialPlatform: SocialPlatform;
    imageUrl: string;
    timestamp: string;
    sentiment: number;
    cta: string;
    quote: string;
}

interface CreativeState {
    isGenerating: boolean;
    currentQuote: string;
    generatedCreatives: GeneratedCreative[];
    selection: {
        format: CreativeFormat;
        socialPlatform: SocialPlatform;
        cta: string;
    };
    loading: boolean;
    error: string | null;
}

const initialState: CreativeState = {
    isGenerating: false,
    currentQuote: `"This platform reduced our content creation time by 80% in the first week."`,
    generatedCreatives: [],
    selection: {
        format: 'Post',
        socialPlatform: 'Instagram',
        cta: 'Try it free today →'
    },
    loading: false,
    error: null
};

export const fetchCreatives = createAsyncThunk(
    'creative/fetchCreatives',
    async (_, { rejectWithValue }) => {
        try {
            let user;
            try {
                const { data: { user: userData }, error: userError } = await supabase.auth.getUser();
                if (userError) {
                    console.warn('Failed to get user for creatives:', userError.message);
                    return [];
                }
                user = userData;
            } catch (authErr: any) {
                console.warn('Auth check failed for creatives (network issue?):', authErr.message);
                return [];
            }

            if (!user) {
                return [];
            }

            const { data, error } = await supabase
                .from('creatives')
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
                console.error('Error fetching creatives:', error);
                return [];
            }
            return data || [];
        } catch (err: any) {
            console.error('Unexpected error fetching creatives:', err);
            return [];
        }
    }
);

// Helper function to upload image to Supabase storage
async function uploadImageToStorage(imageUrl: string, userId: string, brandId: string | null): Promise<string> {
    try {
        let imageBlob: Blob;
        
        // Handle different URL types
        if (imageUrl.startsWith('blob:') || imageUrl.startsWith('data:')) {
            // For blob or data URLs, fetch directly
            const response = await fetch(imageUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch blob/data URL: ${response.statusText}`);
            }
            imageBlob = await response.blob();
        } else if (imageUrl.startsWith('/assets/') || imageUrl.startsWith('/api/')) {
            // For local assets, construct full URL
            const fullUrl = imageUrl.startsWith('/api/') 
                ? `${window.location.origin}${imageUrl}`
                : `${window.location.origin}${imageUrl}`;
            const response = await fetch(fullUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch local asset: ${response.statusText}`);
            }
            imageBlob = await response.blob();
        } else {
            // For remote URLs (CDN, etc.)
            const response = await fetch(imageUrl, { mode: 'cors' });
            if (!response.ok) {
                throw new Error(`Failed to fetch remote image: ${response.statusText}`);
            }
            imageBlob = await response.blob();
        }
        
        // Generate a unique filename
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(2, 9);
        const brandPrefix = brandId ? `${brandId}/` : '';
        const filename = `${brandPrefix}creative-${timestamp}-${randomSuffix}.png`;
        
        // Upload to Supabase storage bucket 'creatives'
        const { data, error } = await supabase.storage
            .from('creatives')
            .upload(filename, imageBlob, {
                contentType: 'image/png',
                upsert: false,
                cacheControl: '3600'
            });
        
        if (error) {
            console.error('Error uploading image to storage:', error);
            // If bucket doesn't exist or permission error, log it
            if (error.message?.includes('Bucket') || error.message?.includes('not found')) {
                console.error('Storage bucket "creatives" may not exist. Please create it in Supabase Dashboard > Storage.');
            }
            // Fallback to original URL if upload fails
            return imageUrl;
        }
        
        // Get public URL
        const { data: urlData } = supabase.storage
            .from('creatives')
            .getPublicUrl(filename);
        
        console.log('Successfully uploaded creative to Supabase storage:', urlData.publicUrl);
        return urlData.publicUrl;
    } catch (error: any) {
        console.error('Error uploading image to Supabase storage:', error);
        console.error('Error details:', {
            message: error.message,
            imageUrl: imageUrl.substring(0, 100) + '...',
            userId,
            brandId
        });
        // Fallback to original URL on error
        return imageUrl;
    }
}

export const generateCreative = createAsyncThunk(
    'creative/generate',
    async (payload: { input: WiroAIInput; brandConfig?: any; brandId?: string | null }, { dispatch }) => {
        // 1. Generate Content via AI Service
        const response = await WiroAIService.generateContent(payload.input, payload.brandConfig);

        // 2. Upload image to Supabase storage
        let user;
        let finalImageUrl = response.imageUrl || '/assets/generated_placeholder.png';
        
        try {
            const { data: { user: userData }, error: userError } = await supabase.auth.getUser();
            if (userError) {
                console.warn('Failed to get user for creative save:', userError.message);
                // Continue without user - we'll just use the CDN URL
            } else {
                user = userData;
            }
        } catch (authErr: any) {
            // Handle network errors gracefully
            console.warn('Auth check failed for creative save (network issue?):', authErr.message);
            // Continue without user
        }
        
        // Always try to upload to Supabase storage if we have a user and a valid image URL
        if (user && response.imageUrl) {
            try {
                console.log('Attempting to upload creative to Supabase storage...');
                finalImageUrl = await uploadImageToStorage(response.imageUrl, user.id, payload.brandId || null);
                console.log('Upload completed. Final image URL:', finalImageUrl);
            } catch (error: any) {
                console.warn('Failed to upload image to Supabase storage, using CDN URL:', error?.message || error);
                // If RLS policy error, that's okay - we'll use the CDN URL
                if (error?.message?.includes('row-level security') || error?.message?.includes('RLS')) {
                    console.warn('Storage RLS policy issue - using CDN URL instead. This is okay for development.');
                }
                // Keep the original CDN URL as fallback
                finalImageUrl = response.imageUrl;
            }
        } else {
            if (!user) {
                console.info('No user session - skipping Supabase upload, using CDN URL');
            }
            if (!response.imageUrl) {
                console.warn('No image URL to upload');
            }
        }

        // 3. Save to Supabase database (continue even if this fails)
        if (user) {
            try {
                // Convert sentiment to integer (0-100 scale) if it's a decimal (0-1 scale)
                let sentimentValue = response.sentiment;
                if (typeof sentimentValue === 'number' && sentimentValue <= 1) {
                    sentimentValue = Math.round(sentimentValue * 100);
                } else {
                    sentimentValue = Math.round(Number(sentimentValue) || 90);
                }
                
                const newCreative = {
                    user_id: user.id,
                    brand_id: payload.brandId || null,
                    title: `Customer Love`,
                    subtitle: "Generated recently",
                    format: payload.input.format || 'Post',
                    social_platform: payload.input.socialPlatform || 'Instagram',
                    image_url: finalImageUrl,
                    sentiment: sentimentValue,
                    cta: payload.input.cta,
                    quote: response.quote,
                    timestamp: new Date().toISOString()
                };

                const { data, error } = await supabase.from('creatives').insert(newCreative).select().single();
                if (!error && data) {
                    // Clean payload.input to remove any non-serializable values (like React events)
                    const cleanInput = {
                        ...payload.input,
                        additionalPrompt: typeof payload.input.additionalPrompt === 'string' 
                            ? payload.input.additionalPrompt 
                            : undefined
                    };
                    return { response: { ...response, imageUrl: finalImageUrl }, input: cleanInput, startId: data.id };
                } else if (error) {
                    console.warn('Error saving creative to database (continuing anyway):', error.message);
                    // Don't fail the whole operation if database save fails - we still have the image
                }
            } catch (dbErr: any) {
                console.warn('Failed to save creative to database (network/connection issue?):', dbErr?.message || dbErr);
                // Continue - the image generation was successful, just database save failed
            }
        } else {
            console.info('No user session - skipping database save');
        }

        // Clean payload.input to remove any non-serializable values before returning
        const cleanInput = {
            ...payload.input,
            additionalPrompt: typeof payload.input.additionalPrompt === 'string' 
                ? payload.input.additionalPrompt 
                : undefined
        };
        return { response: { ...response, imageUrl: finalImageUrl }, input: cleanInput };
    }
);

const creativeSlice = createSlice({
    name: 'creative',
    initialState,
    reducers: {
        setFormat(state, action: PayloadAction<CreativeFormat>) {
            state.selection.format = action.payload;
        },
        setSocialPlatform(state, action: PayloadAction<SocialPlatform>) {
            state.selection.socialPlatform = action.payload;
        },
        setCta(state, action: PayloadAction<string>) {
            state.selection.cta = action.payload;
        },
        setCurrentQuote(state, action: PayloadAction<string>) {
            state.currentQuote = action.payload;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchCreatives.pending, (state) => {
                state.loading = true;
            })
            .addCase(fetchCreatives.fulfilled, (state, action) => {
                state.loading = false;
                state.generatedCreatives = action.payload.map((item: any) => ({
                    id: item.id,
                    title: item.title,
                    subtitle: item.subtitle,
                    format: item.format as CreativeFormat,
                    socialPlatform: item.social_platform as SocialPlatform,
                    imageUrl: item.image_url,
                    timestamp: item.timestamp,
                    sentiment: item.sentiment,
                    cta: item.cta,
                    quote: item.quote
                }));
            })
            .addCase(fetchCreatives.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            .addCase(generateCreative.pending, (state) => {
                state.isGenerating = true;
            })
            .addCase(generateCreative.fulfilled, (state, action) => {
                state.isGenerating = false;
                state.currentQuote = action.payload.response.quote;

                const newCreative: GeneratedCreative = {
                    id: action.payload.startId || Date.now().toString(),
                    title: `Customer Love #${state.generatedCreatives.length + 42}`,
                    subtitle: "Generated recently",
                    format: state.selection.format,
                    socialPlatform: state.selection.socialPlatform,
                    imageUrl: action.payload.response.imageUrl || '/assets/generated_placeholder.png',
                    timestamp: "Just now",
                    sentiment: action.payload.response.sentiment,
                    cta: state.selection.cta,
                    quote: action.payload.response.quote
                };

                state.generatedCreatives.unshift(newCreative);

                if (state.generatedCreatives.length > 20) {
                    state.generatedCreatives = state.generatedCreatives.slice(0, 20);
                }
            })
            .addCase(generateCreative.rejected, (state) => {
                state.isGenerating = false;
            });
    },
});

export const { setFormat, setSocialPlatform, setCta, setCurrentQuote } = creativeSlice.actions;
export default creativeSlice.reducer;
