
import React from 'react';
import { TrendingUp, Zap, Wallet, User } from 'lucide-react';
import { DashboardView } from '../types';

interface BottomNavProps {
  currentView: DashboardView;
  setView: (view: DashboardView) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ currentView, setView }) => {
  const navItems = [
    { id: 'vision' as const, label: 'Vision', icon: TrendingUp },
    { id: 'action' as const, label: 'Action', icon: Zap },
    { id: 'gestion' as const, label: 'Gestion', icon: Wallet },
    { id: 'profile' as const, label: 'Profil', icon: User },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 px-2 pb-6 pt-2 bg-white/90 dark:bg-black/90 backdrop-blur-xl border-t border-day-border dark:border-night-border shadow-[0_-10px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.3)]">
      <div className="flex justify-around items-center max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`flex flex-col items-center gap-1.5 flex-1 transition-all duration-300 py-1 ${
                isActive ? 'text-accent scale-105' : 'text-gray-400'
              }`}
            >
              <div className={`p-2 rounded-2xl transition-all duration-300 ${isActive ? 'bg-accent/10 shadow-inner' : 'hover:bg-gray-100 dark:hover:bg-white/5'}`}>
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={`text-[9px] font-black uppercase tracking-[0.1em] transition-all ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
