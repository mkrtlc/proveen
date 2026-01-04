
import { ScrapedReview } from "./trustpilot";
import { extractPlaceIdFromUrl } from "../utils";
import { loadGoogleMapsAPI } from "../googleMapsLoader";

// Declare Google Maps types
declare global {
    interface Window {
        google: any;
    }
}

/**
 * Fetch Google Reviews using Google Maps Places API
 * @param urlOrPlaceId Google Maps URL or Place ID
 * @returns Array of scraped reviews
 */
export async function scrapeGoogleReviews(urlOrPlaceId: string): Promise<ScrapedReview[]> {
    try {
        // Ensure Google Maps API is loaded
        await loadGoogleMapsAPI();

        // Extract place ID from URL if needed
        let placeId = urlOrPlaceId;
        if (urlOrPlaceId.includes('google.com') || urlOrPlaceId.includes('goo.gl') || urlOrPlaceId.includes('maps')) {
            const extractedId = extractPlaceIdFromUrl(urlOrPlaceId);
            if (!extractedId) {
                throw new Error('Could not extract Place ID from URL. Please provide a valid Google Maps URL or Place ID.');
            }
            placeId = extractedId;
        }

        console.log(`Fetching reviews for Place ID: ${placeId} using Google Maps Places API...`);

        // Create a new Place instance
        const { Place } = window.google.maps.places;
        const place = new Place({
            id: placeId,
        });

        // Fetch fields including reviews
        await place.fetchFields({
            fields: ['displayName', 'formattedAddress', 'location', 'reviews', 'rating'],
        });

        // Convert Google Places reviews to ScrapedReview format
        const reviews: ScrapedReview[] = [];

        if (place.reviews && place.reviews.length > 0) {
            place.reviews.forEach((review: any, index: number) => {
                try {
                    const reviewRating = review.rating || 5;
                    const reviewText = review.text || '';
                    const authorName = review.authorAttribution?.displayName || 'Anonymous';
                    const authorUri = review.authorAttribution?.uri || '';
                    const publishTime = review.publishTime || new Date().toISOString();

                    // Convert publishTime to ISO string if it's a Date object
                    let dateString = publishTime;
                    if (publishTime instanceof Date) {
                        dateString = publishTime.toISOString();
                    } else if (typeof publishTime === 'string') {
                        // Try to parse if it's a timestamp string
                        const parsed = new Date(publishTime);
                        if (!isNaN(parsed.getTime())) {
                            dateString = parsed.toISOString();
                        }
                    }

                    if (reviewText) {
                        reviews.push({
                            id: `google-review-${placeId}-${index}-${Date.now()}`,
                            author: authorName,
                            content: reviewText,
                            rating: reviewRating,
                            date: dateString,
                            avatar: review.authorAttribution?.photoUri || undefined,
                            title: '', // Google reviews don't have titles
                            source: 'Google',
                            url: authorUri || undefined
                        });
                    }
                } catch (e) {
                    console.warn('Error parsing Google review:', e);
                }
            });
        } else {
            console.warn(`No reviews found for place: ${place.displayName || placeId}`);
        }

        console.log(`Successfully fetched ${reviews.length} reviews from Google Maps Places API`);
        return reviews;

    } catch (error: any) {
        console.error('Google Maps Places API error:', error);
        throw new Error(error.message || 'Failed to fetch reviews from Google Maps Places API');
    }
}
