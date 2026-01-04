
export interface Testimonial {
  id: string;
  customerName: string;
  companyTitle: string;
  content: string;
  rating: number;
  date: string;
  status: 'Live' | 'Unused' | 'Processing';
  avatar: string;
  source?: 'Google' | 'LinkedIn' | 'Twitter' | 'Direct' | 'Trustpilot' | 'Other';
}

export interface Creative {
  id: string;
  title: string;
  platform: string;
  timestamp: string;
  imageUrl: string;
}

export interface BrandKit {
  name: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  headingFont: string;
  bodyFont: string;
  primaryLogo: string | null;
}

export interface ActivityItem {
  id: string;
  type: 'testimonial' | 'ai' | 'scheduled';
  message: string;
  time: string;
}
