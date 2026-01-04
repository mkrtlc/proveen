export type { Testimonial } from '../../types';

export interface BrandConfig {
    colors: {
        primary: string;
        secondary: string;
        text: string;
        background: string;
        accent?: string;
    };
    logos: {
        primary: string;
        white?: string;
        favicon?: string;
    };
    typography: {
        fontFamily: string;
    };
    backgroundPattern?: string;
    name?: string;
    googleMapsApiKey?: string;
}

export type CreativeFormat = 'Post' | 'Story';
export type SocialPlatform = 'Instagram' | 'LinkedIn' | 'Twitter' | 'Facebook';

export interface CreativeParams {
    testimonialId: string;
    format: CreativeFormat;
    socialPlatform: SocialPlatform;
    cta: string;
    theme?: 'Light' | 'Dark' | 'Brand';
}


export interface WiroAIInput {
    testimonialContent: string;
    format: CreativeFormat;
    socialPlatform: SocialPlatform;
    maxLength: number;
    cta: string;
    title?: string;
    subtitle?: string;
    reviewerInfo?: {
        name?: string;
        avatar?: string;
        rating?: number;
        includeName?: boolean;
        includeAvatar?: boolean;
        includeRating?: boolean;
    };
    additionalPrompt?: string;
}


export interface WiroAIOutput {
    quote: string;
    sentiment: number;
    hashtags: string[];
    imageUrl?: string;
}
