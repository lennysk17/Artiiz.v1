
import React, { useState, useEffect, useRef } from 'react';
import { Star, TrendingUp, MapPin, Sparkles, Loader2, ShieldAlert, Thermometer, Zap, Clock, Fuel, MessageSquare, Plus, CloudRain, Lock, ChevronRight, Wind } from 'lucide-react';
import { Review, UserProfile } from '../types';
import L from 'leaflet';
import { analyzeGoogleBusinessPresence } from '../services/geminiService';
import { supabase } from '../services/supabaseClient';

interface VisionDashboardProps {
  marketData: any;
  isAnalyzing: boolean;
  onRefresh: () => void;
  profile: UserProfile;
  onUpdateProfile: (p: UserProfile) => void;
}

const DEFAULT_LAT = 48.875;
const DEFAULT_LNG = 2.305;

const VisionDashboard: React.FC<VisionDashboardProps> = ({ marketData, isAnalyzing, onRefresh, profile, onUpdateProfile }) => {
  const [gmbData, setGmbData] = useState<any>(profile.gmbData || null);
  const [isGmbLoading, setIsGmbLoading] = useState(false);
  const [reviews, setReviews] = useState<Review[]>(profile.gmbData?.reviews || []);
  const [revenue, setRevenue] = useState<number>(0);
  const [avgTime, setAvgTime] = useState<string>('--');
  const [trendData, setTrendData] = useState<number[]>([]);
  const [isFinancesLoading, setIsFinancesLoading] = useState(true);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const influenceCircleRef = useRef<L.Circle | null>(null);
  const hotspotsGroupRef = useRef<L.LayerGroup | null>(null);

  const handleConnectGmb = async () => {
    setIsGmbLoading(true);
    const data = await analyzeGoogleBusinessPresence(profile.companyName);
    if (data) {
      setGmbData(data);
      if (data.reviews) setReviews(data.reviews);

      // Persistance réelle dans Supabase via le callback global
      onUpdateProfile({
        ...profile,
        gmbConnected: true,
        gmbData: data
      });
    }
    setIsGmbLoading(false);
  };

  const fetchFinances = async () => {
    setIsFinancesLoading(true);
    try {
      // 1. Chiffre d'Affaires
      const { data: invData, error: invError } = await supabase
        .from('invoices')
        .select('amount_ttc')
        .eq('status', 'paid');

      if (!invError && invData) {
        const total = invData.reduce((acc, inv) => acc + (Number(inv.amount_ttc) || 0), 0);
        setRevenue(total);
        const points = invData.slice(0, 7).reverse().map(inv => Number(inv.amount_ttc));
        setTrendData(points.length > 0 ? points : [0, 0, 0, 0, 0, 0]);
      }

      // 2. Temps Moyen (basé sur les interventions terminées)
      const { data: intData, error: intError } = await supabase
        .from('interventions')
        .select('created_at, updated_at')
        .eq('status', 'completed');

      if (!intError && intData && intData.length > 0) {
        const durations = intData.map(i => {
          const start = new Date(i.created_at).getTime();
          const end = new Date(i.updated_at).getTime();
          return (end - start) / (1000 * 60); // en minutes
        }).filter(d => d > 0);

        if (durations.length > 0) {
          const avg = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
          setAvgTime(`${avg}min`);
        }
      }
    } catch (err) {
      console.error("Erreur stats:", err);
    } finally {
      setIsFinancesLoading(false);
    }
  };

  useEffect(() => {
    fetchFinances();

    // Temps réel pour les paiements
    const channel = supabase
      .channel('finances-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'invoices' },
        () => fetchFinances()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const StatusLED = ({ color = 'accent', active = true, glow = true }: { color?: string, active?: boolean, glow?: boolean }) => {
    const colorClasses: Record<string, string> = {
      accent: 'bg-accent',
      green: 'bg-green-500',
      violet: 'bg-[#8B5CF6]',
      orange: 'bg-orange-500',
      gray: 'bg-gray-400'
    };

    const glowClasses: Record<string, string> = {
      accent: 'shadow-[0_0_15px_rgba(139,92,246,0.8)]',
      green: 'shadow-[0_0_15px_rgba(34,197,94,0.8)]',
      violet: 'shadow-[0_0_15px_rgba(139,92,246,0.8)]',
      orange: 'shadow-[0_0_15px_rgba(249,115,22,0.8)]',
      gray: ''
    };

    return (
      <div className={`w-3 h-3 rounded-full border border-white/30 transition-all duration-500 ${active ? colorClasses[color] : 'bg-gray-300'} ${active && glow ? glowClasses[color] : ''}`}></div>
    );
  };

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;
    const initialPos: L.LatLngExpression = [profile.lat || DEFAULT_LAT, profile.lng || DEFAULT_LNG];

    const map = L.map(mapContainerRef.current, {
      center: initialPos,
      zoom: 12,
      zoomControl: false,
      attributionControl: false
    });

    const isDark = document.documentElement.classList.contains('dark');
    L.tileLayer(isDark
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      { maxZoom: 19 }
    ).addTo(map);

    const baseIcon = L.divIcon({
      className: 'custom-base-marker',
      html: `<div class="flex items-center justify-center w-10 h-10 bg-[#8B5CF6] text-white rounded-full border-2 border-white shadow-xl relative">
        <div class="absolute inset-0 bg-[#8B5CF6] rounded-full animate-ping opacity-20"></div>
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
      </div>`,
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });

    L.marker(initialPos, { icon: baseIcon }).addTo(map);
    influenceCircleRef.current = L.circle(initialPos, {
      radius: (profile.influenceRadius || 10) * 1000,
      color: '#8B5CF6',
      fillColor: '#8B5CF6',
      fillOpacity: 0.05,
      weight: 1,
      dashArray: '5, 10'
    }).addTo(map);

    hotspotsGroupRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    return () => { if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; } };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current || !hotspotsGroupRef.current || !marketData?.hotspots) return;
    hotspotsGroupRef.current.clearLayers();
    marketData.hotspots.forEach((spot: any) => {
      const pulseIcon = L.divIcon({
        className: 'custom-hotspot',
        html: `<div class="relative flex items-center justify-center w-8 h-8"><div class="absolute hotspot-pulse w-full h-full bg-red-500 rounded-full opacity-50 animate-ping"></div><div class="absolute w-3 h-3 bg-red-600 rounded-full border-2 border-white shadow-lg"></div></div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });
      L.marker([spot.lat, spot.lng], { icon: pulseIcon }).addTo(hotspotsGroupRef.current!);
    });
  }, [marketData]);

  return (
    <div className="space-y-6 pb-24 lg:pb-12 animate-in fade-in duration-700">

      {/* 1. TOP BENTO - KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Rentabilité */}
        <div className="p-8 rounded-[40px] bg-white dark:bg-night-surface border border-gray-100 dark:border-night-border shadow-sm flex items-center justify-between group">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Rentabilité (CA)</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black tracking-tighter">
                {isFinancesLoading ? <Loader2 size={24} className="animate-spin text-gray-300" /> : `${revenue}€`}
              </span>
              <div className="flex flex-col">
                <span className="text-[10px] text-green-500 font-bold uppercase tracking-tighter">+{revenue > 0 ? '12' : '0'}%</span>
                <svg className="w-12 h-6 text-green-500 overflow-visible" viewBox="0 0 50 20">
                  <path
                    d={`M 0 ${20 - (trendData[0] || 0) % 20} ${trendData.map((v, i) => `L ${(i * 50) / (trendData.length - 1)} ${20 - (v % 20)}`).join(' ')}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-night-bg rounded-2xl">
            <StatusLED color="green" active={revenue > 0} />
          </div>
        </div>

        {/* Temps Moyen */}
        <div className="p-8 rounded-[40px] bg-white dark:bg-night-surface border border-gray-100 dark:border-night-border shadow-sm flex items-center justify-between group">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Temps Moyen</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black tracking-tighter">
                {isFinancesLoading ? <Loader2 size={24} className="animate-spin text-gray-300" /> : avgTime}
              </span>
              <span className="text-[10px] text-[#8B5CF6] font-black uppercase tracking-tighter flex items-center gap-1">
                {avgTime !== '--' ? <><TrendingUp size={12} /> Optimisé</> : 'En attente'}
              </span>
            </div>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-night-bg rounded-2xl">
            <StatusLED color="violet" />
          </div>
        </div>

        {/* Réputation */}
        <div className="p-8 rounded-[40px] bg-white dark:bg-night-surface border border-gray-100 dark:border-night-border shadow-sm flex items-center justify-between group">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Réputation Google</p>
            <div className="flex items-baseline gap-2">
              {gmbData ? (
                <>
                  <span className="text-4xl font-black tracking-tighter">{gmbData.rating}</span>
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => <Star key={i} size={8} className="text-yellow-400 fill-yellow-400" />)}
                  </div>
                </>
              ) : (
                <>
                  <span className="text-4xl font-black tracking-tighter text-gray-300">--</span>
                  <span className="text-[10px] text-orange-500 font-black uppercase tracking-tighter">+ Connectez GMB</span>
                </>
              )}
            </div>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-night-bg rounded-2xl">
            <StatusLED color={gmbData ? "orange" : "gray"} active={!!gmbData} />
          </div>
        </div>
      </div>

      {/* 2. MIDDLE BENTO - MAP & WEATHER */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map Section */}
        <div className="hidden lg:block lg:col-span-2 relative aspect-[16/9] bg-white dark:bg-night-surface rounded-[40px] overflow-hidden border border-gray-100 dark:border-night-border shadow-2xl group">
          <div ref={mapContainerRef} className="w-full h-full z-0 outline-none grayscale-[0.5] dark:grayscale-0 shadow-inner" />

          {/* Glass Badges */}
          <div className="absolute top-8 left-8 p-5 bg-white/40 dark:bg-black/40 backdrop-blur-xl rounded-3xl border border-white/40 shadow-xl flex items-center gap-4 z-[400]">
            <div className="w-12 h-12 bg-[#8B5CF6] rounded-2xl flex items-center justify-center text-white">
              <MapPin size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-[#8B5CF6] tracking-widest mb-0.5">Zone Maître</p>
              <p className="text-sm font-black dark:text-white uppercase truncate max-w-[150px]">{profile.companyName}</p>
            </div>
          </div>

          <button
            onClick={onRefresh}
            className="absolute bottom-8 right-8 px-8 py-5 bg-[#8B5CF6] text-white rounded-[24px] font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl shadow-purple-500/40 hover:scale-105 active:scale-95 transition-all flex items-center gap-3 z-[400]"
          >
            <Zap size={18} fill="currentColor" /> Analyser les risques
          </button>
        </div>

        {/* Weather & Alerts Section */}
        <div className="p-8 bg-white dark:bg-night-surface border border-gray-100 dark:border-night-border rounded-[40px] flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <CloudRain size={120} />
          </div>

          <div className="flex items-center gap-3 mb-8 relative">
            <div className="p-3 bg-blue-500/10 text-blue-500 rounded-2xl"><Thermometer size={20} /></div>
            <div>
              <h3 className="text-[11px] font-black uppercase tracking-[0.2em]">Météo & Urgences</h3>
              <p className="text-[9px] font-bold text-gray-400 uppercase">Alertes Réseau IDF</p>
            </div>
          </div>

          <div className="space-y-6 flex-1 relative">
            <div className="p-6 bg-blue-50/50 dark:bg-blue-500/5 rounded-[32px] border border-blue-100 dark:border-blue-500/10 min-h-[140px] flex items-center justify-center">
              <p className="text-[11px] font-bold text-gray-600 dark:text-gray-300 leading-relaxed italic">
                {isAnalyzing ? (
                  <span className="flex flex-col items-center gap-3 py-4 text-center">
                    <Loader2 size={24} className="animate-spin text-blue-500" />
                    Lia analyse les corrélations météo/pannes en cours...
                  </span>
                ) : (
                  marketData?.weatherAnalysis || "En attente de l'analyse météo pour votre zone. Cliquez sur 'Analyser les risques' pour lancer l'audit prédictif."
                )}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 dark:bg-night-bg rounded-2xl border border-gray-100 dark:border-night-border">
                <p className="text-[9px] font-black text-gray-400 uppercase mb-1 flex items-center gap-1"><CloudRain size={10} /> Humidité</p>
                <p className="text-sm font-black uppercase text-blue-600">{marketData?.humidity || "--"}</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-night-bg rounded-2xl border border-gray-100 dark:border-night-border">
                <p className="text-[9px] font-black text-gray-400 uppercase mb-1 flex items-center gap-1"><Wind size={10} /> Risque Gel</p>
                <p className={`text-sm font-black uppercase ${marketData?.gelRisk === 'Élevé' ? 'text-red-500' : 'text-gray-700'}`}>{marketData?.gelRisk || "--"}</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1">Secteurs Flash :</p>
              <div className="space-y-2 max-h-[120px] overflow-y-auto no-scrollbar">
                {marketData?.hotspots?.map((spot: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-red-500/5 border border-red-500/10 rounded-xl animate-in fade-in slide-in-from-right-2" style={{ animationDelay: `${i * 100}ms` }}>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase">{spot.name}</span>
                      <span className="text-[8px] text-gray-500 font-bold">{spot.reason}</span>
                    </div>
                    <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase ${spot.intensity === 'Urgence' ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-orange-400 text-white'}`}>
                      {spot.intensity || 'Alerte'}
                    </span>
                  </div>
                )) || (
                    <div className="text-[10px] font-bold text-gray-400 text-center py-6 italic border border-dashed border-gray-200 rounded-xl">
                      Aucune alerte active
                    </div>
                  )}
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100 dark:border-night-border">
            <p className="text-[10px] font-bold text-blue-500 text-center leading-tight">
              {marketData?.strategyAdvice ? `"${marketData.strategyAdvice}"` : '"Lia prépare votre stratégie d\'intervention..."'}
            </p>
          </div>

          <button className="w-full mt-4 py-4 bg-blue-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all">
            Prioriser les urgences
          </button>
        </div>
      </div>

      {/* 3. CONDITIONAL LOWER BENTO - GMB LOCK OR COACH */}
      {!gmbData ? (
        <div className="relative p-12 bg-white dark:bg-night-surface rounded-[40px] border border-gray-100 dark:border-night-border shadow-sm overflow-hidden group">
          <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-orange-500/10 to-transparent pointer-events-none"></div>
          <div className="relative flex flex-col lg:flex-row items-center justify-between gap-8 z-10">
            <div className="space-y-4 max-w-xl text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/10 text-orange-600 rounded-full border border-orange-500/20">
                <Lock size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">Section Verrouillée</span>
              </div>
              <h2 className="text-3xl font-black tracking-tight leading-tight">
                Connectez <span className="text-orange-500 uppercase">Google My Business</span> pour débloquer votre IA Coach
              </h2>
              <p className="text-sm font-medium text-gray-500 leading-relaxed">
                Notre IA a besoin de vos données réelles pour analyser votre fiche et vous faire monter en haut du classement. Activez l'accélérateur SEO dès maintenant.
              </p>
            </div>

            <button
              onClick={handleConnectGmb}
              disabled={isGmbLoading}
              className="px-10 py-6 bg-orange-500 text-white rounded-[32px] font-black text-[12px] uppercase tracking-[0.2em] shadow-2xl shadow-orange-500/40 hover:scale-105 active:scale-95 transition-all flex items-center gap-4 disabled:opacity-50"
            >
              {isGmbLoading ? <Loader2 className="animate-spin" size={20} /> : <MessageSquare size={20} />}
              Connecter ma fiche
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-8 duration-700">
          <div className="lg:col-span-1 p-8 bg-day-surface dark:bg-night-surface border border-accent/20 rounded-[40px] shadow-sm flex flex-col">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-accent/10 text-accent rounded-2xl"><Sparkles size={20} /></div>
              <div>
                <h3 className="text-[11px] font-black uppercase tracking-widest">IA Coach</h3>
                <p className="text-[9px] font-bold text-gray-400 uppercase">Optimisation SEO</p>
              </div>
            </div>
            <div className="flex-1 space-y-6">
              <div className="p-5 bg-accent/5 rounded-[28px] border border-accent/20">
                <p className="text-xs font-bold text-gray-600 dark:text-gray-300 leading-relaxed italic">
                  "{gmbData.coachAdvice}"
                </p>
              </div>
              <div className="pt-6 mt-auto border-t border-day-border dark:border-night-border flex justify-between items-center">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Score de Confiance</span>
                <span className="text-sm font-black text-accent tracking-tighter">{gmbData.score}/100</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="flex justify-between items-center px-4">
              <div className="flex items-center gap-2">
                <MessageSquare size={16} className="text-accent" />
                <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Derniers Avis Vérifiés</h2>
              </div>
              <button className="text-[10px] font-black text-accent uppercase tracking-widest flex items-center gap-1">Voir tout <ChevronRight size={14} /></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reviews.map((review) => (
                <div key={review.id} className="p-6 bg-white dark:bg-night-surface border border-gray-100 dark:border-night-border rounded-[32px] shadow-sm space-y-4 group hover:border-accent transition-all">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={10} className={`${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`} />
                      ))}
                    </div>
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider">{review.date}</span>
                  </div>
                  <p className="text-sm font-bold text-gray-700 dark:text-gray-300 italic leading-relaxed truncate">
                    "{review.text}"
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-gray-50 dark:bg-night-bg flex items-center justify-center text-[10px] font-black text-accent border border-gray-100 dark:border-night-border">
                      {review.author[0]}
                    </div>
                    <span className="text-[10px] font-black uppercase text-gray-500">{review.author}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VisionDashboard;
