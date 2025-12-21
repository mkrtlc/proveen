
import React, { useState, useEffect } from 'react';
import { scrapeTrustpilotReviews, ScrapedReview } from '../lib/scrapers/trustpilot';
import { useAppDispatch, useAppSelector } from '../store';
import { addSource } from '../store/slices/reviewsSlice';
import { fetchAllBrands } from '../store/slices/brandSlice';
import { Icon } from './Icon';

interface TrustpilotSourceModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const TrustpilotSourceModal: React.FC<TrustpilotSourceModalProps> = ({ isOpen, onClose }) => {
    const dispatch = useAppDispatch();
    const { brands } = useAppSelector((state) => state.brand);
    const { sources } = useAppSelector((state) => state.reviews);
    const [url, setUrl] = useState('');
    const [selectedBrandId, setSelectedBrandId] = useState<string>('');
    const [reviews, setReviews] = useState<ScrapedReview[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [step, setStep] = useState<'input' | 'preview'>('input');

    // Load brands and reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            dispatch(fetchAllBrands());
            setError(null);
            setReviews([]);
            setStep('input');
            setSelectedBrandId('');
            setUrl('');
        }
    }, [isOpen, dispatch]);

    // Check if trustpilot source already exists for selected brand
    const hasExistingSource = selectedBrandId && sources.some(
        s => s.brandId === selectedBrandId && s.type === 'trustpilot'
    );

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
            } else {
                setStep('preview');
            }
        } catch (err) {
            setError('Failed to fetch reviews. Please check the URL or try again later.');
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
            setError('A Trustpilot source already exists for this brand. Please remove it first.');
            return;
        }

        try {
            const result = await dispatch(addSource({
                id: `trustpilot-${Date.now()}`,
                type: 'trustpilot',
                url: url,
                lastUpdated: Date.now(),
                reviews: reviews,
                autoRefresh: true,
                brandId: selectedBrandId
            })).unwrap();

            onClose();
        } catch (err: any) {
            setError(err || 'Failed to add source');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">

                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Import from Trustpilot</h2>
                        <p className="text-sm text-gray-500">Enter a Trustpilot URL to grab recent reviews.</p>
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
                            <div>
                                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Select Brand</label>
                                <select
                                    value={selectedBrandId}
                                    onChange={(e) => setSelectedBrandId(e.target.value)}
                                    className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all outline-none"
                                >
                                    <option value="">-- Select a brand --</option>
                                    {brands.map((brand) => (
                                        <option key={brand.id} value={brand.id}>
                                            {brand.name}
                                        </option>
                                    ))}
                                </select>
                                {brands.length === 0 && (
                                    <p className="text-xs text-gray-500 mt-1">No brands found. Please create a brand first.</p>
                                )}
                            </div>
                            {hasExistingSource && (
                                <div className="p-3 bg-yellow-50 text-yellow-700 text-sm rounded-lg">
                                    A Trustpilot source already exists for this brand. Remove it first to add a new one.
                                </div>
                            )}
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Icon name="link" size={20} className="absolute left-3 top-3 text-gray-400" />
                                    <input
                                        type="text"
                                        value={url}
                                        onChange={(e) => setUrl(e.target.value)}
                                        placeholder="https://www.trustpilot.com/review/..."
                                        className="w-full pl-10 pr-4 h-11 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all outline-none"
                                        onKeyDown={(e) => e.key === 'Enter' && handleScrape()}
                                        disabled={!selectedBrandId || hasExistingSource}
                                    />
                                </div>
                                <button
                                    onClick={handleScrape}
                                    disabled={loading || !url || !selectedBrandId || hasExistingSource}
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
                                    className="text-xs text-green-600 hover:text-green-800"
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
                                        <p className="text-sm text-gray-600 line-clamp-2">{review.title} - {review.content}</p>
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
                        Powered by public proxy. Not affiliated with Trustpilot.
                    </div>
                )}
            </div>
        </div>
    );
};

export default TrustpilotSourceModal;
