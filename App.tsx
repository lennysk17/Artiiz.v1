
import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import TrackPage from './pages/TrackPage';
import DiagPage from './pages/DiagPage';
import BottomNav from './components/BottomNav';
import Sidebar from './components/Sidebar';
import ThemeToggle from './components/ThemeToggle';
import VisionDashboard from './pages/VisionDashboard';
import ActionDashboard from './pages/ActionDashboard';
import GestionDashboard from './pages/GestionDashboard';
import ProfilePage from './pages/ProfilePage';
import LoginPage from './pages/LoginPage';
import ArtiizCopilot from './components/ArtiizCopilot';
import { DashboardView, UserProfile, AppNotification } from './types';
import { Bell, LogOut, User as UserIcon, X, PhoneMissed, Loader2 } from 'lucide-react';
import { analyzeLocalMarket } from './services/geminiService';
import { supabase } from './services/supabaseClient';

const DashboardContent: React.FC<{
  currentView: DashboardView;
  setCurrentView: (view: DashboardView) => void;
  profile: UserProfile;
  marketData: any;
  isAnalyzing: boolean;
  triggerAnalysis: () => void;
  handleSaveProfile: (p: UserProfile) => void;
  notifications: AppNotification[];
  setNotifications: (n: AppNotification[]) => void;
  showNotifMenu: boolean;
  setShowNotifMenu: (s: boolean) => void;
  handleLogout: () => void;
}> = ({
  currentView, setCurrentView, profile, marketData, isAnalyzing,
  triggerAnalysis, handleSaveProfile, notifications, setNotifications,
  showNotifMenu, setShowNotifMenu, handleLogout
}) => {
    const unreadCount = notifications.filter(n => !n.read).length;
    const [isDarkMode, setIsDarkMode] = useState(document.documentElement.classList.contains('dark'));

    useEffect(() => {
      const observer = new MutationObserver(() => {
        setIsDarkMode(document.documentElement.classList.contains('dark'));
      });
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
      return () => observer.disconnect();
    }, []);

    const renderView = () => {
      switch (currentView) {
        case 'vision': return (
          <VisionDashboard
            marketData={marketData}
            isAnalyzing={isAnalyzing}
            onRefresh={triggerAnalysis}
            profile={profile}
            onUpdateProfile={handleSaveProfile}
          />
        );
        case 'action': return <ActionDashboard profile={profile} onNavigate={setCurrentView} />;
        case 'gestion': return <GestionDashboard profile={profile} />;
        case 'profile': return <ProfilePage profile={profile} onSave={handleSaveProfile} />;
        default: return <VisionDashboard marketData={marketData} isAnalyzing={isAnalyzing} onRefresh={triggerAnalysis} profile={profile} onUpdateProfile={handleSaveProfile} />;
      }
    };

    return (
      <div className="min-h-screen bg-day-bg dark:bg-night-bg transition-colors duration-300 flex">
        <Sidebar currentView={currentView} setView={setCurrentView} onLogout={handleLogout} />

        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-40 bg-day-bg/80 dark:bg-night-bg/80 backdrop-blur-md px-6 py-4 flex justify-between items-center border-b border-day-border/50 dark:border-night-border/50 lg:bg-day-surface/50 dark:lg:bg-night-surface/50">
            <div className="flex items-center gap-3 lg:hidden">
              <button
                onClick={() => setCurrentView('profile')}
                className="w-10 h-10 flex items-center justify-center active:scale-95 transition-transform"
              >
                <img
                  src={isDarkMode ? "/logo.png" : "/logo_light.png"}
                  alt="Artiiz Logo"
                  className="w-8 h-8 object-contain"
                />
              </button>
              <div onClick={() => setCurrentView('vision')} className="cursor-pointer">
                <span className="font-black text-xl tracking-tighter">Artiiz</span>
              </div>
            </div>

            <div className="hidden lg:block">
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest">
                Tableau de Bord / <span className="text-accent">{currentView}</span>
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentView('profile')}
                className="hidden md:flex items-center gap-3 px-3 py-1.5 bg-day-surface dark:bg-night-surface rounded-full border border-day-border dark:border-night-border mr-2 hover:border-accent transition-all cursor-pointer"
              >
                <div className="w-6 h-6 bg-accent/20 rounded-full flex items-center justify-center text-accent">
                  <UserIcon size={14} />
                </div>
                <div className="flex flex-col items-start leading-none">
                  <span className="text-[10px] font-black uppercase tracking-tight">{profile.directorName}</span>
                  <span className="text-[8px] text-gray-400 font-bold uppercase">{profile.companyName}</span>
                </div>
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowNotifMenu(!showNotifMenu)}
                  className="p-2.5 bg-day-surface dark:bg-night-surface border border-day-border dark:border-night-border rounded-xl hover:border-accent transition-all relative group"
                >
                  <Bell size={20} className="text-gray-500 group-hover:text-accent transition-colors" />
                  {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-day-surface dark:border-night-surface"></span>
                  )}
                </button>

                {showNotifMenu && (
                  <div className="absolute right-0 mt-3 w-80 bg-day-surface dark:bg-night-surface border border-day-border dark:border-night-border rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                    <div className="p-4 border-b border-day-border dark:border-night-border flex justify-between items-center">
                      <span className="font-black text-xs uppercase tracking-widest">Notifications</span>
                      <button onClick={() => setNotifications([])} className="text-[10px] text-accent font-bold">TOUT EFFACER</button>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {notifications.length > 0 ? notifications.map(n => (
                        <div key={n.id} className={`p-4 border-b border-day-border/30 dark:border-night-border/30 last:border-0 hover:bg-day-bg dark:hover:bg-night-bg transition-colors cursor-pointer ${!n.read ? 'bg-accent/5' : ''}`}>
                          <div className="flex justify-between items-start mb-1">
                            <h4 className="font-black text-[11px] uppercase tracking-tight">{n.title}</h4>
                            <span className="text-[9px] text-gray-400 font-bold">{n.time}</span>
                          </div>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight">{n.message}</p>
                        </div>
                      )) : (
                        <div className="p-8 text-center text-gray-400 italic text-[11px]">Aucune notification</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <ThemeToggle />
              <button
                onClick={handleLogout}
                className="p-2 rounded-xl lg:hidden text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                title="Déconnexion"
              >
                <LogOut size={20} />
              </button>
            </div>
          </header>

          <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 lg:p-10">
            {renderView()}
          </main>
        </div>

        <ArtiizCopilot profile={profile} />
        <BottomNav currentView={currentView} setView={setCurrentView} />
      </div>
    );
  };

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [currentView, setCurrentView] = useState<DashboardView>('vision');
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [marketData, setMarketData] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const [profile, setProfile] = useState<UserProfile>({
    companyName: 'Artiiz Plomberie',
    companyAddress: '12 Rue de l\'Innovation, 75008 Paris',
    directorName: 'Jean le Plombier',
    siret: '123 456 789 00012',
    logoUrl: '',
    avatarUrl: '',
    gmbConnected: false,
    gmbData: null,
    autoReplyEnabled: true,
    influenceRadius: 10,
    lat: 48.8719,
    lng: 2.3022,
    selectedDepartments: ['75', '92']
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
      if (session?.user) {
        fetchProfile(session.user.id);
        fetchAppNotifications(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
      if (session?.user) {
        fetchProfile(session.user.id);
        fetchAppNotifications(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchAppNotifications = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error && error.code !== 'PGRST116') throw error;
      if (data) {
        setNotifications(data.map(n => ({
          id: n.id,
          title: n.title,
          message: n.message,
          type: n.type as any,
          time: new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          read: n.read
        })));
      }
    } catch (err) {
      console.error("Error fetching notifications:", err);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const newNotif = payload.new as any;
          setNotifications(prev => [{
            id: newNotif.id,
            title: newNotif.title,
            message: newNotif.message,
            type: newNotif.type,
            time: 'Maintenant',
            read: false
          }, ...prev].slice(0, 10));

          if ("Notification" in window && Notification.permission === "granted") {
            new Notification(newNotif.title, { body: newNotif.message });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isAuthenticated]);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setProfile({
          companyName: data.company_name || profile.companyName,
          companyAddress: data.company_address || profile.companyAddress,
          directorName: data.director_name || profile.directorName,
          siret: data.siret || profile.siret,
          logoUrl: data.logo_url || profile.logoUrl,
          avatarUrl: data.avatar_url || profile.avatarUrl,
          gmbConnected: data.gmb_connected || false,
          gmbData: data.gmb_data || null,
          autoReplyEnabled: true,
          influenceRadius: data.influence_radius || profile.influenceRadius,
          lat: data.lat || profile.lat,
          lng: data.lng || profile.lng,
          selectedDepartments: data.selected_departments || profile.selectedDepartments
        });
      }
    } catch (err) {
      console.error("Erreur lors de la récupération du profil :", err);
    }
  };

  const triggerAnalysis = async () => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    const data = await analyzeLocalMarket(profile.companyAddress);
    setMarketData(data);
    setIsAnalyzing(false);
  };

  useEffect(() => {
    if (isAuthenticated === true && !marketData && !isAnalyzing) {
      triggerAnalysis();
    }
  }, [profile.companyAddress, isAuthenticated]);

  const handleLogin = () => setIsAuthenticated(true);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
  };

  const handleSaveProfile = async (newProfile: UserProfile) => {
    setProfile(newProfile);
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          company_name: newProfile.companyName,
          company_address: newProfile.companyAddress,
          director_name: newProfile.directorName,
          siret: newProfile.siret,
          influence_radius: newProfile.influenceRadius,
          lat: newProfile.lat,
          lng: newProfile.lng,
          selected_departments: newProfile.selectedDepartments,
          logo_url: newProfile.logoUrl,
          avatar_url: newProfile.avatarUrl,
          gmb_connected: newProfile.gmbConnected,
          gmb_data: newProfile.gmbData,
          updated_at: new Date().toISOString()
        });

      if (error) console.error("Erreur upsert profile:", error);
    }
  };

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-day-bg dark:bg-night-bg flex items-center justify-center">
        <Loader2 className="animate-spin text-accent" size={40} />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/track/:token" element={<TrackPage />} />
      <Route path="/diag/:token" element={<DiagPage />} />
      <Route
        path="/*"
        element={
          !isAuthenticated ? (
            <LoginPage onLogin={handleLogin} />
          ) : (
            <DashboardContent
              currentView={currentView}
              setCurrentView={setCurrentView}
              profile={profile}
              marketData={marketData}
              isAnalyzing={isAnalyzing}
              triggerAnalysis={triggerAnalysis}
              handleSaveProfile={handleSaveProfile}
              notifications={notifications}
              setNotifications={setNotifications}
              showNotifMenu={showNotifMenu}
              setShowNotifMenu={setShowNotifMenu}
              handleLogout={handleLogout}
            />
          )
        }
      />
    </Routes>
  );
};

export default App;
