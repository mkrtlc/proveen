
import React, { useState, useEffect } from 'react';
import { scrapeGoogleReviews } from '../lib/scrapers/google_reviews';
import { ScrapedReview } from '../lib/scrapers/trustpilot';
import { useBrand } from '@/context/BrandContext';
import { useReviews } from '@/context/ReviewContext';
import { Icon } from './Icon';

interface GoogleReviewsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const GoogleReviewsModal: React.FC<GoogleReviewsModalProps> = ({ isOpen, onClose }) => {
    const { config, currentBrandId } = useBrand();
    const { sources, addSource } = useReviews();
    const brands = currentBrandId ? [{ id: currentBrandId, name: config.name }] : [];
    const [url, setUrl] = useState('');
    const [selectedBrandId, setSelectedBrandId] = useState<string>('');
    const [reviews, setReviews] = useState<ScrapedReview[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [step, setStep] = useState<'input' | 'preview'>('input');

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setError(null);
            setReviews([]);
            setStep('input');
            setSelectedBrandId(currentBrandId || '');
            setUrl('');
        }
    }, [isOpen, currentBrandId]);

    // Check if google source already exists for selected brand
    const hasExistingSource = !!selectedBrandId && sources.some(
        s => s.brandId === selectedBrandId && s.type === 'google'
    );

    if (!isOpen) return null;

    const handleScrape = async () => {
        if (!url) return;

        setLoading(true);
        setError(null);
        setReviews([]);

        try {
            const scrapedReviews = await scrapeGoogleReviews(url);
            setReviews(scrapedReviews);
            if (scrapedReviews.length === 0) {
                setError('No reviews found. Google Maps structure might be hiding them or the URL is invalid.');
            } else {
                setStep('preview');
            }
        } catch (err: any) {
            console.error(err);
            const errorMessage = err.message || 'Failed to fetch reviews. Please check the URL or try again later.';
            if (errorMessage.includes('API key not configured')) {
                setError('Google Maps API key not configured for this brand. Please add your API key in Brand Settings > Brand Identity.');
            } else {
                setError(errorMessage);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = async () => {
        if (!selectedBrandId) {
            setError('Please select a brand');
            return;
        }

        if (hasExistingSource) {
            setError('A Google source already exists for this brand. Please remove it first.');
            return;
        }

        try {
            await addSource({
                id: `google-${Date.now()}`,
                type: 'google',
                url: url,
                lastUpdated: Date.now(),
                reviews: reviews,
                autoRefresh: true,
                brandId: selectedBrandId
            });

            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to add source');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">

                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Import from Google Reviews</h2>
                        <p className="text-sm text-gray-500">Enter a Google Maps URL to grab recent reviews.</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
                    >
                        <Icon name="close" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 flex-1 overflow-y-auto flex flex-col gap-6">

                    {step === 'input' && (
                        <div className="flex flex-col gap-4">

                            {hasExistingSource && (
                                <div className="p-3 bg-yellow-50 text-yellow-700 text-sm rounded-lg">
                                    A Google source already exists for this brand. Remove it first to add a new one.
                                </div>
                            )}
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Icon name="link" size={20} className="absolute left-3 top-3 text-gray-400" />
                                    <input
                                        type="text"
                                        value={url}
                                        onChange={(e) => setUrl(e.target.value)}
                                        placeholder="https://www.google.com/maps/place/... or Place ID (ChIJ...)"
                                        className="w-full pl-10 pr-4 h-11 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                                        onKeyDown={(e) => e.key === 'Enter' && handleScrape()}
                                        disabled={!selectedBrandId || hasExistingSource}
                                    />
                                </div>
                                <button
                                    onClick={handleScrape}
                                    disabled={loading || !url || !selectedBrandId || hasExistingSource}
                                    className="bg-[#4285F4] hover:bg-[#3367D6] text-white px-6 rounded-xl font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                            Fetching...
                                        </>
                                    ) : (
                                        'Find Reviews'
                                    )}
                                </button>
                            </div>
                            <p className="text-xs text-gray-500">
                                Enter a Google Maps URL or Place ID. Using official Google Maps Places API.
                            </p>
                        </div>
                    )}

                    {error && (
                        <div className="p-4 bg-red-50 text-red-600 text-sm rounded-xl flex items-center gap-2">
                            <Icon name="error" size={18} />
                            {error}
                        </div>
                    )}

                    {step === 'preview' && (
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold text-gray-700">Found {reviews.length} reviews</span>
                                <button
                                    onClick={() => setStep('input')}
                                    className="text-xs text-blue-600 hover:text-blue-800"
                                >
                                    Change URL
                                </button>
                            </div>
                            <div className="flex flex-col gap-3">
                                {reviews.map((review) => (
                                    <div
                                        key={review.id}
                                        className="text-left p-4 rounded-xl border border-gray-100 flex flex-col gap-2 bg-gray-50/50"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="flex text-[#F4B400]">
                                                    {[...Array(5)].map((_, i) => (
                                                        <Icon
                                                            key={i}
                                                            name="star"
                                                            size={16}
                                                            fill={i < review.rating}
                                                        />
                                                    ))}
                                                </div>
                                                <span className="text-xs font-bold text-gray-900">{review.author}</span>
                                            </div>
                                            <span className="text-xs text-gray-400">{new Date(review.date).toLocaleDateString()}</span>
                                        </div>
                                        <p className="text-sm text-gray-600 line-clamp-2">{review.content}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {step === 'preview' && (
                    <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                        <button
                            onClick={() => setStep('input')}
                            className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium text-sm transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirm}
                            className="bg-black text-white px-6 py-2 rounded-xl font-bold text-sm hover:bg-gray-800 transition-colors"
                        >
                            Add Source
                        </button>
                    </div>
                )}
                {step === 'input' && (
                    <div className="p-4 bg-gray-50 border-t border-gray-100 text-center text-xs text-gray-400">
                        Powered by Google Maps Places API.
                    </div>
                )}
            </div>
        </div>
    );
};

export default GoogleReviewsModal;
