'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { BrandConfig } from '@/lib/layers/types';
import { INITIAL_BRAND_KIT } from '@/constants';
import { supabase } from '@/lib/supabase';

interface BrandState {
    config: BrandConfig;
    currentBrandId: string | null;
    loading: boolean;
    error: string | null;
}

interface BrandContextType extends BrandState {
    fetchBrand: (brandId?: string | null) => Promise<void>;
    saveBrand: (config: BrandConfig, brandId?: string | null) => Promise<any>;
    updateBrandConfig: (updates: Partial<BrandConfig>) => void;
    resetBrandConfig: () => void;
}

const BrandContext = createContext<BrandContextType | undefined>(undefined);

export const BrandProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [config, setConfig] = useState<BrandConfig>({
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
    });
    const [currentBrandId, setCurrentBrandId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const updateBrandConfig = useCallback((updates: Partial<BrandConfig>) => {
        setConfig(prev => {
            const next = { ...prev };
            if (updates.colors) next.colors = { ...next.colors, ...updates.colors };
            if (updates.logos) next.logos = { ...next.logos, ...updates.logos };
            if (updates.typography) next.typography = { ...next.typography, ...updates.typography };
            if (updates.name !== undefined) next.name = updates.name;
            if (updates.backgroundPattern !== undefined) next.backgroundPattern = updates.backgroundPattern;
            return next;
        });
    }, []);

    const resetBrandConfig = useCallback(() => {
        setConfig({
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
        });
        setCurrentBrandId(null);
    }, []);

    const fetchBrand = useCallback(async (brandId: string | null = null) => {
        setLoading(true);
        setError(null);
        try {
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError || !user) {
                setLoading(false);
                return;
            }

            let data, error;

            // Strict single brand architecture: Always fetch the most recent brand
            const result = await supabase
                .from('brands')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
            data = result.data;
            error = result.error;

            if (error) {
                if (error.code !== 'PGRST116') { // PGRST116 is "no rows returned", which is fine
                    console.error('Error fetching brand:', error);
                    setError(error.message);
                }
            } else if (data) {
                setCurrentBrandId(data.id);
                setConfig({
                    colors: {
                        primary: data.primary_color || INITIAL_BRAND_KIT.primaryColor,
                        secondary: data.secondary_color || INITIAL_BRAND_KIT.secondaryColor,
                        accent: data.accent_color || INITIAL_BRAND_KIT.accentColor,
                        text: '#000000', // Default, likely not stored
                        background: '#ffffff', // Default
                    },
                    logos: {
                        primary: data.primary_logo || '',
                    },
                    typography: {
                        fontFamily: data.heading_font || INITIAL_BRAND_KIT.headingFont,
                    },
                    backgroundPattern: data.background_pattern,
                    name: data.name,
                });
            }
        } catch (err: any) {
            console.error('Unexpected error fetching brand:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const saveBrand = useCallback(async (newConfig: BrandConfig, brandId: string | null = null) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user found');

            const brandData = {
                user_id: user.id,
                name: newConfig.name || 'My Brand',
                primary_color: newConfig.colors.primary || INITIAL_BRAND_KIT.primaryColor,
                secondary_color: newConfig.colors.secondary || INITIAL_BRAND_KIT.secondaryColor,
                accent_color: newConfig.colors.accent || INITIAL_BRAND_KIT.accentColor,
                body_font: newConfig.typography.fontFamily || INITIAL_BRAND_KIT.headingFont,
                heading_font: newConfig.typography.fontFamily || INITIAL_BRAND_KIT.headingFont,
                primary_logo: newConfig.logos.primary || null,
                background_pattern: newConfig.backgroundPattern || null,
                updated_at: new Date().toISOString(),
            };

            // Check if user already has a brand
            const { data: existingBrand, error: fetchError } = await supabase
                .from('brands')
                .select('id')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (fetchError) throw fetchError;

            let data;
            let error;

            if (existingBrand) {
                // Update existing brand
                const res = await supabase
                    .from('brands')
                    .update(brandData)
                    .eq('id', existingBrand.id)
                    .select()
                    .single();
                data = res.data;
                error = res.error;
            } else {
                // Insert new brand
                const res = await supabase
                    .from('brands')
                    .insert(brandData)
                    .select()
                    .single();
                data = res.data;
                error = res.error;
            }

            if (error) throw error;
            if (data) {
                setCurrentBrandId(data.id);
                return data;
            }
        } catch (err: any) {
            console.error('Error saving brand:', err);
            throw err;
        }
    }, []);

    // Fetch initial brand on mount
    useEffect(() => {
        fetchBrand();
    }, [fetchBrand]);

    return (
        <BrandContext.Provider value={{
            config,
            currentBrandId,
            loading,
            error,
            fetchBrand,
            saveBrand,
            updateBrandConfig,
            resetBrandConfig
        }}>
            {children}
        </BrandContext.Provider>
    );
};

export const useBrand = () => {
    const context = useContext(BrandContext);
    if (context === undefined) {
        throw new Error('useBrand must be used within a BrandProvider');
    }
    return context;
};
