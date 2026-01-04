'use client';

import React from 'react';
import { BrandProvider } from '@/context/BrandContext';
import { CreativeProvider } from '@/context/CreativeContext';
import { TestimonialProvider } from '@/context/TestimonialContext';
import { ReviewProvider } from '@/context/ReviewContext';

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <BrandProvider>
            <CreativeProvider>
                <TestimonialProvider>
                    <ReviewProvider>
                        {children}
                    </ReviewProvider>
                </TestimonialProvider>
            </CreativeProvider>
        </BrandProvider>
    );
}
