/**
 * Brand Extraction Utility
 * 
 * This utility extracts brand information from a website URL.
 * It can be used with a Supabase Edge Function or backend API.
 */

import { supabase } from './supabase';

export interface ExtractedBrandData {
  name?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  logoUrl?: string;
  backgroundPattern?: string;
}

/**
 * Extract brand information from a website URL using an LLM
 * This should be called from a Supabase Edge Function or backend API
 */
export async function extractBrandFromUrl(url: string): Promise<ExtractedBrandData> {
  try {
    // Normalize URL
    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
    
    // Call Supabase Edge Function
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('No authenticated session');
    }

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-brand`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ url: normalizedUrl }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to extract brand: ${error}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error extracting brand:', error);
    throw error;
  }
}
