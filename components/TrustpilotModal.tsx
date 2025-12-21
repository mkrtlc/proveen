
import React, { useState } from 'react';
import { scrapeTrustpilotReviews, ScrapedReview, convertToTestimonial } from '../lib/scrapers/trustpilot';
import { useAppDispatch } from '../store';
import { addTestimonial } from '../store/slices/testimonialsSlice';
import { Testimonial } from '../types';
import { Icon } from './Icon';

interface TrustpilotModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectReview: (reviewId: string) => void;
}

const TrustpilotModal: React.FC<TrustpilotModalProps> = ({ isOpen, onClose, onSelectReview }) => {
    const dispatch = useAppDispatch();
    const [url, setUrl] = useState('');
    const [reviews, setReviews] = useState<ScrapedReview[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Reset state when modal opens
    React.useEffect(() => {
        if (isOpen) {
            setError(null);
            setReviews([]);
            // Keep URL to allow easy retry
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleScrape = async () => {
        if (!url) return;

        setLoading(true);
        setError(null);
        setReviews([]);

        try {
            const scrapedReviews = await scrapeTrustpilotReviews(url);
            setReviews(scrapedReviews);
            if (scrapedReviews.length === 0) {
                setError('No reviews found. Please check the URL.');
            }
        } catch (err) {
            setError('Failed to fetch reviews. Please check the URL or try again later.');
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (review: ScrapedReview) => {
        const testimonial: Testimonial = {
            ...convertToTestimonial(review),
            status: 'Live'
        };

        // Add to Redux store
        dispatch(addTestimonial(testimonial));

        // Notify parent to select this new testimonial
        onSelectReview(testimonial.id);

        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">

                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Import from Trustpilot</h2>
                        <p className="text-sm text-gray-500">Enter a Trustpilot business URL to grab recent reviews.</p>
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

                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Icon name="link" size={20} className="absolute left-3 top-3 text-gray-400" />
                            <input
                                type="text"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                placeholder="https://www.trustpilot.com/review/example.com"
                                className="w-full pl-10 pr-4 h-11 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all outline-none"
                                onKeyDown={(e) => e.key === 'Enter' && handleScrape()}
                            />
                        </div>
                        <button
                            onClick={handleScrape}
                            disabled={loading || !url}
                            className="bg-[#00b67a] hover:bg-[#00a66f] text-white px-6 rounded-xl font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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

                    {error && (
                        <div className="p-4 bg-red-50 text-red-600 text-sm rounded-xl flex items-center gap-2">
                            <Icon name="error" size={18} />
                            {error}
                        </div>
                    )}

                    <div className="flex flex-col gap-3">
                        {reviews.map((review) => (
                            <button
                                key={review.id}
                                onClick={() => handleSelect(review)}
                                className="text-left group p-4 rounded-xl border border-gray-100 hover:border-green-500/30 hover:bg-green-50/30 transition-all flex flex-col gap-2"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="flex text-[#00b67a]">
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

                                <h4 className="font-bold text-gray-900 text-sm line-clamp-1">{review.title}</h4>
                                <p className="text-sm text-gray-600 line-clamp-2">{review.content.replace(review.title || '', '')}</p>
                            </button>
                        ))}

                        {!loading && reviews.length === 0 && !error && url && (
                            <div className="text-center py-8 text-gray-400 text-sm">
                                Press "Find Reviews" to see results here.
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-gray-50 border-t border-gray-100 text-center text-xs text-gray-400">
                    Powered by public proxy. Not affiliated with Trustpilot.
                </div>
            </div>
        </div>
    );
};

export default TrustpilotModal;
