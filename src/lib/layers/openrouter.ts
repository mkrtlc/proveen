
export class OpenRouterService {
    private static API_URL = 'https://openrouter.ai/api/v1/chat/completions';

    static async correctGrammar(text: string): Promise<string> {
        const apiKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY; // Ensure this is set in .env

        if (!apiKey) {
            console.warn('OpenRouter API key missing. Skipping grammar correction.');
            return text;
        }

        try {
            const response = await fetch(this.API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': window.location.origin, // Required by OpenRouter
                    'X-Title': 'Proveen' // Optional
                },
                body: JSON.stringify({
                    model: 'openai/gpt-3.5-turbo', // Cost-effective model
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a helpful assistant that corrects grammar and spelling in customer testimonials. Maintain the original tone, sentiment, and LANGUAGE. Do not translate. Return ONLY the corrected text, no explanations.'
                        },
                        {
                            role: 'user',
                            content: text
                        }
                    ]
                })
            });

            if (!response.ok) {
                throw new Error(`OpenRouter API error: ${response.statusText}`);
            }

            const data = await response.json();
            return data.choices[0]?.message?.content?.trim() || text;

        } catch (error) {
            console.error('Failed to correct grammar:', error);
            return text; // Fallback to original text
        }
    }
}
