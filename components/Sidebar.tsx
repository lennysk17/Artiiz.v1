
import React, { useState, useEffect } from 'react';
import { TrendingUp, Zap, Wallet, LogOut, Settings, User } from 'lucide-react';
import { DashboardView } from '../types';

interface SidebarProps {
  currentView: DashboardView;
  setView: (view: DashboardView) => void;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, onLogout }) => {
  const [isDarkMode, setIsDarkMode] = useState(document.documentElement.classList.contains('dark'));

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const navItems = [
    { id: 'vision' as const, label: 'Vision', icon: TrendingUp },
    { id: 'action' as const, label: 'Action', icon: Zap },
    { id: 'gestion' as const, label: 'Gestion', icon: Wallet },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-72 h-screen sticky top-0 bg-day-surface dark:bg-night-surface border-r border-day-border dark:border-night-border p-6 z-50">
      <div className="flex items-center gap-3 mb-10 px-2 cursor-pointer" onClick={() => setView('vision')}>
        <img
          src={isDarkMode ? "/logo.png" : "/logo_light.png"}
          alt="Artiiz Logo"
          className="w-14 h-14 object-contain"
        />
        <span className="font-bold text-xl tracking-tight">Artiiz</span>
      </div>

      <nav className="flex-1 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                ? 'bg-accent text-white shadow-lg shadow-accent/20 font-bold'
                : 'text-gray-500 hover:bg-day-bg dark:hover:bg-night-bg hover:text-accent'
                }`}
            >
              <Icon size={22} className={isActive ? 'text-white' : 'text-gray-400 group-hover:text-accent'} />
              <span className="text-sm tracking-wide">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="pt-6 border-t border-day-border dark:border-night-border space-y-2">
        <button
          onClick={() => setView('profile')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${currentView === 'profile'
            ? 'bg-accent text-white shadow-lg shadow-accent/20 font-bold'
            : 'text-gray-500 hover:bg-day-bg dark:hover:bg-night-bg hover:text-accent'
            }`}
        >
          <User size={20} className={currentView === 'profile' ? 'text-white' : 'text-gray-400 group-hover:text-accent'} />
          <span className="text-sm">Mon Profil</span>
        </button>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
        >
          <LogOut size={20} />
          <span className="text-sm font-bold">Déconnexion</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
