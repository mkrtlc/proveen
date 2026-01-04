
import { Testimonial } from "../layers/types";

// Using a public CORS proxy to bypass CORS restrictions on the client side
// Warning: This is a hacky solution and may be unstable or blocked.
// Updated for HMR check
const CORS_PROXY = 'https://corsproxy.io/?';


export interface ScrapedReview {
    id: string;
    author: string;
    content: string;
    rating: number; // 1-5
    date: string;
    avatar?: string;
    title?: string;
    source?: 'Google' | 'Trustpilot';
    url?: string;
}


// Helper to parse JSON-LD
function parseJsonLd(doc: Document): ScrapedReview[] {
    const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
    const reviews: ScrapedReview[] = [];

    scripts.forEach(script => {
        try {
            const json = JSON.parse(script.textContent || '{}');
            let possibleReviews: any[] = [];

            // Handle different JSON-LD structures
            if (json['@type'] === 'Review') {
                possibleReviews.push(json);
            } else if (json['@type'] === 'Product' || json['@type'] === 'Organization' || json['@type'] === 'LocalBusiness') {
                if (json.review) {
                    if (Array.isArray(json.review)) possibleReviews = possibleReviews.concat(json.review);
                    else possibleReviews.push(json.review);
                }
            } else if (Array.isArray(json['@graph'])) {
                json['@graph'].forEach((item: any) => {
                    if (item.review) {
                        if (Array.isArray(item.review)) possibleReviews = possibleReviews.concat(item.review);
                        else possibleReviews.push(item.review);
                    }
                });
            }

            possibleReviews.forEach(r => {
                // Limit removed to fetch all available reviews
                // if (reviews.length >= 5) return;

                // Validate that we have at least some content
                const content = r.reviewBody || '';
                const title = r.headline || r.name || '';

                if (!content && !title) return; // Skip empty reviews

                // Extract datetimes
                const datePublished = r.datePublished || new Date().toISOString();

                reviews.push({
                    id: `json-ld-${reviews.length}-${Date.now()}`,
                    author: r.author?.name || r.author || 'Anonymous',
                    content: content,
                    rating: r.reviewRating?.ratingValue ? parseInt(r.reviewRating.ratingValue) : 5,
                    date: datePublished,
                    avatar: undefined,
                    title: title
                });
            });

        } catch (e) {
            console.warn('Failed to parse JSON-LD block', e);
        }
    });

    return reviews;
}

// using multi-proxy helper
import { fetchWithProxy } from "./proxy_helper";

export async function scrapeTrustpilotReviews(url: string): Promise<ScrapedReview[]> {
    try {
        if (!url.includes('trustpilot.com')) {
            throw new Error('Invalid Trustpilot URL');
        }

        console.log(`Fetching ${url} via multi-proxy...`);

        const html = await fetchWithProxy(url);
        console.log(`Fetched ${html.length} bytes of HTML`);

        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");

        // Strategy 1: JSON-LD
        let reviews = parseJsonLd(doc);

        // Only return if we found valid reviews
        if (reviews.length > 0) {
            console.log(`Found ${reviews.length} reviews via JSON-LD`);
            return reviews;
        }

        // Strategy 2: HTML Scraping (Fallback)
        console.log('JSON-LD failed, falling back to HTML scraping...');

        // Try multiple selector strategies for review cards
        let reviewCards = doc.querySelectorAll('article');
        if (reviewCards.length === 0) {
            // Fallback for older semantics
            reviewCards = doc.querySelectorAll('[class*="card"]');
        }

        const reviewsHTML: ScrapedReview[] = [];

        reviewCards.forEach((card, index) => {
            // Limit removed to fetch all available reviews
            // if (reviewsHTML.length >= 5) return;

            try {
                // Determine if this is actually a review card by checking for content/rating identifiers
                // If it doesn't have a star rating, it's probably not a review card
                const starImg = card.querySelector('img[alt*="stars"], img[src*="stars"]');
                const ratingDiv = card.querySelector('[class*="star-rating"], [class*="starRating"]');

                if (!starImg && !ratingDiv) return;

                const id = card.getAttribute('data-service-review-card-id') || `scraped-${index}-${Date.now()}`;

                // Flexible Author Search
                let author = 'Anonymous';
                const authorEl = card.querySelector('[data-consumer-name-typography], [class*="consumer-name"], .consumer-information__name');
                if (authorEl) author = authorEl.textContent?.trim() || 'Anonymous';

                // Flexible Rating Search
                let rating = 5;
                if (starImg) {
                    const alt = starImg.getAttribute('alt') || '';
                    const match = alt.match(/(\d)/);
                    if (match) rating = parseInt(match[1], 10);
                }

                // Flexible Content Search
                // Try data attributes first (most stable), then class names
                const titleEl = card.querySelector('h2, [data-service-review-title-typography], [class*="review-content__title"]');
                const title = titleEl?.textContent?.trim() || '';

                const contentEl = card.querySelector('[data-service-review-text-typography], [class*="review-content__text"]');
                const contentText = contentEl?.textContent?.trim() || '';

                // If no title and no content, this isn't a valid review card
                if (!title && !contentText) return;

                const content = title ? `${title}\n\n${contentText}` : contentText;

                // Date
                const dateEl = card.querySelector('time');
                const date = dateEl ? dateEl.getAttribute('datetime') || new Date().toISOString() : new Date().toISOString();

                // Avatar
                const avatarImg = card.querySelector('aside img, .consumer-information__picture img') as HTMLImageElement;
                const avatar = avatarImg?.src;

                reviewsHTML.push({
                    id,
                    author,
                    content,
                    rating,
                    date,
                    avatar,
                    title
                });
            } catch (err) {
                console.warn('Error parsing partial review:', err);
            }
        });

        return reviewsHTML;


    } catch (error) {
        console.error('Trustpilot scraping error:', error);
        throw error;
    }
}

// Convert scraped review to Testimonial type expected by the app
export function convertToTestimonial(review: ScrapedReview): Testimonial {
    return {
        id: review.id,
        customerName: review.author,
        companyTitle: 'Verified Customer', // Default since Trustpilot doesn't always show company
        content: review.content,
        avatar: review.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(review.author)}&background=random`,
        rating: review.rating,
        source: 'Trustpilot',
        date: review.date,
        status: 'Live'
    };
}
