'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { CreativeFormat, SocialPlatform, WiroAIInput } from '@/lib/layers/types';
import { WiroAIService } from '@/lib/layers/wiro_ai';
import { supabase } from '@/lib/supabase';


// Define types locally since we are removing Redux
export interface Creative {
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

interface CreativeContextType {
    generatedCreatives: Creative[];
    isGenerating: boolean;
    selection: {
        format: CreativeFormat;
        socialPlatform: SocialPlatform;
        cta: string;
    };
    currentQuote: string;
    loading: boolean;
    error: string | null;
    fetchCreatives: () => Promise<void>;
    generateCreative: (payload: { input: WiroAIInput; brandConfig?: any; brandId?: string | null }) => Promise<any>;
    setFormat: (format: CreativeFormat) => void;
    setSocialPlatform: (platform: SocialPlatform) => void;
    setCta: (cta: string) => void;
    setCurrentQuote: (quote: string) => void;
}

const CreativeContext = createContext<CreativeContextType | undefined>(undefined);

// Helper function to upload image to Supabase storage (copied from slice)
async function uploadImageToStorage(imageUrl: string, userId: string, brandId: string | null): Promise<string> {
    try {
        let imageBlob: Blob;

        if (imageUrl.startsWith('blob:') || imageUrl.startsWith('data:')) {
            const response = await fetch(imageUrl);
            if (!response.ok) throw new Error(`Failed to fetch blob/data URL: ${response.statusText}`);
            imageBlob = await response.blob();
        } else if (imageUrl.startsWith('/assets/') || imageUrl.startsWith('/api/')) {
            const fullUrl = imageUrl.startsWith('/api/')
                ? `${window.location.origin}${imageUrl}`
                : `${window.location.origin}${imageUrl}`;
            const response = await fetch(fullUrl);
            if (!response.ok) throw new Error(`Failed to fetch local asset: ${response.statusText}`);
            imageBlob = await response.blob();
        } else {
            const response = await fetch(imageUrl, { mode: 'cors' });
            if (!response.ok) throw new Error(`Failed to fetch remote image: ${response.statusText}`);
            imageBlob = await response.blob();
        }

        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(2, 9);
        const brandPrefix = brandId ? `${brandId}/` : '';
        const filename = `${brandPrefix}creative-${timestamp}-${randomSuffix}.png`;

        const { data, error } = await supabase.storage
            .from('creatives')
            .upload(filename, imageBlob, {
                contentType: 'image/png',
                upsert: false,
                cacheControl: '3600'
            });

        if (error) {
            console.error('Error uploading image to storage:', error);
            return imageUrl;
        }

        const { data: urlData } = supabase.storage
            .from('creatives')
            .getPublicUrl(filename);

        return urlData.publicUrl;
    } catch (error: any) {
        console.error('Error uploading image to Supabase storage:', error);
        return imageUrl;
    }
}

export const CreativeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [generatedCreatives, setGeneratedCreatives] = useState<Creative[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [currentQuote, setCurrentQuote] = useState(`"This platform reduced our content creation time by 80% in the first week."`);
    const [selection, setSelection] = useState({
        format: 'Post' as CreativeFormat,
        socialPlatform: 'Instagram' as SocialPlatform,
        cta: 'Try it free today →'
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchCreatives = useCallback(async () => {
        setLoading(true);
        try {
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError || !user) {
                setLoading(false);
                return;
            }

            const { data, error } = await supabase
                .from('creatives')
                .select(`*, brands:brand_id(id, name)`)
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching creatives:', error);
                setError(error.message);
            } else if (data) {
                setGeneratedCreatives(data.map((item: any) => ({
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
                })));
            }
        } catch (err: any) {
            console.error('Unexpected error fetching creatives:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const generateCreative = useCallback(async (payload: { input: WiroAIInput; brandConfig?: any; brandId?: string | null }) => {
        setIsGenerating(true);
        try {
            const response = await WiroAIService.generateContent(payload.input, payload.brandConfig);

            let finalImageUrl = response.imageUrl || '/assets/generated_placeholder.png';
            const { data: { user } } = await supabase.auth.getUser();

            if (user && response.imageUrl) {
                try {
                    finalImageUrl = await uploadImageToStorage(response.imageUrl, user.id, payload.brandId || null);
                } catch (e) {
                    console.warn('Upload failed, using original URL');
                }
            }

            if (user) {
                // Convert sentiment to integer
                let sentimentValue = response.sentiment;
                if (typeof sentimentValue === 'number' && sentimentValue <= 1) {
                    sentimentValue = Math.round(sentimentValue * 100);
                } else {
                    sentimentValue = Math.round(Number(sentimentValue) || 90);
                }

                const newCreativeData = {
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

                const { data, error } = await supabase.from('creatives').insert(newCreativeData).select().single();

                if (data) {
                    const newCreative: Creative = {
                        id: data.id,
                        title: data.title,
                        subtitle: data.subtitle,
                        format: data.format as CreativeFormat,
                        socialPlatform: data.social_platform as SocialPlatform,
                        imageUrl: data.image_url,
                        timestamp: data.timestamp, // "Just now" or ISO? use ISO from DB
                        sentiment: data.sentiment,
                        cta: data.cta,
                        quote: data.quote
                    };
                    setGeneratedCreatives(prev => [newCreative, ...prev]);
                    setCurrentQuote(response.quote);
                }
            } else {
                // No user, just add to local state
                const newCreative: Creative = {
                    id: Date.now().toString(),
                    title: `Customer Love`,
                    subtitle: "Generated recently",
                    format: selection.format,
                    socialPlatform: selection.socialPlatform,
                    imageUrl: finalImageUrl,
                    timestamp: "Just now",
                    sentiment: response.sentiment,
                    cta: selection.cta,
                    quote: response.quote
                };
                setGeneratedCreatives(prev => [newCreative, ...prev]);
                setCurrentQuote(response.quote);
            }

            return { response: { ...response, imageUrl: finalImageUrl } };

        } catch (err: any) {
            console.error('Error generating creative:', err);
            throw err;
        } finally {
            setIsGenerating(false);
        }
    }, [selection]);

    const setFormat = useCallback((format: CreativeFormat) => setSelection(prev => ({ ...prev, format })), []);
    const setSocialPlatform = useCallback((platform: SocialPlatform) => setSelection(prev => ({ ...prev, socialPlatform: platform })), []);
    const setCta = useCallback((cta: string) => setSelection(prev => ({ ...prev, cta })), []);

    // Initial fetch
    useEffect(() => {
        fetchCreatives();
    }, [fetchCreatives]);

    return (
        <CreativeContext.Provider value={{
            generatedCreatives,
            isGenerating,
            selection,
            currentQuote,
            loading,
            error,
            fetchCreatives,
            generateCreative,
            setFormat,
            setSocialPlatform,
            setCta,
            setCurrentQuote
        }}>
            {children}
        </CreativeContext.Provider>
    );
};

export const useCreatives = () => {
    const context = useContext(CreativeContext);
    if (context === undefined) {
        throw new Error('useCreatives must be used within a CreativeProvider');
    }
    return context;
};
