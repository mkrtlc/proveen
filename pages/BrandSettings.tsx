
import React, { useState, useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchAllBrands, fetchBrand, saveBrand, deleteBrand, updateBrandConfig, setCurrentBrandId, resetBrandConfig } from '../store/slices/brandSlice';
import { extractBrandFromUrl } from '../lib/brandExtractor';
import { Icon } from '../components/Icon';
import { INITIAL_BRAND_KIT } from '../constants';

type TabType = 'overview' | 'identity' | 'visuals' | 'colors';

const BrandSettings: React.FC = () => {
  const dispatch = useAppDispatch();
  const { config, brands, currentBrandId, loading, error } = useAppSelector((state) => state.brand);
  
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [isFetchingBrand, setIsFetchingBrand] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [showPreview, setShowPreview] = useState(true);
  const [showBrandSelector, setShowBrandSelector] = useState(false);
  const brandSelectorRef = useRef<HTMLDivElement>(null);

  // Load all brands and current brand on mount
  useEffect(() => {
    dispatch(fetchAllBrands());
    dispatch(fetchBrand(null));
  }, [dispatch]);

  // Close brand selector when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (brandSelectorRef.current && !brandSelectorRef.current.contains(event.target as Node)) {
        setShowBrandSelector(false);
      }
    };

    if (showBrandSelector) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showBrandSelector]);

  // Update local state when Redux config changes
  const brandKit = {
    name: config.name || '',
    primaryColor: config.colors.primary || '#000000',
    secondaryColor: config.colors.secondary || '#171717',
    accentColor: config.colors.accent || '#404040',
    headingFont: config.typography.fontFamily,
    bodyFont: config.typography.fontFamily,
    primaryLogo: config.logos.primary || null,
    backgroundPattern: config.backgroundPattern || null,
  };

  const fetchBrandData = async () => {
    if (!websiteUrl) return;

    setIsFetchingBrand(true);
    try {
      const extractedData = await extractBrandFromUrl(websiteUrl);
      
      // Reset to new brand and update with extracted data
      dispatch(resetBrandConfig());
      dispatch(updateBrandConfig({
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
      }));
    } catch (error: any) {
      console.error("Failed to fetch brand data", error);
      alert(`Failed to extract brand information: ${error.message}`);
    } finally {
      setIsFetchingBrand(false);
    }
  };

  const handleSelectBrand = async (brandId: string) => {
    dispatch(setCurrentBrandId(brandId));
    await dispatch(fetchBrand(brandId));
  };

  const handleDeleteBrand = async (brandId: string) => {
    if (!confirm('Are you sure you want to delete this brand?')) return;
    await dispatch(deleteBrand(brandId));
    await dispatch(fetchAllBrands());
    if (currentBrandId === brandId) {
      dispatch(resetBrandConfig());
    }
  };

  const handleCreateNew = () => {
    dispatch(resetBrandConfig());
    setWebsiteUrl('');
  };

  const handleSave = async () => {
    setSaveStatus('saving');
    try {
      await dispatch(saveBrand({ config, brandId: currentBrandId })).unwrap();
      await dispatch(fetchAllBrands());
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error: any) {
      console.error("Failed to save brand", error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const handleDiscard = () => {
    // Reload current brand from database
    if (currentBrandId) {
      dispatch(fetchBrand(currentBrandId));
    } else {
      dispatch(resetBrandConfig());
    }
  };

  const currentBrand = brands.find(b => b.id === currentBrandId);
  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: 'dashboard' },
    { id: 'identity', label: 'Brand Identity', icon: 'badge' },
    { id: 'visuals', label: 'Visual Assets', icon: 'image' },
    { id: 'colors', label: 'Colors', icon: 'palette' },
  ];

  return (
    <div className="space-y-6 pb-20">
      {/* Header Section */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-text-main mb-1">Brand Settings</h1>
            <p className="text-text-muted text-sm">Configure your brand identity for AI-generated content</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={handleDiscard}
              className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 bg-white hover:bg-gray-50 transition-all"
            >
              Discard
            </button>
            <button 
              onClick={handleSave}
              disabled={saveStatus === 'saving'}
              className="px-5 py-2 rounded-lg bg-primary hover:bg-primary-light text-white text-sm font-semibold shadow-lg shadow-primary/25 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saveStatus === 'saving' ? (
                <>
                  <span className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Saving...
                </>
              ) : saveStatus === 'success' ? (
                <>
                  <Icon name="check_circle" />
                  Saved!
                </>
              ) : (
                <>
                  <Icon name="save" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>

        {/* Brand Selector */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              <div className="relative" ref={brandSelectorRef}>
                <button
                  onClick={() => setShowBrandSelector(!showBrandSelector)}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-lg border-2 border-gray-200 hover:border-primary/50 bg-white transition-all min-w-[280px]"
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
                      <div className="flex-1 text-left">
                        <div className="font-semibold text-sm text-text-main">{currentBrand.name}</div>
                        <div className="text-xs text-gray-500">Active brand</div>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 text-left">
                      <div className="font-semibold text-sm text-text-main">New Brand</div>
                      <div className="text-xs text-gray-500">Create a new brand configuration</div>
                    </div>
                  )}
                  <Icon name={showBrandSelector ? "expand_less" : "expand_more"} className="text-gray-400" />
                </button>
                
                {showBrandSelector && (
                  <div className="absolute top-full left-0 mt-2 w-full bg-white rounded-xl border border-gray-200 shadow-xl z-50 max-h-[400px] overflow-y-auto">
                    <div className="p-2">
                      <button
                        onClick={() => {
                          handleCreateNew();
                          setShowBrandSelector(false);
                        }}
                        className="w-full px-3 py-2.5 rounded-lg hover:bg-primary/5 text-left flex items-center gap-2 text-sm font-medium text-primary transition-colors"
                      >
                        <Icon name="add" size={20} />
                        Create New Brand
                      </button>
                      <div className="my-2 border-t border-gray-100"></div>
                      {brands.length === 0 ? (
                        <div className="px-3 py-6 text-center text-sm text-gray-500">No brands saved yet</div>
                      ) : (
                        brands.map((brand) => (
                          <div
                            key={brand.id}
                            className={`p-3 rounded-lg cursor-pointer transition-all mb-1 ${
                              currentBrandId === brand.id
                                ? 'bg-primary/10 border-2 border-primary'
                                : 'hover:bg-gray-50 border-2 border-transparent'
                            }`}
                            onClick={() => {
                              handleSelectBrand(brand.id);
                              setShowBrandSelector(false);
                            }}
                          >
                            <div className="flex items-center gap-3">
                              {brand.primary_logo && (
                                <img
                                  src={brand.primary_logo}
                                  alt={brand.name}
                                  className="w-10 h-10 object-contain rounded-lg border border-gray-200"
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
                                  <div
                                    className="w-3 h-3 rounded-full border border-gray-200"
                                    style={{ backgroundColor: brand.accent_color }}
                                    title="Accent"
                                  />
                                </div>
                              </div>
                              {currentBrandId === brand.id && (
                                <Icon name="check_circle" className="text-primary" size={20} />
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteBrand(brand.id);
                                }}
                                className="p-1.5 hover:bg-red-100 rounded-lg text-red-500 transition-colors"
                                title="Delete brand"
                              >
                                <Icon name="delete" size={18} />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 bg-white hover:bg-gray-50 transition-all flex items-center gap-2"
              >
                <Icon name={showPreview ? "visibility_off" : "visibility"} />
                {showPreview ? 'Hide' : 'Show'} Preview
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-100">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-6 py-4 text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                activeTab === tab.id
                  ? 'text-primary border-b-2 border-primary bg-primary/5'
                  : 'text-gray-600 hover:text-text-main hover:bg-gray-50'
              }`}
            >
              <Icon name={tab.icon} size={20} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Content */}
        <div className={`${showPreview ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
          <div className="space-y-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
                <div className="max-w-2xl mx-auto space-y-6">
                  <div className="text-center mb-8">
                    <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <Icon name="palette" size={32} className="text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold text-text-main mb-2">Brand Overview</h2>
                    <p className="text-text-muted">Quick overview of your brand configuration</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg border border-gray-200 bg-gray-50">
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Brand Name</div>
                      <div className="text-lg font-bold text-text-main">{brandKit.name || 'Not set'}</div>
                    </div>
                    <div className="p-4 rounded-lg border border-gray-200 bg-gray-50">
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Status</div>
                      <div className="text-lg font-bold text-text-main flex items-center gap-2">
                        {currentBrandId ? (
                          <>
                            <span className="size-2 rounded-full bg-green-500"></span>
                            Active
                          </>
                        ) : (
                          <>
                            <span className="size-2 rounded-full bg-yellow-500"></span>
                            Draft
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-6 rounded-lg border border-gray-200 bg-gradient-to-br from-primary/5 to-primary/10">
                    <h3 className="font-semibold text-text-main mb-4 flex items-center gap-2">
                      <Icon name="palette" className="text-primary" />
                      Color Palette
                    </h3>
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <div className="text-xs font-semibold text-gray-600 mb-2">Primary</div>
                        <div className="h-12 rounded-lg flex items-center gap-3 px-3" style={{ backgroundColor: brandKit.primaryColor }}>
                          <span className="text-xs font-mono text-white drop-shadow-lg">{brandKit.primaryColor}</span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-semibold text-gray-600 mb-2">Secondary</div>
                        <div className="h-12 rounded-lg flex items-center gap-3 px-3" style={{ backgroundColor: brandKit.secondaryColor }}>
                          <span className="text-xs font-mono text-white drop-shadow-lg">{brandKit.secondaryColor}</span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-semibold text-gray-600 mb-2">Accent</div>
                        <div className="h-12 rounded-lg flex items-center gap-3 px-3" style={{ backgroundColor: brandKit.accentColor }}>
                          <span className="text-xs font-mono text-white drop-shadow-lg">{brandKit.accentColor}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 rounded-lg border border-gray-200">
                    <h3 className="font-semibold text-text-main mb-4 flex items-center gap-2">
                      <Icon name="image" className="text-primary" />
                      Visual Assets
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 rounded-lg border-2 border-dashed border-gray-200">
                        {brandKit.primaryLogo ? (
                          <img src={brandKit.primaryLogo} alt="Logo" className="h-16 mx-auto object-contain" />
                        ) : (
                          <div className="text-gray-400">
                            <Icon name="image" size={32} className="mx-auto mb-2" />
                            <div className="text-xs">No logo</div>
                          </div>
                        )}
                        <div className="text-xs font-medium text-gray-600 mt-2">Primary Logo</div>
                      </div>
                      <div className="text-center p-4 rounded-lg border-2 border-dashed border-gray-200">
                        {brandKit.backgroundPattern ? (
                          <img src={brandKit.backgroundPattern} alt="Pattern" className="h-16 mx-auto object-cover rounded" />
                        ) : (
                          <div className="text-gray-400">
                            <Icon name="pattern" size={32} className="mx-auto mb-2" />
                            <div className="text-xs">No pattern</div>
                          </div>
                        )}
                        <div className="text-xs font-medium text-gray-600 mt-2">Background Pattern</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Identity Tab */}
            {activeTab === 'identity' && (
              <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
                <div className="max-w-2xl space-y-6">
                  <div className="mb-6">
                    <h2 className="text-xl font-bold text-text-main mb-2 flex items-center gap-2">
                      <Icon name="badge" className="text-primary" />
                      Brand Identity
                    </h2>
                    <p className="text-text-muted text-sm">Set up your brand's core information</p>
                  </div>

                  <div className="space-y-5">
                    <label className="block">
                      <span className="text-sm font-semibold text-text-main mb-2 block">Website URL</span>
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
                      <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                        <Icon name="info" size={14} />
                        Enter your website URL to automatically extract brand information
                      </p>
                    </label>

                    <label className="block">
                      <span className="text-sm font-semibold text-text-main mb-2 block">Brand Name</span>
                      <input
                        value={brandKit.name}
                        onChange={(e) => dispatch(updateBrandConfig({ name: e.target.value }))}
                        className="w-full h-12 px-4 rounded-lg border border-gray-200 bg-background-light text-text-main focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                        placeholder="e.g. Acme Corp"
                        type="text"
                      />
                      <p className="text-xs text-gray-400 mt-2">This name will appear in your generated content</p>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Visuals Tab */}
            {activeTab === 'visuals' && (
              <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
                <div className="max-w-2xl space-y-6">
                  <div className="mb-6">
                    <h2 className="text-xl font-bold text-text-main mb-2 flex items-center gap-2">
                      <Icon name="image" className="text-primary" />
                      Visual Assets
                    </h2>
                    <p className="text-text-muted text-sm">Upload logos and visual elements for your brand</p>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="text-sm font-semibold text-text-main mb-3 block">Primary Logo</label>
                      <div className="group relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-200 rounded-xl hover:bg-background-light transition-colors cursor-pointer bg-white overflow-hidden">
                        {brandKit.primaryLogo ? (
                          <div className="relative w-full h-full flex items-center justify-center p-6">
                            <img src={brandKit.primaryLogo} alt="Brand Logo" className="max-w-full max-h-full object-contain" />
                            <button
                              onClick={() => dispatch(updateBrandConfig({ logos: { ...config.logos, primary: '' } }))}
                              className="absolute top-3 right-3 size-8 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                            >
                              <Icon name="close" size={16} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center">
                            <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                              <Icon name="cloud_upload" size={32} className="text-primary" />
                            </div>
                            <p className="mb-1 text-sm font-semibold text-text-main">Upload Primary Logo</p>
                            <p className="text-xs text-gray-500 mb-4">SVG, PNG (Max 2MB)</p>
                            <input
                              type="text"
                              placeholder="Paste logo URL here"
                              value={brandKit.primaryLogo || ''}
                              onChange={(e) => dispatch(updateBrandConfig({ logos: { ...config.logos, primary: e.target.value } }))}
                              className="w-full max-w-sm px-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {brandKit.backgroundPattern && (
                      <div>
                        <label className="text-sm font-semibold text-text-main mb-3 block">Background Pattern</label>
                        <div className="relative w-full h-40 border border-gray-200 rounded-xl overflow-hidden">
                          <img src={brandKit.backgroundPattern} alt="Background Pattern" className="w-full h-full object-cover" />
                          <button
                            onClick={() => dispatch(updateBrandConfig({ backgroundPattern: undefined }))}
                            className="absolute top-3 right-3 size-8 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg"
                          >
                            <Icon name="close" size={16} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Colors Tab */}
            {activeTab === 'colors' && (
              <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
                <div className="max-w-2xl space-y-6">
                  <div className="mb-6">
                    <h2 className="text-xl font-bold text-text-main mb-2 flex items-center gap-2">
                      <Icon name="palette" className="text-primary" />
                      Brand Colors
                    </h2>
                    <p className="text-text-muted text-sm">Define your brand's color palette</p>
                  </div>

                  <div className="space-y-6">
                    <div className="p-6 rounded-xl border border-gray-200 bg-gradient-to-br from-primary/5 to-primary/10">
                      <label className="text-sm font-semibold text-text-main mb-4 block">Primary Color</label>
                      <div className="flex items-center gap-4">
                        <input 
                          type="color" 
                          value={brandKit.primaryColor} 
                          onChange={(e) => {
                            const newColor = e.target.value;
                            dispatch(updateBrandConfig({ 
                              colors: { 
                                primary: newColor,
                                secondary: config.colors.secondary || INITIAL_BRAND_KIT.secondaryColor,
                                accent: config.colors.accent || INITIAL_BRAND_KIT.accentColor,
                                text: config.colors.text || '#000000',
                                background: config.colors.background || '#ffffff',
                              } 
                            }));
                          }} 
                          className="size-16 rounded-xl border-2 border-white shadow-lg cursor-pointer" 
                        />
                        <div className="flex-1">
                          <input 
                            readOnly 
                            value={brandKit.primaryColor} 
                            className="w-full text-sm font-mono p-3 rounded-lg border border-gray-200 bg-white uppercase font-semibold" 
                          />
                          <p className="text-xs text-gray-500 mt-1.5">Main brand color used in content</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 rounded-xl border border-gray-200 bg-gray-50">
                      <label className="text-sm font-semibold text-text-main mb-4 block">Secondary Color</label>
                      <div className="flex items-center gap-4">
                        <input 
                          type="color" 
                          value={brandKit.secondaryColor} 
                          onChange={(e) => {
                            const newColor = e.target.value;
                            dispatch(updateBrandConfig({ 
                              colors: { 
                                primary: config.colors.primary || INITIAL_BRAND_KIT.primaryColor,
                                secondary: newColor,
                                accent: config.colors.accent || INITIAL_BRAND_KIT.accentColor,
                                text: config.colors.text || '#000000',
                                background: config.colors.background || '#ffffff',
                              } 
                            }));
                          }} 
                          className="size-16 rounded-xl border-2 border-white shadow-lg cursor-pointer" 
                        />
                        <div className="flex-1">
                          <input 
                            readOnly 
                            value={brandKit.secondaryColor} 
                            className="w-full text-sm font-mono p-3 rounded-lg border border-gray-200 bg-white uppercase font-semibold" 
                          />
                          <p className="text-xs text-gray-500 mt-1.5">Supporting color for backgrounds</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 rounded-xl border border-gray-200 bg-gray-50">
                      <label className="text-sm font-semibold text-text-main mb-4 block">Accent Color</label>
                      <div className="flex items-center gap-4">
                        <input 
                          type="color" 
                          value={brandKit.accentColor} 
                          onChange={(e) => {
                            const newColor = e.target.value;
                            dispatch(updateBrandConfig({ 
                              colors: { 
                                primary: config.colors.primary || INITIAL_BRAND_KIT.primaryColor,
                                secondary: config.colors.secondary || INITIAL_BRAND_KIT.secondaryColor,
                                accent: newColor,
                                text: config.colors.text || '#000000',
                                background: config.colors.background || '#ffffff',
                              } 
                            }));
                          }} 
                          className="size-16 rounded-xl border-2 border-white shadow-lg cursor-pointer" 
                        />
                        <div className="flex-1">
                          <input 
                            readOnly 
                            value={brandKit.accentColor} 
                            className="w-full text-sm font-mono p-3 rounded-lg border border-gray-200 bg-white uppercase font-semibold" 
                          />
                          <p className="text-xs text-gray-500 mt-1.5">Accent color for highlights and CTAs</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Preview Sidebar */}
        {showPreview && (
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-text-muted">Live Preview</h3>
                  </div>
                  <div className="text-[10px] text-gray-500 font-mono bg-white px-2 py-1 rounded border border-gray-100">1080×1080</div>
                </div>
                <div className="aspect-square relative flex items-center justify-center p-6 bg-gradient-to-br from-gray-50 to-gray-100">
                  <div className="relative w-full h-full bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col">
                    <div className="h-1/2 relative overflow-hidden" style={{ backgroundColor: brandKit.primaryColor }}>
                      <img className="w-full h-full object-cover opacity-60 mix-blend-overlay" src="https://lh3.googleusercontent.com/d/1w8y5h_C5uL8v78c_2uJ-6vD8_9_9XyZ" />
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
                        <div className="size-8 rounded-full bg-gray-200 bg-cover bg-center" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/d/1w8y5h_C5uL8v78c_2uJ-6vD8_9_9XyZ')" }}></div>
                        <div>
                          <p className="text-[10px] font-bold text-[#110d1b]">Sarah Jenkins</p>
                          <p className="text-[9px] text-gray-500 uppercase tracking-wide">CTO, TechFlow</p>
                        </div>
                      </div>
                      <div className="absolute bottom-0 left-0 w-full h-1" style={{ backgroundColor: brandKit.accentColor }}></div>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-white border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-1.5">
                        <div className="size-5 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: brandKit.primaryColor }}></div>
                        <div className="size-5 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: brandKit.secondaryColor }}></div>
                        <div className="size-5 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: brandKit.accentColor }}></div>
                      </div>
                      <span className="text-xs text-text-muted">Active</span>
                    </div>
                    <div className="text-xs text-green-600 font-medium flex items-center gap-1">
                      <Icon name="check_circle" size={14} />
                      Ready
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BrandSettings;
