
import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import logo from '../assets/proveen_logo.png';
import { useAppSelector, useAppDispatch } from '../store'; // Added imports
import { updateSourceReviews } from '../store/slices/reviewsSlice';
import { scrapeGoogleReviews } from '../lib/scrapers/google_reviews';
import { scrapeTrustpilotReviews } from '../lib/scrapers/trustpilot';
import { supabase } from '../lib/supabase';
import { SidebarNavSkeleton } from './Skeleton';
import { Icon } from './Icon';

const Sidebar: React.FC = () => {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [userName, setUserName] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    // Check if Material Symbols font is loaded
    const checkFontLoaded = () => {
      if (document.fonts && document.fonts.check) {
        // Check if Material Symbols font is available
        const isLoaded = document.fonts.check('24px Material Symbols Outlined');
        if (isLoaded) {
          setFontsLoaded(true);
          return;
        }
      }

      // Fallback: wait for fonts to load
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => {
          setFontsLoaded(true);
        });
      } else {
        // If fonts API not available, assume loaded after a short delay
        setTimeout(() => setFontsLoaded(true), 100);
      }
    };

    checkFontLoaded();
  }, []);

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const name = user.user_metadata?.name || user.email?.split('@')[0] || '';
          setUserName(name);
          setUserEmail(user.email || '');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const name = session.user.user_metadata?.name || session.user.email?.split('@')[0] || '';
        setUserName(name);
        setUserEmail(session.user.email || '');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const navItems = [
    { to: '/', icon: 'dashboard', label: 'Dashboard', fill: true },
    { to: '/library', icon: 'library_books', label: 'Library', fill: false },
    { to: '/generator', icon: 'stylus', label: 'Generator', fill: false },
    { to: '/analytics', icon: 'pie_chart', label: 'Analytics', fill: false },
  ];

  const settingsItems = [
    { to: '/settings', icon: 'palette', label: 'Brand Settings', fill: false },
  ];

  return (
    <aside className="w-64 bg-surface-light border-r border-gray-200 flex-col hidden md:flex z-20 h-screen sticky top-0">
      <div className="h-16 flex items-center px-6 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <img src={logo} alt="Proveen" className="h-8 w-auto" />
          <span className="text-lg font-bold tracking-tight text-text-main">Proveen</span>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto py-6 px-4 flex flex-col gap-1">
        {!fontsLoaded ? (
          <>
            {navItems.map((item, index) => (
              <SidebarNavSkeleton key={index} />
            ))}
            <div className="my-4 border-t border-gray-100"></div>
            <div className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Settings</div>
            {settingsItems.map((item, index) => (
              <SidebarNavSkeleton key={index} />
            ))}
          </>
        ) : (
          <>
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group ${isActive ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <Icon name={item.icon} fill={item.fill} />
                <span className="text-sm font-medium">{item.label}</span>
              </NavLink>
            ))}
            <div className="my-4 border-t border-gray-100"></div>
            <div className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Settings</div>
            {settingsItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group ${isActive ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <Icon name={item.icon} fill={item.fill} />
                <span className="text-sm font-medium">{item.label}</span>
              </NavLink>
            ))}
          </>
        )}
      </nav>
      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
          <div className="size-9 rounded-full bg-cover bg-center border border-gray-200 shadow-sm shrink-0" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDYWcVaCpc_AHvteRWcO6zheKA6OBOkijtvpzgXKIWeScCK_ETFMVt44n8ZH7a1LgrQO9mqTerB1LnUnwoQepC_P62zQOHhcld2CFxukH8tvwi3omQf62DZ9aPDYt0uwDY7fRgiSJTKHjv-nRshi7_22Yk-cj2nz_J6hNnzzOI4P-FynOgCs-AO5VceglbCxwGs9pesL3pn7VtqwKtUXI6aSzdscQ7URR8h0lnAZelhP-6mToIxIV4UiqkwQPjTOB3kQ9v6UcIfWvfJ')" }}></div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-medium text-text-main truncate">{userName || 'User'}</span>
            <span className="text-xs text-gray-500 truncate">{userEmail || 'Admin'}</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

const Header: React.FC = () => {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [userName, setUserName] = useState<string>('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/login'); // Redirect to login page
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Fetch user name
  useEffect(() => {
    const fetchUserName = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const name = user.user_metadata?.name || user.email?.split('@')[0] || '';
          setUserName(name);
        }
      } catch (error) {
        console.error('Error fetching user name:', error);
      }
    };

    fetchUserName();

    // Listen for auth state changes to update name
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const name = session.user.user_metadata?.name || session.user.email?.split('@')[0] || '';
        setUserName(name);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <header className="h-16 bg-background-light/95 backdrop-blur border-b border-gray-200/50 flex items-center justify-between px-6 z-10 sticky top-0">
      <div className="flex-1 max-w-xl">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-primary transition-colors">
            <Icon name="search" size={20} />
          </div>
          <input className="block w-full pl-10 pr-3 py-2 border-none rounded-lg leading-5 bg-white text-text-main placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm shadow-sm transition-all" placeholder="Search testimonials, creatives..." type="text" />
        </div>
      </div>
      <div className="flex items-center gap-4 ml-4">
        <button className="hidden sm:flex items-center justify-center px-4 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-sm font-semibold rounded-lg transition-colors">
          Upgrade Pro
        </button>
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className={`relative p-2 text-gray-500 hover:text-text-main transition-colors rounded-full hover:bg-gray-100 ${isNotificationsOpen ? 'bg-gray-100 text-text-main' : ''}`}
          >
            <Icon name="notifications" size={22} />
            <span className="absolute top-2 right-2 size-2 bg-black rounded-full border-2 border-background-light"></span>
          </button>

          {isNotificationsOpen && (
            <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
              <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
                <h3 className="font-semibold text-sm text-text-main">Notifications</h3>
                <button className="text-xs text-primary font-medium hover:text-primary-light">Mark all as read</button>
              </div>
              <div className="max-h-96 overflow-y-auto">
                <div className="px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors flex gap-3 items-start group relative">
                  <div className="size-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon name="download" size={18} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900 font-medium leading-none mb-1">New reviews scraped</p>
                    <p className="text-xs text-gray-500 leading-snug">5 new reviews scraped from Trustpilot.</p>
                    <p className="text-[10px] text-gray-400 mt-1.5">2 min ago</p>
                  </div>
                  <div className="size-2 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="h-8 w-px bg-gray-200 mx-1"></div>

        <div className="relative" ref={profileDropdownRef}>
          <button
            className="flex items-center gap-2 group"
            onClick={() => setIsProfileOpen(!isProfileOpen)}
          >
            <div className="size-9 rounded-full bg-cover bg-center border-2 border-white shadow-sm" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDYWcVaCpc_AHvteRWcO6zheKA6OBOkijtvpzgXKIWeScCK_ETFMVt44n8ZH7a1LgrQO9mqTerB1LnUnwoQepC_P62zQOHhcld2CFxukH8tvwi3omQf62DZ9aPDYt0uwDY7fRgiSJTKHjv-nRshi7_22Yk-cj2nz_J6hNnzzOI4P-FynOgCs-AO5VceglbCxwGs9pesL3pn7VtqwKtUXI6aSzdscQ7URR8h0lnAZelhP-6mToIxIV4UiqkwQPjTOB3kQ9v6UcIfWvfJ')" }}></div>
            <div className="hidden md:flex flex-col items-start">
              <span className="text-sm font-medium text-text-main leading-tight">{userName || 'User'}</span>
              <span className="text-xs text-gray-500">Admin</span>
            </div>
            <Icon name="expand_more" size={20} className={`text-gray-400 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 top-12 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50 animate-in fade-in zoom-in-95 duration-200">
              <div className="px-4 py-2 border-b border-gray-50 md:hidden">
                <p className="text-sm font-medium text-text-main">{userName || 'User'}</p>
                <p className="text-xs text-gray-500">Admin</p>
              </div>
              <button
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                onClick={() => {
                  // Add navigation to profile/settings if needed
                  setIsProfileOpen(false);
                }}
              >
                <Icon name="person" size={18} />
                Profile
              </button>
              <button
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                onClick={handleSignOut}
              >
                <Icon name="logout" size={18} />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useAppDispatch();
  const { sources } = useAppSelector(state => state.reviews);

  // Daily Update Check
  React.useEffect(() => {
    const checkUpdates = async () => {
      const now = Date.now();
      const ONE_DAY_MS = 24 * 60 * 60 * 1000;

      for (const source of sources) {
        if (source.autoRefresh && (now - source.lastUpdated > ONE_DAY_MS)) {
          console.log(`Auto-refreshing reviews for ${source.id}...`);
          try {
            let newReviews = [];
            if (source.type === 'google') {
              newReviews = await scrapeGoogleReviews(source.url);
            } else if (source.type === 'trustpilot') {
              newReviews = await scrapeTrustpilotReviews(source.url);
            }

            if (newReviews.length > 0) {
              dispatch(updateSourceReviews({
                id: source.id,
                reviews: newReviews,
                lastUpdated: now
              }));
            }
          } catch (err) {
            console.error(`Failed to auto-refresh ${source.id}:`, err);
          }
        }
      }
    };

    checkUpdates();
    // Run check implicitly on mount. 
    // In a real app, maybe use a specialized worker or interval, but this is fine on page load.
  }, [dispatch, sources.length]); // Check when sources change or mount

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col h-full relative overflow-hidden overflow-y-auto no-scrollbar">
        <Header />
        <main className="flex-1 p-6 lg:p-10 scroll-smooth">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
