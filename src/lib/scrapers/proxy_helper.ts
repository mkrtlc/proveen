
/**
 * Helper to fetch a URL using multiple public proxies as fallbacks.
 * Public proxies are unreliable, so we try a few reputable ones.
 */

const PROXIES = [
    // CorsProxy.io - Fast, but aggressive rate limits (429)
    // Format: https://corsproxy.io/?<url>
    {
        url: (target: string) => `https://corsproxy.io/?${encodeURIComponent(target)}`,
        type: 'text'
    },
    // CodeTabs - Good alternative
    // Format: https://api.codetabs.com/v1/proxy?quest=<url>
    {
        url: (target: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(target)}`,
        type: 'text'
    },
    // AllOrigins - Reliable but often blocked by major sites like Google
    // Format: https://api.allorigins.win/get?url=<url>
    {
        url: (target: string) => `https://api.allorigins.win/get?url=${encodeURIComponent(target)}&timestamp=${Date.now()}`,
        type: 'json',
        extract: (data: any) => data.contents
    }
];

export async function fetchWithProxy(targetUrl: string): Promise<string> {
    let lastError = null;

    for (const proxy of PROXIES) {
        try {
            const proxyUrl = proxy.url(targetUrl);
            console.log(`Trying proxy: ${proxyUrl}`);

            const response = await fetch(proxyUrl);

            if (!response.ok) {
                // If 429, it's definitely the proxy limiting us.
                // If 403/500, it might be the proxy or the target blocking the proxy.
                throw new Error(`Status ${response.status}: ${response.statusText}`);
            }

            let result;
            if (proxy.type === 'json') {
                const data = await response.json();
                result = proxy.extract ? proxy.extract(data) : data;
            } else {
                result = await response.text();
            }

            if (!result) {
                throw new Error('Empty response from proxy');
            }

            return result; // Success!

        } catch (err: any) {
            console.warn(`Proxy failed:`, err.message);
            lastError = err;
            // Continue to next proxy
        }
    }

    throw new Error(`All proxies failed. Last error: ${lastError?.message || 'Unknown error'}`);
}
