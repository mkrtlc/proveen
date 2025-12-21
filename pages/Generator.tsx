import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../store';
import { setFormat, setSocialPlatform, setCta, generateCreative, setCurrentQuote } from '../store/slices/creativeSlice';
import { fetchAllBrands, fetchBrand, setCurrentBrandId } from '../store/slices/brandSlice';
import { fetchTestimonials } from '../store/slices/testimonialsSlice';
import { fetchReviewSources } from '../store/slices/reviewsSlice';
import { SocialPlatform } from '../lib/layers/types';
import { Testimonial } from '../types';
import { Skeleton } from '../components/Skeleton';
import { Icon } from '../components/Icon';

const Generator: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  // Redux State
  const { items: testimonials, loading: testimonialsLoading } = useAppSelector((state) => state.testimonials);
  const { sources, loading: reviewsLoading } = useAppSelector((state) => state.reviews);
  const { brands, currentBrandId } = useAppSelector((state) => state.brand);
  const { isGenerating, currentQuote, selection, generatedCreatives } = useAppSelector((state) => state.creative);
  const { format, socialPlatform, cta } = selection;
  const brandColors = useAppSelector((state) => state.brand.config.colors) || { primary: '#6366f1', secondary: '#8b5cf6', text: '#1f2937', background: '#ffffff' };
  const brandLogos = useAppSelector((state) => state.brand.config.logos) || {};
  const brandTypography = useAppSelector((state) => state.brand.config.typography) || { fontFamily: 'Inter' };

  // Fetch data on mount to ensure testimonials are loaded when navigating directly
  // Use ref to prevent refetching on app switch
  const hasInitialized = useRef(false);
  useEffect(() => {
    if (!hasInitialized.current) {
      dispatch(fetchAllBrands());
      dispatch(fetchTestimonials());
      dispatch(fetchReviewSources());
      // Load most recent brand if no brand is selected
      dispatch(fetchBrand(null));
      hasInitialized.current = true;
    }
  }, [dispatch]);

  // Load current brand when currentBrandId changes
  useEffect(() => {
    if (currentBrandId) {
      dispatch(fetchBrand(currentBrandId));
    }
  }, [dispatch, currentBrandId]);

  // Combine testimonials and reviews (same logic as Library.tsx)
  const reviewsByBrand = brands.reduce((acc, brand) => {
    const brandSources = sources.filter(s => s.brandId === brand.id);
    const brandReviews = brandSources.flatMap(source => 
      source.reviews.map(r => ({ 
        ...r, 
        sourceId: source.id, 
        sourceType: source.type,
        brandId: brand.id,
        brandName: brand.name
      }))
    );
    if (brandReviews.length > 0) {
      acc[brand.id] = {
        brand,
        reviews: brandReviews.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        sources: brandSources
      };
    }
    return acc;
  }, {} as Record<string, { brand: any; reviews: any[]; sources: typeof sources }>);

  const unassignedReviews = sources
    .filter(s => !s.brandId)
    .flatMap(source => 
      source.reviews.map(r => ({ 
        ...r, 
        sourceId: source.id, 
        sourceType: source.type 
      }))
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Combine testimonials and reviews for unified view
  const allTestimonials: Array<Testimonial & { sourceType?: string; sourceId?: string; brandId?: string; brandName?: string }> = [
    ...testimonials.map(t => ({ ...t, sourceType: 'manual' })),
    ...Object.values(reviewsByBrand).flatMap(({ reviews }) => 
      reviews.map(r => ({
        id: r.id,
        customerName: r.author,
        companyTitle: 'Verified Customer',
        content: r.content,
        rating: r.rating,
        date: r.date,
        status: 'Live' as const,
        avatar: r.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(r.author)}&background=random`,
        source: r.source as 'Google' | 'Trustpilot',
        sourceType: r.sourceType,
        sourceId: r.sourceId,
        brandId: r.brandId,
        brandName: r.brandName
      }))
    ),
    ...unassignedReviews.map(r => ({
      id: r.id,
      customerName: r.author,
      companyTitle: 'Verified Customer',
      content: r.content,
      rating: r.rating,
      date: r.date,
      status: 'Live' as const,
      avatar: r.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(r.author)}&background=random`,
      source: r.source as 'Google' | 'Trustpilot',
      sourceType: r.sourceType,
      sourceId: r.sourceId
    }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Filter testimonials by selected brand
  // When a brand is selected, only show reviews from that brand
  // When no brand is selected, show all reviews and testimonials
  const filteredTestimonials = currentBrandId
    ? allTestimonials.filter(t => t.brandId === currentBrandId)
    : allTestimonials;

  const loading = testimonialsLoading || reviewsLoading;

  // Brand selection logic (used in both early return and main return)
  const currentBrand = brands.find(b => b.id === currentBrandId);

  const handleSelectBrand = async (brandId: string | null) => {
    if (brandId) {
      dispatch(setCurrentBrandId(brandId));
      await dispatch(fetchBrand(brandId));
    } else {
      dispatch(setCurrentBrandId(null));
      dispatch(fetchBrand(null));
    }
    setShowBrandSelector(false);
  };

  // Local State
  const [selectedTestimonialId, setSelectedTestimonialId] = useState<string>('');
  const [includeReviewerName, setIncludeReviewerName] = useState<boolean>(false);
  const [includeReviewerAvatar, setIncludeReviewerAvatar] = useState<boolean>(false);
  const [includeReviewerRating, setIncludeReviewerRating] = useState<boolean>(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [showBrandSelector, setShowBrandSelector] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editPrompt, setEditPrompt] = useState<string>('');
  const [editHistory, setEditHistory] = useState<Array<{ id: string; imageUrl: string; prompt: string; timestamp: string }>>([]);

  // Handle navigation state (when coming from Library "Create Creative" button)
  useEffect(() => {
    const reviewFromState = (location.state as any)?.review;
    if (reviewFromState && filteredTestimonials.length > 0) {
      const found = filteredTestimonials.find(t => t.id === reviewFromState.id);
      if (found) {
        setSelectedTestimonialId(found.id);
      }
    }
  }, [location.state, filteredTestimonials]);

  const selectedTestimonial = filteredTestimonials.find(t => t.id === selectedTestimonialId) || filteredTestimonials[0];

  // Reset selected testimonial when brand changes or filtered list changes
  useEffect(() => {
    // If current selection is not in filtered list, reset to first item
    if (selectedTestimonialId && !filteredTestimonials.find(t => t.id === selectedTestimonialId)) {
      if (filteredTestimonials.length > 0) {
        setSelectedTestimonialId(filteredTestimonials[0].id);
      } else {
        setSelectedTestimonialId('');
      }
    } else if (!selectedTestimonialId && filteredTestimonials.length > 0) {
      setSelectedTestimonialId(filteredTestimonials[0].id);
    }
  }, [filteredTestimonials, currentBrandId, selectedTestimonialId]);

  useEffect(() => {
    if (selectedTestimonial) {
      dispatch(setCurrentQuote(selectedTestimonial.content));
    }
  }, [selectedTestimonialId, dispatch, selectedTestimonial]);

  // Close dropdowns when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.testimonial-dropdown') && !target.closest('.brand-selector')) {
        setIsDropdownOpen(false);
        setShowBrandSelector(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsDropdownOpen(false);
        setShowBrandSelector(false);
      }
    };

    if (isDropdownOpen || showBrandSelector) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isDropdownOpen, showBrandSelector]);

  const handleGenerate = (additionalPrompt?: string) => {
    if (!selectedTestimonial) return;

    // Clear edit history if this is a new generation (not an edit)
    if (!additionalPrompt) {
      setEditHistory([]);
    }

    // Reset progress
    setLoadingProgress(0);

    // Simulate loading progress
    const progressInterval = setInterval(() => {
      setLoadingProgress((prev) => {
        if (prev >= 95) {
          clearInterval(progressInterval);
          return 95; // Stop at 95%, wait for actual completion
        }
        // Accelerate progress faster at the start, slower near the end
        const increment = prev < 50 ? 8 : prev < 80 ? 4 : 2;
        return Math.min(prev + increment, 95);
      });
    }, 300);

    // Parse testimonial content to avoid title/description repetition
    let testimonialContent = selectedTestimonial.content.trim();
    const doubleNewlineIndex = testimonialContent.indexOf('\n\n');
    
    if (doubleNewlineIndex > 0) {
      const title = testimonialContent.substring(0, doubleNewlineIndex).trim();
      const description = testimonialContent.substring(doubleNewlineIndex + 2).trim();
      
      // If title and description are the same, only use description
      if (title === description) {
        testimonialContent = description;
      } else {
        // Use both title and description if they're different
        testimonialContent = `${title}\n\n${description}`;
      }
    }

    // Append edit prompt if provided
    if (additionalPrompt) {
      testimonialContent = `${testimonialContent}\n\nAdditional Instructions: ${additionalPrompt}`;
    }

    // Get brand logo - use actual brand logo if available, otherwise fallback to Proveen logo
    const brandLogo = (brandLogos as any)?.primary || '/assets/proveen_logo.png';

    const generatePayload: { input: any; brandConfig?: any; brandId?: string | null } = {
      input: {
        testimonialContent: testimonialContent,
        format: format,
        socialPlatform: socialPlatform,
        maxLength: format === 'Story' ? 200 : 100,
        cta: cta,
        reviewerInfo: {
          name: selectedTestimonial.customerName,
          avatar: selectedTestimonial.avatar,
          rating: selectedTestimonial.rating,
          includeName: includeReviewerName,
          includeAvatar: includeReviewerAvatar,
          includeRating: includeReviewerRating
        },
        additionalPrompt: typeof additionalPrompt === 'string' ? additionalPrompt : undefined
      },
      brandConfig: {
        colors: brandColors,
        logos: { primary: brandLogo },
        typography: { fontFamily: brandTypography?.fontFamily || 'Inter' }
      }
    };
    
    // Use testimonial's brandId if available, otherwise use currentBrandId
    const testimonialBrandId = selectedTestimonial.brandId;
    if (testimonialBrandId) {
      generatePayload.brandId = testimonialBrandId;
    } else if (currentBrandId) {
      generatePayload.brandId = currentBrandId;
    }

    // If this is an edit, save current version to history before generating new one
    if (additionalPrompt && generatedCreatives.length > 0) {
      const currentVersion = {
        id: Date.now().toString() + '-prev',
        imageUrl: generatedCreatives[0].imageUrl,
        prompt: 'Original version',
        timestamp: new Date().toISOString()
      };
      setEditHistory(prev => {
        // Check if we already have the original to avoid duplicates
        const hasOriginal = prev.some(e => e.prompt === 'Original version');
        if (!hasOriginal) {
          return [currentVersion, ...prev].slice(0, 5);
        }
        return prev;
      });
    }

    dispatch(generateCreative(generatePayload))
      .then((result: any) => {
        clearInterval(progressInterval);
        setLoadingProgress(100);
        
        // If this is an edit, add new version to history
        if (additionalPrompt && result.payload?.response?.imageUrl) {
          const newEdit = {
            id: Date.now().toString(),
            imageUrl: result.payload.response.imageUrl,
            prompt: additionalPrompt,
            timestamp: new Date().toISOString()
          };
          setEditHistory(prev => {
            const updated = [newEdit, ...prev].slice(0, 5); // Keep only last 5
            return updated;
          });
        }
        
        // Reset progress after showing 100% briefly
        setTimeout(() => setLoadingProgress(0), 500);
      })
      .catch((error: any) => {
        // Clear interval on error
        clearInterval(progressInterval);
        setLoadingProgress(0);
        
        // Log error for debugging
        console.error('Error generating creative:', error);
        
        // Show user-friendly error message (could be enhanced with a toast notification)
        alert('Failed to generate creative. Please try again. If the problem persists, check your connection and API keys.');
      });
  };

  const handleDownload = async () => {
    if (generatedCreatives.length === 0) return;
    
    const imageUrl = generatedCreatives[0].imageUrl;
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `creative-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download image:', error);
      // Fallback: open in new tab
      window.open(imageUrl, '_blank');
    }
  };

  const handleEditClick = () => {
    setShowEditModal(true);
    setEditPrompt('');
  };

  const handleEditSubmit = () => {
    if (!editPrompt.trim()) return;
    handleGenerate(editPrompt.trim());
    setShowEditModal(false);
    setEditPrompt('');
  };

  if (loading) {
    return (
      <div className="flex flex-col lg:flex-row h-full gap-8">
        <div className="w-full lg:w-[420px] bg-white border border-gray-200 rounded-xl p-6 flex flex-col gap-8 shadow-sm h-fit">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="w-full h-12 rounded-xl" />
            <Skeleton className="w-full h-12 rounded-xl" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="w-full h-32 rounded-xl" />
          </div>
        </div>
        <div className="flex-1 bg-background-light border border-gray-200 rounded-2xl flex items-center justify-center min-h-[500px]">
          <Skeleton className="w-full h-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!selectedTestimonial && filteredTestimonials.length === 0) {
    return (
      <div className="flex flex-col lg:flex-row h-full gap-8">
        <div className="w-full lg:w-[420px] bg-white border border-gray-200 rounded-xl p-6 flex flex-col gap-8 shadow-sm h-fit">
          <div>
            <h2 className="text-2xl font-bold text-text-main mb-2">Creative Generator</h2>
            <p className="text-text-muted text-sm">Turn testimonials into engaging social content in seconds.</p>
          </div>

          {/* Brand Selector - Always visible even when no testimonials */}
          {brands.length > 0 && (
            <div className="flex flex-col gap-3">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Brand</label>
              <div className="relative brand-selector">
                <button
                  type="button"
                  onClick={() => setShowBrandSelector(!showBrandSelector)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border-2 border-gray-200 hover:border-primary/50 bg-white transition-all text-left"
                  style={{ borderColor: showBrandSelector ? (brandColors?.primary || '#6366f1') : undefined }}
                >
                  {currentBrand ? (
                    <>
                      {currentBrand.primary_logo && (
                        <img
                          src={currentBrand.primary_logo}
                          alt={currentBrand.name}
                          className="w-8 h-8 object-contain rounded"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-text-main truncate">{currentBrand.name}</div>
                        <div className="text-xs text-gray-500">Active brand</div>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1">
                      <div className="font-semibold text-sm text-text-main">No brand selected</div>
                      <div className="text-xs text-gray-500">Select a brand to use its colors and logo</div>
                    </div>
                  )}
                  <Icon name={showBrandSelector ? "expand_less" : "expand_more"} className="text-gray-400 flex-shrink-0" />
                </button>
                
                {showBrandSelector && (
                  <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
                    <div className="p-2">
                      <button
                        type="button"
                        onClick={() => handleSelectBrand(null)}
                        className={`w-full p-3 rounded-lg text-left transition-all mb-1 ${
                          !currentBrandId
                            ? 'bg-primary/10 border-2 border-primary'
                            : 'hover:bg-gray-50 border-2 border-transparent'
                        }`}
                      >
                        <div className="font-semibold text-sm text-text-main">No brand</div>
                        <div className="text-xs text-gray-500">Use default settings</div>
                      </button>
                      {brands.map((brand) => (
                        <button
                          key={brand.id}
                          type="button"
                          onClick={() => handleSelectBrand(brand.id)}
                          className={`w-full p-3 rounded-lg transition-all mb-1 ${
                            currentBrandId === brand.id
                              ? 'bg-primary/10 border-2 border-primary'
                              : 'hover:bg-gray-50 border-2 border-transparent'
                          }`}
                          style={{
                            borderColor: currentBrandId === brand.id ? (brandColors?.primary || '#6366f1') : undefined
                          }}
                        >
                          <div className="flex items-center gap-3">
                            {brand.primary_logo && (
                              <img
                                src={brand.primary_logo}
                                alt={brand.name}
                                className="w-8 h-8 object-contain rounded border border-gray-200"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-sm text-text-main truncate">{brand.name}</div>
                              <div className="flex gap-1.5 mt-1.5">
                                <div
                                  className="w-3 h-3 rounded-full border border-gray-200"
                                  style={{ backgroundColor: brand.primary_color }}
                                  title="Primary"
                                />
                                <div
                                  className="w-3 h-3 rounded-full border border-gray-200"
                                  style={{ backgroundColor: brand.secondary_color }}
                                  title="Secondary"
                                />
                                {brand.accent_color && (
                                  <div
                                    className="w-3 h-3 rounded-full border border-gray-200"
                                    style={{ backgroundColor: brand.accent_color }}
                                    title="Accent"
                                  />
                                )}
                              </div>
                            </div>
                            {currentBrandId === brand.id && (
                              <Icon name="check_circle" className="text-primary flex-shrink-0" size={20} style={{ color: brandColors?.primary || '#6366f1' }} />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="flex-1 bg-background-light border border-gray-200 rounded-2xl flex items-center justify-center min-h-[500px]">
          <div className="text-center max-w-md px-8 py-12">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full"></div>
              <div className="relative bg-gradient-to-br from-primary/20 to-primary/5 rounded-3xl p-8 inline-block">
                <Icon name="auto_awesome" size={64} className="text-primary" style={{ color: brandColors?.primary || '#6366f1' }} />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-3">
              {currentBrandId && currentBrand 
                ? `No Testimonials for ${currentBrand.name}` 
                : 'No Testimonials Yet'}
            </h3>
            <p className="text-gray-500 mb-6 leading-relaxed">
              {currentBrandId && currentBrand
                ? `This brand doesn't have any testimonials yet. Switch to another brand or add testimonials in the Library.`
                : 'Start creating amazing social media content by adding your first testimonial. Add them manually in the Library.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => navigate('/library')}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/30 hover:bg-primary-light transition-all"
                style={{ backgroundColor: brandColors?.primary || '#6366f1' }}
              >
                <Icon name="library_add" size={20} />
                Go to Library
              </button>
            </div>
            <div className="mt-8 pt-8 border-t border-gray-200">
              <p className="text-xs text-gray-400 mb-4">Quick tips:</p>
              <div className="flex flex-col gap-2 text-left">
                <div className="flex items-start gap-3 text-sm text-gray-600">
                  <Icon name="check_circle" size={20} className="text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Add testimonials manually in the Library</span>
                </div>
                <div className="flex items-start gap-3 text-sm text-gray-600">
                  <Icon name="check_circle" size={20} className="text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Generate beautiful social media creatives instantly</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-full gap-8">
      <div className="w-full lg:w-[420px] bg-white border border-gray-200 rounded-xl p-6 flex flex-col gap-8 shadow-sm h-fit">
        <div>
          <h2 className="text-2xl font-bold text-text-main mb-2">Creative Generator</h2>
          <p className="text-text-muted text-sm">Turn testimonials into engaging social content in seconds.</p>
        </div>

        {/* Brand Selector */}
        {brands.length > 0 && (
          <div className="flex flex-col gap-3">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Brand</label>
            <div className="relative brand-selector">
              <button
                type="button"
                onClick={() => setShowBrandSelector(!showBrandSelector)}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border-2 border-gray-200 hover:border-primary/50 bg-white transition-all text-left"
                style={{ borderColor: showBrandSelector ? brandColors.primary : undefined }}
              >
                {currentBrand ? (
                  <>
                    {currentBrand.primary_logo && (
                      <img
                        src={currentBrand.primary_logo}
                        alt={currentBrand.name}
                        className="w-8 h-8 object-contain rounded"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-text-main truncate">{currentBrand.name}</div>
                      <div className="text-xs text-gray-500">Active brand</div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1">
                    <div className="font-semibold text-sm text-text-main">No brand selected</div>
                    <div className="text-xs text-gray-500">Select a brand to use its colors and logo</div>
                  </div>
                )}
                <Icon name={showBrandSelector ? "expand_less" : "expand_more"} className="text-gray-400 flex-shrink-0" />
              </button>
              
              {showBrandSelector && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
                  <div className="p-2">
                    <button
                      type="button"
                      onClick={() => handleSelectBrand(null)}
                      className={`w-full p-3 rounded-lg text-left transition-all mb-1 ${
                        !currentBrandId
                          ? 'bg-primary/10 border-2 border-primary'
                          : 'hover:bg-gray-50 border-2 border-transparent'
                      }`}
                    >
                      <div className="font-semibold text-sm text-text-main">No brand</div>
                      <div className="text-xs text-gray-500">Use default settings</div>
                    </button>
                    {brands.map((brand) => (
                      <button
                        key={brand.id}
                        type="button"
                        onClick={() => handleSelectBrand(brand.id)}
                        className={`w-full p-3 rounded-lg transition-all mb-1 ${
                          currentBrandId === brand.id
                            ? 'bg-primary/10 border-2 border-primary'
                            : 'hover:bg-gray-50 border-2 border-transparent'
                        }`}
                        style={{
                          borderColor: currentBrandId === brand.id ? (brandColors?.primary || '#6366f1') : undefined
                        }}
                      >
                        <div className="flex items-center gap-3">
                          {brand.primary_logo && (
                            <img
                              src={brand.primary_logo}
                              alt={brand.name}
                              className="w-8 h-8 object-contain rounded border border-gray-200"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm text-text-main truncate">{brand.name}</div>
                            <div className="flex gap-1.5 mt-1.5">
                              <div
                                className="w-3 h-3 rounded-full border border-gray-200"
                                style={{ backgroundColor: brand.primary_color }}
                                title="Primary"
                              />
                              <div
                                className="w-3 h-3 rounded-full border border-gray-200"
                                style={{ backgroundColor: brand.secondary_color }}
                                title="Secondary"
                              />
                              {brand.accent_color && (
                                <div
                                  className="w-3 h-3 rounded-full border border-gray-200"
                                  style={{ backgroundColor: brand.accent_color }}
                                  title="Accent"
                                />
                              )}
                            </div>
                          </div>
                          {currentBrandId === brand.id && (
                            <Icon name="check_circle" className="text-primary flex-shrink-0" size={20} style={{ color: brandColors?.primary || '#6366f1' }} />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Source</label>
          <div className="flex flex-col gap-2">
            {loading ? (
              <Skeleton className="w-full h-12 rounded-xl" />
            ) : (
              <div className="relative testimonial-dropdown brand-selector">
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full pl-10 pr-10 h-auto min-h-[48px] bg-background-light border border-gray-200 rounded-xl text-text-main text-sm focus:ring-2 focus:ring-primary/20 cursor-pointer text-left flex items-center justify-between py-3"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Icon name="search" size={20} className="text-primary flex-shrink-0" />
                    <span className="truncate flex-1">
                      {selectedTestimonial ? (() => {
                        // Show review preview without customer name for privacy
                        const content = selectedTestimonial.content.trim();
                        const doubleNewlineIndex = content.indexOf('\n\n');
                        if (doubleNewlineIndex > 0) {
                          const title = content.substring(0, doubleNewlineIndex).trim();
                          return title.length < 60 ? title : title.substring(0, 57) + '...';
                        }
                        return content.length < 60 ? content : content.substring(0, 57) + '...';
                      })() : 'Select a testimonial...'}
                    </span>
                  </div>
                  <Icon name={isDropdownOpen ? "expand_less" : "expand_more"} size={20} className="text-gray-400 flex-shrink-0" />
                </button>
                {isDropdownOpen && (
                  <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-96 overflow-y-auto">
                      {filteredTestimonials.length === 0 ? (
                        <div className="p-4 text-sm text-gray-500 text-center">
                          {currentBrandId 
                            ? `No reviews available for this brand. ${allTestimonials.length > 0 ? 'Switch to a different brand or select "No brand" to see all reviews.' : 'Add reviews in the Library.'}`
                            : 'No testimonials available'}
                        </div>
                      ) : (
                        filteredTestimonials.map((t, index) => {
                          // Parse content to show title if available
                          const content = t.content.trim();
                          const doubleNewlineIndex = content.indexOf('\n\n');
                          let displayText = content;
                          let previewText = '';
                          
                          if (doubleNewlineIndex > 0) {
                            const title = content.substring(0, doubleNewlineIndex).trim();
                            const description = content.substring(doubleNewlineIndex + 2).trim();
                            if (title.length > 0 && title.length < 150 && description.length > 0) {
                              displayText = title;
                              previewText = description;
                            }
                          }
                          
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => {
                                setSelectedTestimonialId(t.id);
                                setIsDropdownOpen(false);
                              }}
                              className={`w-full text-left p-4 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                                selectedTestimonialId === t.id ? 'bg-primary/5' : ''
                              }`}
                            >
                              <div className="flex flex-col gap-1.5">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-semibold text-gray-500 uppercase">Review #{index + 1}</span>
                                  <div className="flex items-center gap-1">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                      <Icon key={i} name="star" size={14} fill={i < t.rating} className="text-yellow-400" />
                                    ))}
                                  </div>
                                </div>
                                <p className="text-sm font-semibold text-text-main leading-relaxed line-clamp-2">
                                  {displayText}
                                </p>
                                {previewText && (
                                  <p className="text-xs text-text-main/70 leading-relaxed line-clamp-2">
                                    {previewText}
                                  </p>
                                )}
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Social Platform Selection */}
        <div className="flex flex-col gap-3">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Platform</label>
          <div className="grid grid-cols-4 gap-2">
            {['Instagram', 'LinkedIn', 'Twitter', 'Facebook'].map((p) => (
              <button
                key={p}
                onClick={() => dispatch(setSocialPlatform(p as SocialPlatform))}
                className={`flex flex-col items-center justify-center gap-1 py-3 rounded-xl border transition-all ${socialPlatform === p ? 'bg-primary/5 border-primary text-primary' : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'}`}
              >
                {/* Simple SVG Icons */}
                {p === 'Instagram' && (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>
                )}
                {p === 'LinkedIn' && (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" /></svg>
                )}
                {p === 'Twitter' && (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" /></svg>
                )}
                {p === 'Facebook' && (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z" /></svg>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Format</label>
          <div className="bg-background-light p-1 rounded-xl flex gap-1">
            <button
              onClick={() => dispatch(setFormat('Post'))}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${format === 'Post' ? 'bg-white text-primary shadow-sm ring-1 ring-gray-200' : 'text-gray-500'}`}
            >
              <Icon name="crop_square" size={18} />
              Post (1:1)
            </button>
            <button
              onClick={() => dispatch(setFormat('Story'))}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${format === 'Story' ? 'bg-white text-primary shadow-sm ring-1 ring-gray-200' : 'text-gray-500'}`}
            >
              <Icon name="crop_portrait" size={18} />
              Story (9:16)
            </button>
          </div>
        </div>

        {/* Reviewer Information Options */}
        {selectedTestimonial && (
          <div className="flex flex-col gap-3 pt-4 border-t border-gray-100">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Reviewer Details</label>
            <p className="text-xs text-gray-500 -mt-2">Choose what to include in the generated image</p>
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeReviewerName}
                  onChange={(e) => setIncludeReviewerName(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <div className="flex items-center gap-2 flex-1">
                  <Icon name="person" size={18} className="text-gray-400" />
                  <span className="text-sm text-text-main">Include Reviewer Name</span>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeReviewerAvatar}
                  onChange={(e) => setIncludeReviewerAvatar(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <div className="flex items-center gap-2 flex-1">
                  <Icon name="account_circle" size={18} className="text-gray-400" />
                  <span className="text-sm text-text-main">Include Reviewer Avatar</span>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeReviewerRating}
                  onChange={(e) => setIncludeReviewerRating(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <div className="flex items-center gap-2 flex-1">
                  <Icon name="star" size={18} className="text-gray-400" />
                  <span className="text-sm text-text-main">Include Rating Stars</span>
                </div>
              </label>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 pt-4 border-t border-gray-100">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Call to Action</label>
          <input
            value={cta}
            onChange={(e) => dispatch(setCta(e.target.value))}
            className="w-full h-11 px-4 bg-background-light border border-gray-200 rounded-lg text-sm focus:ring-primary focus:border-primary"
            placeholder="e.g. Link in bio"
          />
        </div>

        <button
          onClick={() => handleGenerate()}
          disabled={isGenerating}
          className="relative overflow-hidden flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-primary text-white font-bold shadow-lg shadow-primary/30 hover:bg-primary-light transition-all disabled:opacity-50"
          style={{ backgroundColor: brandColors?.primary || '#6366f1' }}
        >
          <Icon name="bolt" size={20} className="animate-pulse" />
          {isGenerating ? 'Generating...' : 'Generate with AI'}
        </button>
      </div>

      <div className="flex-1 bg-background-light border border-gray-200 rounded-2xl flex flex-col min-h-[500px]">
        <div className="h-14 px-6 border-b border-gray-200 flex items-center justify-between bg-white/50 backdrop-blur-sm rounded-t-2xl">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
            <span className={`size-2 rounded-full ${isGenerating ? 'bg-amber-500 animate-pulse' : 'bg-green-500'}`} ></span>
            {isGenerating ? 'Wiro AI Processing...' : 'Creative Result'}
          </span>
          {/* Display current selection details in header */}
          {!isGenerating && generatedCreatives.length > 0 && (
            <div className="flex items-center gap-3 text-xs font-medium text-gray-400">
              <span className="flex items-center gap-1"><Icon name="public" size={14} /> {generatedCreatives[0].socialPlatform}</span>
              <span className="flex items-center gap-1"><Icon name="aspect_ratio" size={14} /> {generatedCreatives[0].format}</span>
            </div>
          )}
        </div>
        <div className="flex-1 flex items-center justify-center p-8 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px] relative overflow-hidden">

          {/* State: Initial / Idle */}
          {!isGenerating && !currentQuote && generatedCreatives.length === 0 && (
            <div className="text-center text-gray-400 max-w-sm">
              <Icon name="smart_toy" size={64} className="mb-4 text-gray-300" />
              <h3 className="text-lg font-bold text-gray-500 mb-2">Ready to Create</h3>
              <p className="text-sm">Select a source testimonial and click Generate to let Wiro AI craft your design.</p>
            </div>
          )}

          {/* State: Generating */}
          {isGenerating && (
            <div className="flex flex-col items-center gap-6 z-10 max-w-md w-full px-8">
              <div className="size-16 border-4 border-primary border-t-transparent rounded-full animate-spin" style={{ borderColor: `${brandColors?.primary || '#6366f1'} transparent transparent transparent` }}></div>
              <div className="w-full">
                <p className="text-primary font-bold text-center mb-3" style={{ color: brandColors?.primary || '#6366f1' }}>Designing your creative...</p>
                <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-300 ease-out"
                    style={{ 
                      width: `${loadingProgress}%`,
                      backgroundColor: brandColors?.primary || '#6366f1'
                    }}
                  ></div>
                </div>
                <p className="text-sm text-gray-500 text-center mt-2">{loadingProgress}%</p>
              </div>
            </div>
          )}

          {/* State: Success (Show latest generated creative) */}
          {!isGenerating && generatedCreatives.length > 0 && (
            <div className="flex flex-col gap-4">
              {/* Main generated creative */}
              <div className="group relative shadow-2xl rounded-xl overflow-hidden transition-all duration-500 animate-in fade-in zoom-in-95">
                <img
                  src={generatedCreatives[0].imageUrl}
                  alt="Generated Creative"
                  className={`object-contain bg-black ${generatedCreatives[0].format === 'Post' ? 'max-h-[500px] w-auto' : 'max-h-[600px] w-auto'}`}
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 backdrop-blur-sm">
                  <button 
                    onClick={handleDownload}
                    className="bg-white text-black px-6 py-2.5 rounded-full font-bold shadow-xl hover:scale-105 transition-transform flex items-center gap-2"
                  >
                    <Icon name="download" />
                    Download
                  </button>
                  <button 
                    onClick={handleEditClick}
                    className="bg-black/50 text-white border border-white/20 px-6 py-2.5 rounded-full font-bold hover:bg-black/70 transition-all flex items-center gap-2"
                  >
                    <Icon name="edit" />
                    Edit
                  </button>
                </div>
              </div>

              {/* Edit history (previous versions) */}
              {editHistory.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wider">
                    Previous Versions ({editHistory.length})
                  </h3>
                  <div className="grid grid-cols-5 gap-3">
                    {editHistory.map((edit, index) => (
                      <div 
                        key={edit.id} 
                        className="group relative rounded-lg overflow-hidden border border-gray-200 bg-black cursor-pointer hover:border-primary transition-colors"
                        onClick={() => {
                          // Clicking a previous version could restore it (optional feature)
                          // For now, just visual feedback
                        }}
                      >
                        <img
                          src={edit.imageUrl}
                          alt={`Version ${editHistory.length - index}: ${typeof edit.prompt === 'string' ? edit.prompt.substring(0, 20) : 'Edit'}...`}
                          className="w-full aspect-square object-contain"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <p className="truncate font-semibold">{typeof edit.prompt === 'string' ? edit.prompt : String(edit.prompt || 'Edit')}</p>
                          {index === 0 && <p className="text-xs text-gray-300 mt-1">Latest</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowEditModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-text-main">Edit Creative</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <Icon name="close" size={24} />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Describe what you'd like to add or change in the design. The AI will generate a new version based on your instructions.
            </p>
            <textarea
              value={editPrompt}
              onChange={(e) => setEditPrompt(e.target.value)}
              placeholder="e.g., Add more vibrant colors, change the background to blue, make the text larger..."
              className="w-full h-32 px-4 py-3 rounded-lg border border-gray-200 bg-background-light text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSubmit}
                disabled={!editPrompt.trim()}
                className="flex-1 px-4 py-2.5 rounded-lg bg-primary text-white font-semibold shadow-lg shadow-primary/30 hover:bg-primary-light transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: brandColors?.primary || '#6366f1' }}
              >
                Generate Edit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Generator;
