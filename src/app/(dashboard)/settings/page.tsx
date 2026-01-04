'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useBrand } from '@/context/BrandContext';
import { extractBrandFromUrl } from '@/lib/brandExtractor';
import { Icon } from '@/components/Icon';
import { INITIAL_BRAND_KIT } from '@/constants';

const BrandSettings: React.FC = () => {
  const { config, currentBrandId, fetchBrand, saveBrand, updateBrandConfig } = useBrand();

  const [websiteUrl, setWebsiteUrl] = useState('');
  const [isFetchingBrand, setIsFetchingBrand] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Load brand on mount
  useEffect(() => {
    fetchBrand(null);
  }, [fetchBrand]);

  // Auto-save with debounce
  const saveTimeoutRef = React.useRef<NodeJS.Timeout | undefined>(undefined);
  const autoSave = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        await saveBrand(config, currentBrandId);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (error: any) {
        console.error("Failed to save brand", error);
        setSaveStatus('idle');
      }
    }, 1000);
  }, [config, currentBrandId, saveBrand]);

  // Auto-save when config changes
  useEffect(() => {
    if (config.name || config.colors.primary !== INITIAL_BRAND_KIT.primaryColor) {
      autoSave();
    }
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [config, autoSave]);

  const brandKit = {
    name: config.name || '',
    primaryColor: config.colors.primary || '#000000',
    secondaryColor: config.colors.secondary || '#171717',
    accentColor: config.colors.accent || '#404040',
    primaryLogo: config.logos.primary || null,
  };

  const handleManualSave = async () => {
    // Clear any pending auto-save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    setSaveStatus('saving');
    try {
      await saveBrand(config, currentBrandId);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error: any) {
      console.error("Failed to save brand", error);
      setSaveStatus('idle');
      alert(`Failed to save brand settings: ${error.message || 'Unknown error'}`);
    }
  };

  const fetchBrandData = async () => {
    if (!websiteUrl) return;

    setIsFetchingBrand(true);
    try {
      const extractedData = await extractBrandFromUrl(websiteUrl);
      updateBrandConfig({
        name: extractedData.name || 'New Brand',
        colors: {
          primary: extractedData.primaryColor || INITIAL_BRAND_KIT.primaryColor,
          secondary: extractedData.secondaryColor || INITIAL_BRAND_KIT.secondaryColor,
          accent: extractedData.accentColor || INITIAL_BRAND_KIT.accentColor,
          text: config.colors.text || '#000000',
          background: config.colors.background || '#ffffff',
        },
        logos: {
          primary: extractedData.logoUrl || '',
        },
        backgroundPattern: extractedData.backgroundPattern,
      });
    } catch (error: any) {
      console.error("Failed to fetch brand data", error);
      alert(`Failed to extract brand information: ${error.message}`);
    } finally {
      setIsFetchingBrand(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-text-main mb-1">Brand Settings</h1>
          <p className="text-text-muted text-sm">Configure your brand identity for AI-generated content</p>
        </div>
        <div className="flex items-center gap-3">
          {saveStatus !== 'idle' && (
            <div className="flex items-center gap-2 text-sm">
              {saveStatus === 'saving' && (
                <>
                  <span className="size-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>
                  <span className="text-gray-600">Saving...</span>
                </>
              )}
              {saveStatus === 'saved' && (
                <>
                  <Icon name="check_circle" className="text-green-500" />
                  <span className="text-green-600">Saved</span>
                </>
              )}
            </div>
          )}
          <button
            onClick={handleManualSave}
            disabled={saveStatus === 'saving'}
            className="px-5 h-10 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {saveStatus === 'saving' ? (
              <>
                <span className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Icon name="save" size={18} />
                <span>Save</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Brand Identity */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-xl font-bold text-text-main mb-4 flex items-center gap-2">
              <Icon name="badge" className="text-primary" />
              Brand Identity
            </h2>

            <div className="space-y-5">
              <label className="block">
                <span className="text-sm font-semibold text-text-main mb-2 block">Website URL (Optional)</span>
                <div className="flex gap-2">
                  <input
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    onBlur={fetchBrandData}
                    onKeyDown={(e) => e.key === 'Enter' && fetchBrandData()}
                    className="flex-1 h-12 px-4 rounded-lg border border-gray-200 bg-background-light text-text-main focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                    placeholder="e.g. yourbrand.com"
                    type="url"
                  />
                  <button
                    onClick={fetchBrandData}
                    disabled={isFetchingBrand}
                    className="px-5 h-12 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isFetchingBrand ? (
                      <span className="size-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      <>
                        <Icon name="auto_fix_high" />
                        Auto-fetch
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-2">Automatically extract brand info from your website</p>
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-text-main mb-2 block">Brand Name</span>
                <input
                  value={brandKit.name}
                  onChange={(e) => updateBrandConfig({ name: e.target.value })}
                  className="w-full h-12 px-4 rounded-lg border border-gray-200 bg-background-light text-text-main focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  placeholder="e.g. Acme Corp"
                  type="text"
                />
              </label>

            </div>
          </div>

          {/* Colors */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-xl font-bold text-text-main mb-4 flex items-center gap-2">
              <Icon name="palette" className="text-primary" />
              Brand Colors
            </h2>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <label className="text-sm font-semibold text-text-main w-24">Primary</label>
                <input
                  type="color"
                  value={brandKit.primaryColor}
                  onChange={(e) => updateBrandConfig({
                    colors: {
                      ...config.colors,
                      primary: e.target.value
                    }
                  })}
                  className="size-12 rounded-lg border-2 border-gray-200 cursor-pointer"
                />
                <input
                  readOnly
                  value={brandKit.primaryColor}
                  className="flex-1 text-sm font-mono p-2 rounded-lg border border-gray-200 bg-gray-50 uppercase"
                />
              </div>

              <div className="flex items-center gap-4">
                <label className="text-sm font-semibold text-text-main w-24">Secondary</label>
                <input
                  type="color"
                  value={brandKit.secondaryColor}
                  onChange={(e) => updateBrandConfig({
                    colors: {
                      ...config.colors,
                      secondary: e.target.value
                    }
                  })}
                  className="size-12 rounded-lg border-2 border-gray-200 cursor-pointer"
                />
                <input
                  readOnly
                  value={brandKit.secondaryColor}
                  className="flex-1 text-sm font-mono p-2 rounded-lg border border-gray-200 bg-gray-50 uppercase"
                />
              </div>

              <div className="flex items-center gap-4">
                <label className="text-sm font-semibold text-text-main w-24">Accent</label>
                <input
                  type="color"
                  value={brandKit.accentColor}
                  onChange={(e) => updateBrandConfig({
                    colors: {
                      ...config.colors,
                      accent: e.target.value
                    }
                  })}
                  className="size-12 rounded-lg border-2 border-gray-200 cursor-pointer"
                />
                <input
                  readOnly
                  value={brandKit.accentColor}
                  className="flex-1 text-sm font-mono p-2 rounded-lg border border-gray-200 bg-gray-50 uppercase"
                />
              </div>
            </div>
          </div>

          {/* Logo */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-xl font-bold text-text-main mb-4 flex items-center gap-2">
              <Icon name="image" className="text-primary" />
              Logo
            </h2>

            <div className="group relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-200 rounded-xl hover:bg-background-light transition-colors bg-white overflow-hidden">
              {brandKit.primaryLogo ? (
                <div className="relative w-full h-full flex items-center justify-center p-6">
                  <img src={brandKit.primaryLogo} alt="Brand Logo" className="max-w-full max-h-full object-contain" />
                  <button
                    onClick={() => updateBrandConfig({ logos: { ...config.logos, primary: '' } })}
                    className="absolute top-3 right-3 size-8 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                  >
                    <Icon name="close" size={16} />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center">
                  <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Icon name="cloud_upload" size={32} className="text-primary" />
                  </div>
                  <p className="mb-1 text-sm font-semibold text-text-main">Upload Logo</p>
                  <p className="text-xs text-gray-500 mb-4">Paste logo URL</p>
                  <input
                    type="text"
                    placeholder="https://..."
                    value={brandKit.primaryLogo || ''}
                    onChange={(e) => updateBrandConfig({ logos: { ...config.logos, primary: e.target.value } })}
                    className="w-full max-w-sm px-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="lg:col-span-1">
          <div className="sticky top-24">
            <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-text-muted">Preview</h3>
                </div>
              </div>
              <div className="aspect-square relative flex items-center justify-center p-6 bg-gradient-to-br from-gray-50 to-gray-100">
                <div className="relative w-full h-full bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col">
                  <div className="h-1/2 relative overflow-hidden" style={{ backgroundColor: brandKit.primaryColor }}>
                    <div className="absolute inset-0 bg-gradient-to-t from-primary via-transparent to-transparent" style={{ backgroundImage: `linear-gradient(to top, ${brandKit.primaryColor}, transparent, transparent)` }}></div>
                    <div className="absolute top-4 left-4 flex items-center gap-2 text-white">
                      {brandKit.primaryLogo && (
                        <div className="size-5 bg-white rounded-md flex items-center justify-center p-1">
                          <img src={brandKit.primaryLogo} alt="Logo" className="w-full h-full object-contain" />
                        </div>
                      )}
                      <span className="font-bold tracking-tight text-xs">{brandKit.name || 'Your Brand'}</span>
                    </div>
                  </div>
                  <div className="h-1/2 p-6 flex flex-col justify-center bg-white relative">
                    <Icon name="format_quote" size={32} className="text-primary/30 absolute top-3 left-4 -z-0 rotate-180" style={{ color: `${brandKit.primaryColor}4D` }} />
                    <p className="text-[#110d1b] font-bold text-sm leading-snug relative z-10">
                      We've streamlined our entire content workflow. The AI customization is simply unmatched.
                    </p>
                    <div className="mt-4 flex items-center gap-2">
                      <div className="size-8 rounded-full bg-gray-200"></div>
                      <div>
                        <p className="text-[10px] font-bold text-[#110d1b]">Sarah Jenkins</p>
                        <p className="text-[9px] text-gray-500 uppercase tracking-wide">CTO, TechFlow</p>
                      </div>
                    </div>
                  </div>
                  <div className="absolute bottom-0 left-0 w-full h-1" style={{ backgroundColor: brandKit.accentColor }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrandSettings;
