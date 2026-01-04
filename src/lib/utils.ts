/**
 * Get a time-based greeting based on the local hour
 * @returns "Good Morning", "Good Afternoon", "Good Evening", or "Good Night"
 */
export const getTimeBasedGreeting = (): string => {
  const hour = new Date().getHours();
  
  if (hour >= 5 && hour < 12) {
    return 'Good Morning';
  } else if (hour >= 12 && hour < 17) {
    return 'Good Afternoon';
  } else if (hour >= 17 && hour < 22) {
    return 'Good Evening';
  } else {
    return 'Good Night';
  }
};

/**
 * Extract Google Maps Place ID from a Google Maps URL
 * Supports various URL formats:
 * - https://www.google.com/maps/place/.../@lat,lng,zoom/data=!3m1!4b1!4m6!3m5!1sPLACE_ID!8m2!3d...
 * - https://maps.google.com/?cid=CID
 * - https://www.google.com/maps/place/Place+Name/@lat,lng,zoom/data=!4m6!3m5!1sPLACE_ID!...
 * @param url Google Maps URL
 * @returns Place ID or null if not found
 */
export const extractPlaceIdFromUrl = (url: string): string | null => {
  try {
    // Pattern 1: Extract from !1s...! pattern (most common)
    const pattern1 = /!1s([^!]+)!/;
    const match1 = url.match(pattern1);
    if (match1 && match1[1]) {
      return match1[1];
    }

    // Pattern 2: Extract from /place/.../@ pattern
    const pattern2 = /\/place\/([^/@]+)/;
    const match2 = url.match(pattern2);
    if (match2 && match2[1] && match2[1].startsWith('ChIJ')) {
      return match2[1];
    }

    // Pattern 3: Direct place ID in URL (ChIJ...)
    const pattern3 = /(ChIJ[a-zA-Z0-9_-]+)/;
    const match3 = url.match(pattern3);
    if (match3) {
      return match3[1];
    }

    // Pattern 4: If URL already looks like a place ID
    if (url.startsWith('ChIJ') && url.length > 20) {
      return url;
    }

    return null;
  } catch (error) {
    console.error('Error extracting place ID:', error);
    return null;
  }
};
