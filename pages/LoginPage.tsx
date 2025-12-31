import React, { useState, useEffect } from 'react';
import { Mail, Lock, ArrowRight, Loader2, ShieldCheck } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

import { supabase } from '../services/supabaseClient';

interface LoginPageProps {
  onLogin: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(document.documentElement.classList.contains('dark'));

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isSignUp) {
        const { data, error: authError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (authError) throw authError;
        if (data.user) {
          setMessage("Compte créé avec succès ! Vous pouvez maintenant vous connecter.");
          setIsSignUp(false);
        }
      } else {
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (authError) throw authError;

        if (data.user) {
          onLogin();
        }
      }
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-day-bg dark:bg-night-bg transition-colors duration-300">
      {/* Header discret avec Toggle Theme */}
      <div className="p-6 flex justify-end">
        <ThemeToggle />
      </div>

      <div className="flex-1 flex items-center justify-center px-6 pb-12">
        <div className="w-full max-w-md space-y-8 animate-in fade-in zoom-in duration-500">

          {/* Logo & Titre */}
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <img
                src={isDarkMode ? "/logo.png" : "/logo_light.png"}
                alt="Artiiz Logo"
                className="w-32 h-32 object-contain animate-pulse-slow"
              />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight">Artiiz</h1>
              <p className="text-gray-500 dark:text-gray-400 mt-2">
                {isSignUp ? "Créez votre compte professionnel" : "L'excellence au bout des doigts"}
              </p>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-xs font-bold animate-in fade-in slide-in-from-top-1">
              {error}
            </div>
          )}

          {message && (
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-2xl text-green-500 text-xs font-bold animate-in fade-in slide-in-from-top-1">
              {message}
            </div>
          )}

          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="space-y-4 bg-day-surface dark:bg-night-surface p-8 rounded-3xl border border-day-border dark:border-night-border shadow-xl">
            <div className="space-y-2">
              <label className="text-sm font-semibold ml-1">Email professionnel</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-accent transition-colors">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-12 pr-4 py-4 bg-day-bg dark:bg-night-bg border border-day-border dark:border-night-border rounded-xl focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all"
                  placeholder="nom@entreprise.fr"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-sm font-semibold">Mot de passe</label>
                {!isSignUp && (
                  <button type="button" className="text-xs text-accent font-bold hover:underline">Oublié ?</button>
                )}
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-accent transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-12 pr-4 py-4 bg-day-bg dark:bg-night-bg border border-day-border dark:border-night-border rounded-xl focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-accent hover:bg-accent/90 text-white rounded-xl font-bold shadow-lg shadow-accent/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70"
            >
              {isLoading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  {isSignUp ? "Créer un compte" : "Se connecter"}
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          {/* Footer Login */}
          <div className="text-center space-y-6">
            <p className="text-sm text-gray-500">
              {isSignUp ? (
                <>
                  Déjà un compte ?{' '}
                  <button
                    type="button"
                    onClick={() => setIsSignUp(false)}
                    className="text-accent font-bold hover:underline"
                  >
                    Se connecter
                  </button>
                </>
              ) : (
                <>
                  Pas encore de compte ?{' '}
                  <button
                    type="button"
                    onClick={() => setIsSignUp(true)}
                    className="text-accent font-bold hover:underline"
                  >
                    Créer un compte
                  </button>
                </>
              )}
            </p>

            <div className="flex items-center justify-center gap-2 text-[10px] text-gray-400 uppercase tracking-widest font-bold">
              <ShieldCheck size={14} />
              Connexion sécurisée Artiiz Cloud
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
