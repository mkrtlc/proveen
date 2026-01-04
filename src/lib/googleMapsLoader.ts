/**
 * Utility to load Google Maps JavaScript API dynamically
 */

declare global {
    interface Window {
        google: any;
    }
}

let loadPromise: Promise<void> | null = null;

/**
 * Initialize and load Google Maps JavaScript API
 * Uses VITE_GOOGLE_MAPS_API_KEY from environment variables
 * @returns Promise that resolves when the API is loaded
 */
export async function loadGoogleMapsAPI(): Promise<void> {
    // Check if already loaded
    if (window.google && window.google.maps && window.google.maps.places) {
        return Promise.resolve();
    }

    // Return existing promise if already loading
    if (loadPromise) {
        return loadPromise;
    }

    // Get API key from environment variable
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || null;

    if (!apiKey) {
        const error = new Error(
            'Google Maps API key not configured. Please add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your .env.local file.'
        );
        console.error(error);
        throw error;
    }

    // Create load promise
    loadPromise = new Promise<void>((resolve, reject) => {
        // Check again in case it was loaded between checks
        if (window.google && window.google.maps && window.google.maps.places) {
            resolve();
            return;
        }

        // Check if script is already being loaded
        const existingScript = document.querySelector(
            'script[src*="maps.googleapis.com/maps/api/js"]'
        );
        if (existingScript) {
            // Wait for existing script to load
            existingScript.addEventListener('load', () => {
                // Wait a bit more for the API to be ready
                const checkInterval = setInterval(() => {
                    if (window.google?.maps?.places) {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 100);

                // Timeout after 10 seconds
                setTimeout(() => {
                    clearInterval(checkInterval);
                    if (!window.google?.maps?.places) {
                        reject(new Error('Google Maps API failed to load'));
                    }
                }, 10000);
            });
            existingScript.addEventListener('error', () => {
                reject(new Error('Failed to load Google Maps API'));
            });
            return;
        }

        // Create and load script
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&loading=async&libraries=places`;
        script.async = true;
        script.defer = true;

        script.onload = () => {
            // Wait for the API to be fully ready
            let attempts = 0;
            const checkReady = setInterval(() => {
                if (window.google?.maps?.places) {
                    clearInterval(checkReady);
                    resolve();
                } else if (attempts++ > 50) {
                    clearInterval(checkReady);
                    reject(new Error('Google Maps Places API failed to initialize'));
                }
            }, 100);
        };

        script.onerror = () => {
            reject(new Error('Failed to load Google Maps API script'));
        };

        document.head.appendChild(script);
    });

    return loadPromise;
}

