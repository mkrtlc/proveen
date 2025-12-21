
import { Testimonial, Creative, BrandKit, ActivityItem } from './types';

export const INITIAL_TESTIMONIALS: Testimonial[] = [];

export const INITIAL_CREATIVES: Creative[] = [
  {
    id: '1',
    title: '"Game changer for us..."',
    platform: 'Instagram',
    timestamp: '2m ago',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDgjNYvzaK3bycAz8YRkaB4pkUBIy22IWkncRGJNxQ9qtswkn5KAepk-535GLN4WSB28xWd-UikqWSHnqubHaOMv8UQPkASCDLNp5brklIxRYmKB8Z8m-2GXXmdlRLJXfPGULK6yvc2c4sRx9DicIGGUcvSo4wPD6QeqTyNMs0aSdbcgmJz3lddOT3XCGwXPDZTTDIUNcTNQW54JGT-GjjUJPKnKN35Ej-QWxhbJlR9APcQth4tHBmw5GrLPQs3HeGTBXGUjIMoyRkW'
  },
  {
    id: '2',
    title: 'TechCrunch Feature Quote',
    platform: 'LinkedIn',
    timestamp: '2h ago',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAcyvV8B1o1mSnHVCP0SuC5GhmhCwj1KAjA97-qXcPfRz_y2EILhCmr34xOQbhcktt2P6XieWKXAzWgQDRQgNA42xKq4YXWnfP78oJTvYhZZOUuYQ6sy-xANwyUifjatAInrjwVtOBDQ_qXfinnbWokRo2zClJvCZgQX5HHBtHmEXdXEke7xN_mhszxwmZi3SyptvnEluFGPq5AHr_Ujekbm4pbf0Fy1aWVeKqecSPcQEYkLRpPufdRdwTekFKlCuC_iWBUr1kr1svK'
  },
  {
    id: '3',
    title: 'Customer Love #42',
    platform: 'Twitter',
    timestamp: '5h ago',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD1I7gn6WedlajULi5epsyfdB5juIffb2djUaPDLmkS6zR-AGlyOUimWWYmrvfhpufiokwc3oDMr8qx5J6rJG_nz73J3fY_KTQLortFtFNF5TvwuqI-IxOPXaqdzXbRffLAUDV0BzjDcvij4-eS0StWKVi1kyKOWgtUsIdpIOX84XQG4OYfJttx4eNXbqf8JfggtQ_ZcPYWmQBBFc0wmvkFjiF5CVnqbv3orMNsT9f_37Bu96w9VSXiLhjhORXHQ8v_0t42DfHeFlcS'
  }
];

export const INITIAL_BRAND_KIT: BrandKit = {
  name: 'Proveen',
  primaryColor: '#000000',
  secondaryColor: '#171717',
  accentColor: '#404040',
  headingFont: 'Inter',
  bodyFont: 'Inter',
  primaryLogo: null
};

export const RECENT_ACTIVITIES: ActivityItem[] = [
  { id: '1', type: 'testimonial', message: 'New Testimonial received from Sarah J.', time: '10 minutes ago' },
  { id: '2', type: 'ai', message: 'AI generated 3 new creatives', time: '2 hours ago' },
  { id: '3', type: 'scheduled', message: 'Post scheduled for LinkedIn', time: 'Yesterday' }
];
