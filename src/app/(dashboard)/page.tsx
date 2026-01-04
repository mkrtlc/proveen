'use client';

import React, { useEffect, useState } from 'react';
import { RECENT_ACTIVITIES } from '@/constants';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getTimeBasedGreeting } from '@/lib/utils';
import NameModal from '@/components/NameModal';
import { StatCardSkeleton, CardGridSkeleton, ActivityItemSkeleton, GettingStartedSkeleton, TextLineSkeleton } from '@/components/Skeleton';
import { Icon } from '@/components/Icon';
import { useCreatives } from '@/context/CreativeContext';
import { useTestimonials } from '@/context/TestimonialContext';
import { useReviews } from '@/context/ReviewContext';
import { useBrand } from '@/context/BrandContext';

const StatCard: React.FC<{ label: string; value: string; trend: string; icon: string; colorClass?: string }> = ({ label, value, trend, icon, colorClass = "text-primary" }) => (
  <div className="bg-white rounded-xl p-5 border border-gray-200/60 shadow-sm relative overflow-hidden group">
    <div className={`absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity ${colorClass}`}>
      <Icon name={icon} size={64} />
    </div>
    <p className="text-sm font-medium text-gray-500 mb-1">{label}</p>
    <div className="flex items-baseline gap-2">
      <h3 className="text-2xl font-bold text-text-main">{value}</h3>
      <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${trend.startsWith('+') ? 'text-black bg-gray-100' :
        trend === 'Action needed' ? 'text-amber-700 bg-amber-50' : 'text-gray-500 bg-gray-50'
        }`}>
        {trend}
      </span>
    </div>
  </div>
);

const Dashboard: React.FC = () => {
  const { generatedCreatives, loading: creativesLoading } = useCreatives();
  const { items: testimonials, loading: testimonialsLoading } = useTestimonials();
  const { sources: reviewSources, loading: reviewsLoading } = useReviews();
  const { config: brandConfig, loading: brandLoading } = useBrand();

  const router = useRouter();
  const [userName, setUserName] = useState<string>('');
  const [greeting, setGreeting] = useState<string>('Good morning');
  const [showNameModal, setShowNameModal] = useState(false);
  const [isUserLoading, setIsUserLoading] = useState(true);

  const isLoading = creativesLoading || testimonialsLoading || reviewsLoading || brandLoading;


  // Check completion status for Getting Started steps
  // Brand kit is considered customized if logo exists or colors differ from defaults
  const defaultPrimaryColor = '#000000';
  const hasBrandKit = brandConfig?.logos?.primary ||
    (brandConfig?.colors?.primary && brandConfig.colors.primary !== defaultPrimaryColor);
  const hasReviewSources = reviewSources.length > 0;
  const hasTestimonials = testimonials.length > 0;
  const hasCreatives = generatedCreatives.length > 0;

  // Calculate real stats
  const totalCreatives = generatedCreatives.length;
  // Mock 'Posts Published' for now as we don't track publishing yet
  const postsPublished = 0;

  const avgSentiment = generatedCreatives.length > 0
    ? (generatedCreatives.reduce((acc, curr) => acc + curr.sentiment, 0) / generatedCreatives.length * 5).toFixed(1)
    : "0.0";

  // Fetch user name and set greeting
  useEffect(() => {
    const fetchUserName = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Get name from user metadata
          const name = user.user_metadata?.name || '';
          if (name) {
            setUserName(name);
          } else {
            // Show modal if name is missing
            setShowNameModal(true);
          }
        }
      } catch (error) {
        console.error('Error fetching user name:', error);
      } finally {
        setIsUserLoading(false);
      }
    };

    fetchUserName();
    setGreeting(getTimeBasedGreeting());
  }, []);

  return (
    <>
      <NameModal
        isOpen={showNameModal}
        onClose={() => {
          setShowNameModal(false);
          // Refresh user name after modal closes
          supabase.auth.getUser().then(({ data: { user } }) => {
            if (user?.user_metadata?.name) {
              setUserName(user.user_metadata.name);
            }
          });
        }}
      />
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-text-main mb-2">
              {isUserLoading ? (
                <TextLineSkeleton width="300px" height="36px" />
              ) : (
                <>{greeting}{userName ? `, ${userName}` : ''}</>
              )}
            </h1>
            <div className="flex items-center gap-2 text-text-muted">

              <p className="text-sm font-medium">AI suggests turning your latest review from Sarah into an Instagram Story.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/generator')}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-text-main font-semibold rounded-lg text-sm shadow-sm hover:bg-gray-50 transition-all"
            >
              <Icon name="add_photo_alternate" size={20} />
              Create Creative
            </button>
            <button className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white font-semibold rounded-lg text-sm shadow-md hover:bg-primary-light transition-all">
              <Icon name="upload_file" size={20} />
              Upload Testimonial
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading ? (
            <>
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </>
          ) : (
            <>
              <StatCard label="Total Creatives" value={totalCreatives.toString()} trend={totalCreatives > 0 ? "+12%" : "0%"} icon="perm_media" />
              <StatCard label="Posts Published" value={postsPublished.toString()} trend="+0%" icon="send" />
              <StatCard label="Avg. Sentiment" value={`${avgSentiment}/5`} trend="+0.1" icon="favorite" />
              <StatCard label="Pending Approval" value="3" trend="Action needed" icon="pending" colorClass="text-gray-500" />
            </>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-text-main">Recent Creatives</h2>
              <button
                onClick={() => router.push('/library?tab=creatives')}
                className="text-sm font-medium text-primary hover:text-primary-light flex items-center gap-1"
              >
                View All <Icon name="arrow_forward" size={16} />
              </button>
            </div>

            {isLoading ? (
              <CardGridSkeleton count={3} />
            ) : generatedCreatives.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                <p className="text-gray-500 mb-4">No creatives generated yet.</p>
                <button
                  onClick={() => router.push('/generator')}
                  className="text-primary font-bold hover:underline"
                >
                  Go to Generator
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {generatedCreatives.slice(0, 3).map((creative) => (
                  <div key={creative.id} className="group relative bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all cursor-pointer">
                    <div className="aspect-[4/5] w-full bg-gray-100 relative">
                      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${creative.imageUrl}')` }}></div>
                      <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm rounded-full p-1.5">
                        <Icon name={creative.format === 'Post' ? 'photo_camera' : 'public'} size={16} className="text-white" />
                      </div>
                      <div className="absolute inset-0 bg-primary/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                        <button className="bg-white text-primary px-4 py-2 rounded-lg font-bold text-sm shadow-lg">Download</button>
                        <button className="text-white text-sm font-medium hover:underline">Edit Design</button>
                      </div>
                    </div>
                    <div className="p-3">
                      <h3 className="font-semibold text-sm text-text-main truncate">{creative.title}</h3>
                      <p className="text-xs text-gray-500 mt-1">Generated {creative.timestamp} • {creative.socialPlatform}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            {isLoading ? (
              <GettingStartedSkeleton />
            ) : (
              <div className="bg-gradient-to-br from-primary to-primary-light rounded-xl p-5 text-white shadow-md">
                <h3 className="font-bold text-lg mb-2">Getting Started</h3>
                <div className="space-y-3">
                  {/* Step 1: Connect Account - Always completed */}
                  <div className="flex items-center gap-3">
                    <div className="bg-white text-primary rounded-full p-1">
                      <Icon name="check" size={16} />
                    </div>
                    <span className="text-sm font-medium line-through opacity-70">Connect Account</span>
                  </div>

                  {/* Step 2: Customize Brand Kit */}
                  <button
                    onClick={() => router.push('/settings')}
                    className={`flex items-center gap-3 w-full text-left ${hasBrandKit ? 'opacity-70' : 'hover:opacity-90'}`}
                  >
                    <div className={`${hasBrandKit ? 'bg-white text-primary' : 'bg-white/20 text-white border border-white/40'} rounded-full p-1`}>
                      <Icon name={hasBrandKit ? "check" : "palette"} size={16} />
                    </div>
                    <span className={`text-sm font-medium ${hasBrandKit ? 'line-through' : ''}`}>
                      Customize Brand Kit
                    </span>
                  </button>

                  {/* Step 3: Get Reviews from Trustpilot/Google */}
                  <button
                    onClick={() => router.push('/library')}
                    className={`flex items-center gap-3 w-full text-left ${hasReviewSources ? 'opacity-70' : 'hover:opacity-90'}`}
                  >
                    <div className={`${hasReviewSources ? 'bg-white text-primary' : 'bg-white/20 text-white border border-white/40'} rounded-full p-1`}>
                      <Icon name={hasReviewSources ? "check" : "link"} size={16} />
                    </div>
                    <span className={`text-sm font-medium ${hasReviewSources ? 'line-through' : ''}`}>
                      Get Reviews from Trustpilot
                    </span>
                  </button>

                  {/* Step 4: Create First Social Proof */}
                  <button
                    onClick={() => router.push('/library')}
                    className={`flex items-center gap-3 w-full text-left ${hasTestimonials ? 'opacity-70' : 'hover:opacity-90'}`}
                  >
                    <div className={`${hasTestimonials ? 'bg-white text-primary' : 'bg-white/20 text-white border border-white/40'} rounded-full p-1`}>
                      <Icon name={hasTestimonials ? "check" : "rate_review"} size={16} />
                    </div>
                    <span className={`text-sm font-medium ${hasTestimonials ? 'line-through' : ''}`}>
                      Create your first social proof
                    </span>
                  </button>

                  {/* Step 5: Generate First Creative */}
                  <button
                    onClick={() => router.push('/generator')}
                    className={`flex items-center gap-3 w-full text-left ${hasCreatives ? 'opacity-70' : 'hover:opacity-90'}`}
                  >
                    {hasCreatives ? (
                      <div className="bg-white text-primary rounded-full p-1">
                        <Icon name="check" size={16} />
                      </div>
                    ) : (
                      <div className="size-6 rounded-full border border-white/40 flex items-center justify-center text-xs font-bold">5</div>
                    )}
                    <span className={`text-sm font-medium ${hasCreatives ? 'line-through' : 'opacity-80'}`}>
                      Generate your first creative
                    </span>
                  </button>
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-base text-text-main">Activity</h3>
                <button className="text-xs text-primary font-semibold hover:underline">View All</button>
              </div>
              <div className="relative pl-2 space-y-6 before:absolute before:left-[19px] before:top-2 before:bottom-4 before:w-px before:bg-gray-200">
                {isLoading ? (
                  <>
                    <ActivityItemSkeleton />
                    <ActivityItemSkeleton />
                    <ActivityItemSkeleton />
                  </>
                ) : (
                  RECENT_ACTIVITIES.map((activity) => (
                    <div key={activity.id} className="relative flex gap-3">
                      <div className={`size-8 rounded-full flex items-center justify-center shrink-0 z-10 ring-4 ring-white ${activity.type === 'testimonial' ? 'bg-gray-100 text-black' :
                        activity.type === 'ai' ? 'bg-black text-white' : 'bg-gray-100 text-black'
                        }`}>
                        <Icon name={activity.type === 'testimonial' ? 'mail' : activity.type === 'ai' ? 'smart_toy' : 'check_circle'} size={16} />
                      </div>
                      <div>
                        <p className="text-sm text-text-main">{activity.message}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{activity.time}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
