
import { ScrapedReview } from "./trustpilot";

// using multi-proxy helper
import { fetchWithProxy } from "./proxy_helper";

export async function scrapeGoogleReviews(url: string): Promise<ScrapedReview[]> {
    try {
        if (!url.includes('google.com') && !url.includes('goo.gl')) {
            throw new Error('Invalid Google Reviews URL');
        }

        console.log(`Fetching ${url} via multi-proxy...`);

        const html = await fetchWithProxy(url);
        console.log(`Fetched ${html.length} bytes of HTML`);

        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");

        // Google Maps HTML is notoriously complex and obfuscated. 
        // We will try to find standard review structures or JSON-LD.

        // Attempt 1: JSON-LD (Best bet if available)
        // Note: Google Maps often doesn't embed reviews in JSON-LD in the main response, 
        // but let's check for any structured data.
        // ... (Reusing logic if applicable, but unlikely for Maps)

        // Attempt 2: HTML Scraping
        // Google often uses obfuscated class names like 'jftiEf' for review blocks.
        // We will look for common patterns.

        const reviews: ScrapedReview[] = [];
        const reviewBlocks = doc.querySelectorAll('.jftiEf, [data-review-id]');

        reviewBlocks.forEach((block, index) => {
            // Limit removed to fetch all available reviews on the page
            // if (reviews.length >= 10) return;

            try {
                // Determine ID
                const dataReviewId = block.getAttribute('data-review-id');
                const id = dataReviewId || `google-review-${index}-${Date.now()}`;

                // Author
                const authorEl = block.querySelector('.d4r55');
                const author = authorEl?.textContent?.trim() || 'Anonymous';

                // Content
                const contentEl = block.querySelector('.wiI7pd');
                // Expand button might hide some text, but usually the full text is in the standard element or aria-label
                const content = contentEl?.textContent?.trim() || '';

                // Rating
                // Usually in aria-label of a span, e.g. "5 stars"
                const ratingEl = block.querySelector('[role="img"][aria-label*="stars"], [role="img"][aria-label*="star"]');
                let rating = 5;
                if (ratingEl) {
                    const ariaLabel = ratingEl.getAttribute('aria-label') || '';
                    const match = ariaLabel.match(/(\d+)/);
                    if (match) rating = parseInt(match[1], 10);
                }

                // Date
                // Relative date usually, e.g. "2 months ago"
                const dateEl = block.querySelector('.rsqaWe');
                const dateText = dateEl?.textContent?.trim() || '';
                // For now, we'll just use current date as parsing "2 months ago" accurately requires generic logic
                // Or we can try to parse it if needed.
                const date = new Date().toISOString();

                // Avatar
                const avatarEl = block.querySelector('img.NBa7we');
                const avatar = avatarEl?.getAttribute('src') || undefined;

                if (content) {
                    reviews.push({
                        id,
                        author,
                        content,
                        rating,
                        date,
                        avatar,
                        title: '' // Google reviews rarely have titles
                    });
                }

            } catch (e) {
                console.warn('Error parsing Google review block', e);
            }
        });

        // Fallback for "Embed" logic if the user provides an embed map URL or similar?
        // Simpler to just stick to the main listing.

        return reviews;

    } catch (error) {
        console.error('Google scraping error:', error);
        throw error;
    }
}
