'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Testimonial } from '@/types';
import { useTestimonials } from '@/context/TestimonialContext';
import { useReviews } from '@/context/ReviewContext';
import { useCreatives } from '@/context/CreativeContext';
import { useBrand } from '@/context/BrandContext';
import { TableRowSkeleton, CardGridSkeleton } from '@/components/Skeleton';
import { Icon } from '@/components/Icon';
import GoogleReviewsModal from '@/components/GoogleReviewsModal';
import TrustpilotSourceModal from '@/components/TrustpilotSourceModal';
import ManualEntryModal from '@/components/ManualEntryModal';
import EditTestimonialModal from '@/components/EditTestimonialModal';

const Library: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Testimonials state
  const { items: testimonials, loading: testimonialsLoading, fetchTestimonials } = useTestimonials();

  // Reviews state
  const { sources, loading: reviewsLoading, fetchReviewSources, removeSource, toggleAutoRefresh } = useReviews();

  // Creatives state
  const { generatedCreatives, loading: creativesLoading, fetchCreatives } = useCreatives();

  // Brand state (single brand)
  const { config: brandConfig, currentBrandId } = useBrand();

  // Modal states
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [isTrustpilotModalOpen, setIsTrustpilotModalOpen] = useState(false);
  const [editingTestimonial, setEditingTestimonial] = useState<(Testimonial & { brandId?: string; brandName?: string }) | null>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState<'testimonials' | 'creatives'>('testimonials');

  // Sync tab with URL
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'creatives') {
      setActiveTab('creatives');
    } else {
      setActiveTab('testimonials');
    }
  }, [searchParams]);

  // Load data on mount
  useEffect(() => {
    fetchReviewSources();
    fetchCreatives();
  }, [fetchReviewSources, fetchCreatives]);

  // Get all reviews from sources for the current brand
  const allReviews = sources.flatMap(source =>
    source.reviews.map(r => ({
      ...r,
      sourceId: source.id,
      sourceType: source.type,
      brandId: currentBrandId || undefined,
      brandName: brandConfig.name
    }))
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Combine testimonials and reviews for unified view
  const allItems: Array<Testimonial & { sourceType?: string; sourceId?: string; brandId?: string; brandName?: string }> = [
    ...testimonials.map(t => ({
      ...t,
      sourceType: 'manual',
      brandId: currentBrandId || undefined,
      brandName: brandConfig.name
    })),
    ...allReviews.map(r => ({
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
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const loading = testimonialsLoading || reviewsLoading;

  const handleTabChange = (tab: 'testimonials' | 'creatives') => {
    setActiveTab(tab);
    router.push(`/library?tab=${tab}`);
  };

  return (
    <div className="flex flex-col gap-8 pb-10">
      {/* Header Section */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-text-main tracking-tight mb-2">Library</h1>
            <p className="text-text-muted">Manage your assets and generated content.</p>
          </div>

          <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-xl self-start sm:self-center">
            <button
              onClick={() => handleTabChange('testimonials')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'testimonials'
                ? 'bg-white text-text-main shadow-sm'
                : 'text-text-muted hover:text-text-main'
                }`}
            >
              Testimonials
            </button>
            <button
              onClick={() => handleTabChange('creatives')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'creatives'
                ? 'bg-white text-text-main shadow-sm'
                : 'text-text-muted hover:text-text-main'
                }`}
            >
              Creatives
            </button>
          </div>

          {activeTab === 'testimonials' && (
            <div className="flex items-center gap-3">
              <div className="text-sm font-medium text-text-muted hidden md:block">
                <span className="text-text-main font-bold">{allItems.length}</span> Total
              </div>
              <div className="h-6 w-px bg-gray-200 hidden md:block"></div>
              <button
                onClick={() => setIsManualModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-light transition-colors text-sm font-semibold shadow-sm"
              >
                <Icon name="add" size={18} />
                <span className="hidden sm:inline">Add Manual</span>
              </button>
              <button
                onClick={() => setIsGoogleModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-sm font-semibold shadow-sm"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26.81-.58z" fill="#FBBC05" />
                  <path d="M12 4.6c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.09 14.97 0 12 0 7.7 0 3.99 2.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                <span className="hidden sm:inline">Google</span>
              </button>
              <button
                onClick={() => setIsTrustpilotModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-sm font-semibold shadow-sm"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M24 9.4H15.2L12 0L8.8 9.4H0L7.2 14.9L4.4 24L12 18.2L19.6 24L16.8 14.9L24 9.4Z" fill="#00B67A" />
                </svg>
                <span className="hidden sm:inline">Trustpilot</span>
              </button>
            </div>
          )}
          {activeTab === 'creatives' && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/generator')}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-light transition-colors text-sm font-semibold shadow-sm"
              >
                <Icon name="add_photo_alternate" size={18} />
                Create New
              </button>
            </div>
          )}
        </div>
      </div>

      {activeTab === 'testimonials' ? (
        <>
          {/* Review Sources Section */}
          {sources.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-text-main">Connected Sources</h3>
                  <p className="text-sm text-text-muted">Manage your review sources</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsGoogleModalOpen(true)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-xs font-semibold"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26.81-.58z" fill="#FBBC05" />
                      <path d="M12 4.6c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.09 14.97 0 12 0 7.7 0 3.99 2.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Add Google
                  </button>
                  <button
                    onClick={() => setIsTrustpilotModalOpen(true)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-xs font-semibold"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M24 9.4H15.2L12 0L8.8 9.4H0L7.2 14.9L4.4 24L12 18.2L19.6 24L16.8 14.9L24 9.4Z" fill="#00B67A" />
                    </svg>
                    Add Trustpilot
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sources.map(source => (
                    <div key={source.id} className="bg-white p-4 rounded-xl border border-gray-100 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {source.type === 'google' ? (
                            <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26.81-.58z" fill="#FBBC05" />
                              <path d="M12 4.6c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.09 14.97 0 12 0 7.7 0 3.99 2.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                          ) : (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M24 9.4H15.2L12 0L8.8 9.4H0L7.2 14.9L4.4 24L12 18.2L19.6 24L16.8 14.9L24 9.4Z" fill="#00B67A" />
                            </svg>
                          )}
                          <span className="font-semibold text-sm capitalize">{source.type} Reviews</span>
                        </div>
                        <button
                          onClick={() => removeSource(source.id)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <Icon name="delete" size={18} />
                        </button>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Reviews</span>
                        <span className="font-semibold">{source.reviews.length}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Last Updated</span>
                        <span className="text-gray-900">{new Date(source.lastUpdated).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-200">
                        <span className="text-gray-500">Auto-refresh</span>
                        <button
                          onClick={() => toggleAutoRefresh(source.id)}
                          className={`w-9 h-4.5 rounded-full relative transition-colors ${source.autoRefresh ? 'bg-green-500' : 'bg-gray-300'}`}
                        >
                          <span className={`absolute top-0.5 left-0.5 bg-white w-3.5 h-3.5 rounded-full transition-transform ${source.autoRefresh ? 'translate-x-4.5' : ''}`}></span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}



          {/* All Testimonials Table */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-text-main">All Testimonials</h2>
              <p className="text-sm text-text-muted mt-1">View and manage all your customer feedback in one place</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-background-light border-b border-gray-100">
                    <th className="py-3 px-6 text-xs font-semibold text-text-muted uppercase tracking-wider">Customer</th>
                    <th className="py-3 px-6 text-xs font-semibold text-text-muted uppercase tracking-wider">Testimonial</th>
                    <th className="py-3 px-6 text-xs font-semibold text-text-muted uppercase tracking-wider">Rating</th>
                    <th className="py-3 px-6 text-xs font-semibold text-text-muted uppercase tracking-wider">Source</th>
                    <th className="py-3 px-6 text-xs font-semibold text-text-muted uppercase tracking-wider">Brand</th>
                    <th className="py-3 px-6 text-xs font-semibold text-text-muted uppercase tracking-wider">Date</th>
                    <th className="py-3 px-6 text-xs font-semibold text-text-muted uppercase tracking-wider">Status</th>
                    <th className="py-3 px-6 text-xs font-semibold text-text-muted uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <>
                      <TableRowSkeleton cols={8} />
                      <TableRowSkeleton cols={8} />
                      <TableRowSkeleton cols={8} />
                      <TableRowSkeleton cols={8} />
                      <TableRowSkeleton cols={8} />
                    </>
                  ) : allItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center">
                        <Icon name="rate_review" size={48} className="text-gray-300 mb-2 mx-auto" />
                        <p className="text-gray-500 font-medium">No testimonials yet</p>
                        <p className="text-gray-400 text-sm mt-1 mb-4">Add manual entries or connect review sources to get started</p>
                        <div className="flex items-center justify-center gap-3">
                          <button
                            onClick={() => setIsManualModalOpen(true)}
                            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-light transition-colors"
                          >
                            Add Manual Testimonial
                          </button>
                          <button
                            onClick={() => setIsGoogleModalOpen(true)}
                            className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                          >
                            Import from Google
                          </button>
                          <button
                            onClick={() => setIsTrustpilotModalOpen(true)}
                            className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                          >
                            Import from Trustpilot
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    allItems.map((t) => (
                      <tr key={t.id} className="hover:bg-background-light/50 transition-colors group">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="size-10 rounded-full bg-cover bg-center shrink-0 border border-gray-200" style={{ backgroundImage: `url('${t.avatar}')` }}></div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-sm font-semibold text-text-main truncate">{t.customerName}</span>
                              <span className="text-xs text-text-muted truncate">{t.companyTitle}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          {(() => {
                            // Parse content to separate title and description if they exist
                            // Trustpilot reviews combine title and description with \n\n separator
                            const content = t.content.trim();
                            const doubleNewlineIndex = content.indexOf('\n\n');

                            // Check if there's a clear title/description split
                            if (doubleNewlineIndex > 0) {
                              const title = content.substring(0, doubleNewlineIndex).trim();
                              const description = content.substring(doubleNewlineIndex + 2).trim();

                              // Title should be reasonably short (typically titles are < 150 chars)
                              // and description should exist
                              if (title.length > 0 && title.length < 150 && description.length > 0) {
                                return (
                                  <div className="flex flex-col gap-1.5">
                                    <p className="text-sm font-semibold text-text-main leading-relaxed">{title}</p>
                                    <p className="text-sm text-text-main/80 leading-relaxed whitespace-pre-wrap">{description}</p>
                                  </div>
                                );
                              }
                            }

                            // No clear title/description split, just show content as-is
                            return <p className="text-sm text-text-main leading-relaxed whitespace-pre-wrap">{content}</p>;
                          })()}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex text-black">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Icon key={i} name="star" size={18} fill={i < t.rating} />
                            ))}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex flex-col gap-1">
                            <span className="text-sm text-text-muted capitalize">{t.sourceType === 'manual' ? 'Manual' : t.source || 'Unknown'}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          {t.brandName ? (
                            <div className="flex items-center gap-2">
                              {/* Removed undefined brands usage to fix error */}
                              <span className="text-sm text-text-main font-medium">{t.brandName}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-sm text-text-muted">
                            {new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${t.status === 'Live' ? 'bg-gray-100 text-black border-gray-300' :
                            t.status === 'Processing' ? 'bg-black text-white border-black' :
                              'bg-gray-100 text-gray-600 border-gray-200'
                            }`}>
                            {t.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                // router push with state is not fully supported in App Router like useNavigate state
                                router.push(`/generator?reviewId=${t.id}`);
                              }}
                              className="p-1.5 text-text-muted hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                              title="Create Creative"
                            >
                              <Icon name="auto_awesome" size={20} />
                            </button>
                            <button
                              onClick={() => setEditingTestimonial(t)}
                              className="p-1.5 text-text-muted hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                              title="Edit Testimonial"
                            >
                              <Icon name="edit" size={20} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Creatives Tab */
        <div className="flex flex-col gap-6">
          {creativesLoading ? (
            <CardGridSkeleton count={6} />
          ) : generatedCreatives.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
              <Icon name="photo_library" size={48} className="text-gray-300 mb-2 mx-auto" />
              <p className="text-gray-500 font-medium text-lg">No creatives generated yet.</p>
              <p className="text-gray-400 text-sm mt-1 mb-6">Create your first social media post from your testimonials.</p>
              <button
                onClick={() => router.push('/generator')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary-light transition-colors font-semibold shadow-md"
              >
                <Icon name="add_photo_alternate" size={20} />
                Go to Generator
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {generatedCreatives.map((creative) => (
                <div key={creative.id} className="group relative bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all cursor-pointer">
                  <div className="aspect-[4/5] w-full bg-gray-100 relative">
                    <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${creative.imageUrl}')` }}></div>
                    <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm rounded-full p-1.5">
                      <Icon name={creative.format === 'Post' ? 'photo_camera' : 'public'} size={16} className="text-white" />
                    </div>
                    <div className="absolute inset-0 bg-primary/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                      <button
                        onClick={() => window.open(creative.imageUrl, '_blank')}
                        className="bg-white text-primary px-4 py-2 rounded-lg font-bold text-sm shadow-lg hover:bg-gray-50 transition-colors"
                      >
                        Download
                      </button>
                      <button className="text-white text-sm font-medium hover:underline">Edit Design</button>
                    </div>
                  </div>
                  <div className="p-4 border-t border-gray-100">
                    <h3 className="font-semibold text-sm text-text-main truncate" title={creative.title}>{creative.title}</h3>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-500">{creative.socialPlatform}</span>
                      <span className="text-xs text-gray-400">{creative.timestamp.includes('T') ? new Date(creative.timestamp).toLocaleDateString() : creative.timestamp}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-1">
                      <span className="text-xs text-text-muted">Sentiment:</span>
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${creative.sentiment}%` }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <ManualEntryModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
      />
      <GoogleReviewsModal
        isOpen={isGoogleModalOpen}
        onClose={() => setIsGoogleModalOpen(false)}
      />
      <TrustpilotSourceModal
        isOpen={isTrustpilotModalOpen}
        onClose={() => setIsTrustpilotModalOpen(false)}
      />
      {editingTestimonial && (
        <EditTestimonialModal
          isOpen={!!editingTestimonial}
          onClose={() => {
            setEditingTestimonial(null);
            fetchTestimonials();
          }}
          testimonial={editingTestimonial}
        />
      )}
    </div>
  );
};

export default Library;
