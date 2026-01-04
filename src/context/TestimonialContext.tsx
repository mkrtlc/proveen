'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Testimonial } from '@/lib/layers/types'; // Assuming this exists or needs copying
import { supabase } from '@/lib/supabase';

// If Types aren't exported, define them
// import { Testimonial } from '../../lib/layers/types';

interface TestimonialContextType {
    items: Testimonial[];
    loading: boolean;
    error: string | null;
    fetchTestimonials: () => Promise<void>;
    addTestimonial: (testimonial: Testimonial) => Promise<void>;
    updateTestimonial: (id: string, updates: Partial<Testimonial & { brandId?: string }>) => Promise<void>;
}

const TestimonialContext = createContext<TestimonialContextType | undefined>(undefined);

export const TestimonialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [items, setItems] = useState<Testimonial[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchTestimonials = useCallback(async () => {
        setLoading(true);
        try {
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError || !user) {
                setLoading(false);
                return;
            }

            const { data, error } = await supabase
                .from('testimonials')
                .select(`*, brands:brand_id(id, name)`)
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching testimonials:', error);
                setError(error.message);
            } else if (data) {
                setItems(data.map(item => ({
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
                })));
            }
        } catch (err: any) {
            console.error('Unexpected error fetching testimonials:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const addTestimonial = useCallback(async (testimonial: Testimonial) => {
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
                source: testimonial.source || 'Direct',
                brand_id: (testimonial as any).brandId || null
            };

            const { data, error } = await supabase.from('testimonials').insert(dbItem).select().single();
            if (error) throw error;

            if (data) {
                const newItem = { ...testimonial, id: data.id };
                setItems(prev => [newItem, ...prev]);
            }
        } catch (err: any) {
            console.error('Error adding testimonial:', err);
            setError(err.message);
            throw err;
        }
    }, []);

    const updateTestimonial = useCallback(async (id: string, updates: Partial<Testimonial & { brandId?: string }>) => {
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
            if (updates.brandId !== undefined) dbUpdates.brand_id = updates.brandId || null;

            const { data, error } = await supabase
                .from('testimonials')
                .update(dbUpdates)
                .eq('id', id)
                .eq('user_id', user.id)
                .select(`*, brands:brand_id(id, name)`)
                .single();

            if (error) throw error;

            if (data) {
                const updatedItem = {
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
                setItems(prev => prev.map(item => item.id === id ? updatedItem : item));
            }
        } catch (err: any) {
            console.error('Error updating testimonial:', err);
            setError(err.message);
            throw err;
        }
    }, []);

    useEffect(() => {
        fetchTestimonials();
    }, [fetchTestimonials]);

    return (
        <TestimonialContext.Provider value={{ items, loading, error, fetchTestimonials, addTestimonial, updateTestimonial }}>
            {children}
        </TestimonialContext.Provider>
    );
};

export const useTestimonials = () => {
    const context = useContext(TestimonialContext);
    if (context === undefined) {
        throw new Error('useTestimonials must be used within a TestimonialProvider');
    }
    return context;
};
