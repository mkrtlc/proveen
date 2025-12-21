// This file runs in Deno runtime (Supabase Edge Functions)
// TypeScript errors for Deno.* are expected in IDE but will work at runtime
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * Supabase Edge Function: Extract Brand Information from URL
 * 
 * This function fetches a website's HTML and uses OpenRouter (with GPT-4o-mini) to extract:
 * - Brand name
 * - Brand colors (primary, secondary, accent)
 * - Logo URL
 * - Background patterns/images
 */

interface RequestBody {
  url: string;
}

interface ExtractedBrandData {
  name?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  logoUrl?: string;
  backgroundPattern?: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    // Get OpenRouter API key from environment
    const openrouterApiKey = Deno.env.get('OPENROUTER_API_KEY');
    if (!openrouterApiKey) {
      throw new Error('OPENROUTER_API_KEY environment variable is not set');
    }

    // Parse request body
    const { url }: RequestBody = await req.json();
    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Normalize URL
    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;

    // Fetch the website HTML
    const htmlResponse = await fetch(normalizedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!htmlResponse.ok) {
      throw new Error(`Failed to fetch website: ${htmlResponse.status}`);
    }

    const html = await htmlResponse.text();
    
    // Extract text content (first 50000 chars to avoid token limits)
    const htmlSnippet = html.substring(0, 50000);

    // Use OpenRouter to extract brand information
    const openrouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openrouterApiKey}`,
        'HTTP-Referer': normalizedUrl, // Optional: helps with rate limiting
        'X-Title': 'Proveen Brand Extractor', // Optional: identifies your app
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini', // Using OpenAI model through OpenRouter
        messages: [
          {
            role: 'system',
            content: `You are a brand extraction expert. Analyze the provided HTML and extract brand information. Return ONLY a valid JSON object with the following structure:
{
  "name": "brand name or null",
  "primaryColor": "hex color code or null",
  "secondaryColor": "hex color code or null",
  "accentColor": "hex color code or null",
  "logoUrl": "full URL to logo image or null",
  "backgroundPattern": "URL to background pattern/image or null"
}

Look for:
- Brand name in <title>, <h1>, meta tags, or prominent text
- Colors in CSS (style tags, inline styles), meta theme-color, or common brand color patterns
- Logo in <img> tags with "logo" in src/alt, or <svg> elements, or favicon/apple-touch-icon
- Background patterns in CSS background-image properties

Return null for any field you cannot find. Only return valid JSON, no other text.`
          },
          {
            role: 'user',
            content: `Extract brand information from this HTML:\n\n${htmlSnippet}`
          }
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!openrouterResponse.ok) {
      const errorText = await openrouterResponse.text();
      throw new Error(`OpenRouter API error: ${errorText}`);
    }

    const openrouterData = await openrouterResponse.json();
    const content = openrouterData.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No content returned from OpenRouter');
    }

    // Parse the JSON response
    let extractedData: ExtractedBrandData;
    try {
      // Clean the response in case there are markdown code blocks
      const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      extractedData = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('Failed to parse OpenRouter response:', content);
      throw new Error('Failed to parse brand extraction result');
    }

    // Convert relative URLs to absolute
    if (extractedData.logoUrl && !extractedData.logoUrl.startsWith('http')) {
      try {
        const baseUrl = new URL(normalizedUrl);
        extractedData.logoUrl = new URL(extractedData.logoUrl, baseUrl).href;
      } catch (e) {
        // If URL parsing fails, keep original
      }
    }

    if (extractedData.backgroundPattern && !extractedData.backgroundPattern.startsWith('http')) {
      try {
        const baseUrl = new URL(normalizedUrl);
        extractedData.backgroundPattern = new URL(extractedData.backgroundPattern, baseUrl).href;
      } catch (e) {
        // If URL parsing fails, keep original
      }
    }

    return new Response(
      JSON.stringify(extractedData),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error: any) {
    console.error('Error in extract-brand function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});
