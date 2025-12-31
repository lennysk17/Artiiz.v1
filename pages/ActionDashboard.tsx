
import React, { useState, useEffect } from 'react';
import { Zap, Link as LinkIcon, Camera, MapPin, Send, CheckCircle2, ShieldCheck, Clock, Download, ChevronRight, LayoutList, History, Eye, ListFilter, User as UserIcon, X, FileText } from 'lucide-react';
import { UserProfile, Intervention } from '../types';
import { supabase } from '../services/supabaseClient';

interface ActionDashboardProps {
  profile: UserProfile;
  onNavigate: (view: any) => void;
}

const ActionDashboard: React.FC<ActionDashboardProps> = ({ profile, onNavigate }) => {
  const [diagId, setDiagId] = useState('');
  const [trackingId, setTrackingId] = useState('');
  const [copiedDiag, setCopiedDiag] = useState(false);
  const [copiedTrack, setCopiedTrack] = useState(false);
  const [showAllInterventions, setShowAllInterventions] = useState(false);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // States pour nouvelle intervention rapide
  const [newClient, setNewClient] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const [selectedIntervention, setSelectedIntervention] = useState<any>(null);

  const fetchInterventions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('interventions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setInterventions(data.map(i => ({
          id: i.id,
          client: i.client_name,
          location: i.location || 'Lieu non précisé',
          time: new Date(i.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: i.status as any,
          type: i.intervention_type || 'Dépannage',
          photos: i.diag_photos || [],
          raw: i
        })));
      }
    } catch (err) {
      console.error("Erreur interventions:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInterventions();

    // Abonnement Temps Réel pour les photos et nouveaux clients
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'interventions'
        },
        () => {
          fetchInterventions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const createIntervention = async (type: 'Diag' | 'Suivi') => {
    if (!newClient.trim()) {
      alert("Veuillez entrer le nom du client avant de générer un lien.");
      return;
    }

    setIsCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Calcul des expirations
      const now = new Date();
      const trackExpires = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24h
      const diagExpires = new Date(now.getTime() + 2 * 1000 * 60 * 60); // 2h

      const { data, error } = await supabase
        .from('interventions')
        .insert({
          user_id: user.id,
          client_name: newClient,
          intervention_type: type === 'Diag' ? 'Diagnostic' : 'Dépannage',
          location: 'À préciser',
          status: 'ongoing',
          track_expires_at: trackExpires.toISOString(),
          diag_expires_at: diagExpires.toISOString(),
          scheduled_at: now.toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        if (type === 'Diag') {
          setDiagId(data.id);
        } else {
          setTrackingId(data.id);
        }
      }

      fetchInterventions();
      setNewClient(''); // Reset après création
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la création de la mission.");
    } finally {
      setIsCreating(false);
    }
  };

  const copyToClipboard = (text: string, type: 'diag' | 'track') => {
    navigator.clipboard.writeText(text);
    if (type === 'diag') {
      setCopiedDiag(true);
      setTimeout(() => setCopiedDiag(false), 2000);
    } else {
      setCopiedTrack(true);
      setTimeout(() => setCopiedTrack(false), 2000);
    }
  };

  const exportInterventions = () => {
    const csvContent = "ID,Client,Lieu,Heure,Type\n" +
      interventions.map(i => `${i.id},${i.client},${i.location},${i.time},${i.type}`).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `artiiz_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const displayedInterventions = showAllInterventions ? interventions : interventions.slice(0, 3);

  return (
    <div className="space-y-10 pb-24 lg:pb-12 animate-in slide-in-from-right duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Artiiz Action</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Pilotage des interventions terrain</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={exportInterventions}
            className="p-4 bg-day-surface dark:bg-night-surface border border-day-border dark:border-night-border rounded-2xl text-gray-500 hover:text-accent transition-colors shadow-sm"
            title="Exporter l'historique"
          >
            <Download size={24} />
          </button>
          <div className="w-12 h-12 bg-accent rounded-2xl flex items-center justify-center text-white shadow-xl shadow-accent/30">
            <Zap size={24} fill="currentColor" />
          </div>
        </div>
      </div>

      {/* Quick Access Client Input */}
      <div className="p-8 bg-accent/5 border border-accent/20 rounded-[32px] space-y-4 shadow-sm animate-in fade-in slide-in-from-top-2">
        <label className="text-[10px] font-black text-accent uppercase tracking-widest flex items-center gap-2">
          <UserIcon size={12} /> Client de la nouvelle mission
        </label>
        <input
          value={newClient}
          onChange={(e) => setNewClient(e.target.value)}
          placeholder="Ex: M. Jean Dupont"
          className="w-full bg-white dark:bg-night-surface border border-day-border dark:border-night-border p-4 rounded-xl font-bold focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all"
        />
      </div>

      {/* Main Grid Operations */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">

        {/* LINKS GENERATION SECTION */}
        <div className="space-y-6">
          <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
            <LayoutList size={14} /> Génération de Liens
          </h2>

          <div className="grid grid-cols-1 gap-4">
            {/* Tracking Link - TOP SPACE */}
            <div className="p-8 rounded-[32px] bg-day-surface dark:bg-night-surface border border-day-border dark:border-night-border shadow-sm group hover:border-accent transition-all relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 rounded-bl-full pointer-events-none"></div>
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-purple-500/10 text-purple-500 rounded-2xl"><MapPin size={28} /></div>
                <div>
                  <h3 className="font-black text-lg">Lien de Suivi Direct</h3>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Partagez votre arrivée en temps réel</p>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-night-bg/50 p-4 rounded-2xl border border-dashed border-gray-300 dark:border-night-border">
                {trackingId ? (
                  <div className="flex flex-col md:flex-row gap-3">
                    <div className="flex-1 p-3 bg-white dark:bg-night-surface border border-day-border dark:border-night-border rounded-xl font-mono text-[10px] flex items-center truncate">
                      {window.location.origin}/track/{trackingId}
                    </div>
                    <button onClick={() => copyToClipboard(`${window.location.origin}/track/${trackingId}`, 'track')} className={`px-6 py-3 rounded-xl text-white font-black text-xs uppercase transition-all shadow-lg ${copiedTrack ? 'bg-green-500' : 'bg-accent'}`}>
                      {copiedTrack ? 'Copié' : 'Copier'}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => createIntervention('Suivi')}
                    disabled={isCreating}
                    className="w-full py-4 bg-accent/10 text-accent hover:bg-accent hover:text-white font-black rounded-xl transition-all uppercase text-xs tracking-widest disabled:opacity-50"
                  >
                    {isCreating ? 'Création...' : 'Générer Lien Suivi'}
                  </button>
                )}
              </div>
            </div>

            {/* Diagnostic Link */}
            <div className="p-8 rounded-[32px] bg-day-surface dark:bg-night-surface border border-day-border dark:border-night-border shadow-sm group hover:border-accent transition-all relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-full pointer-events-none"></div>
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-blue-500/10 text-blue-500 rounded-2xl"><LinkIcon size={28} /></div>
                <div>
                  <h3 className="font-black text-lg">Lien Diagnostic Client</h3>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Récolte photos & description</p>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-night-bg/50 p-4 rounded-2xl border border-dashed border-gray-300 dark:border-night-border">
                {diagId ? (
                  <div className="flex flex-col md:flex-row gap-3">
                    <div className="flex-1 p-3 bg-white dark:bg-night-surface border border-day-border dark:border-night-border rounded-xl font-mono text-[10px] flex items-center truncate">
                      {window.location.origin}/diag/{diagId}
                    </div>
                    <button onClick={() => copyToClipboard(`${window.location.origin}/diag/${diagId}`, 'diag')} className={`px-6 py-3 rounded-xl text-white font-black text-xs uppercase transition-all shadow-lg ${copiedDiag ? 'bg-green-500' : 'bg-accent'}`}>
                      {copiedDiag ? 'Copié' : 'Copier'}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => createIntervention('Diag')}
                    disabled={isCreating}
                    className="w-full py-4 bg-accent/10 text-accent hover:bg-accent hover:text-white font-black rounded-xl transition-all uppercase text-xs tracking-widest disabled:opacity-50"
                  >
                    {isCreating ? 'Création...' : 'Générer Lien Diagnostic'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* HISTORY SECTION */}
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <History size={14} /> Historique des Missions
            </h2>
            <button
              onClick={() => setShowAllInterventions(!showAllInterventions)}
              className="text-[10px] font-black text-accent uppercase tracking-widest flex items-center gap-1 hover:underline"
            >
              {showAllInterventions ? 'REPLIER' : 'VOIR TOUT'} <ChevronRight size={10} />
            </button>
          </div>

          <div className="space-y-4">
            {displayedInterventions.length > 0 ? displayedInterventions.map(i => (
              <div
                key={i.id}
                onClick={() => setSelectedIntervention(i)}
                className="p-6 bg-day-surface dark:bg-night-surface border border-day-border dark:border-night-border rounded-3xl shadow-sm flex items-center gap-4 group hover:border-accent transition-all cursor-pointer"
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${i.photos?.length > 0 ? 'bg-green-500/10 text-green-500' : 'bg-gray-50 dark:bg-night-bg text-gray-400'
                  }`}>
                  {i.photos?.length > 0 ? <Camera size={24} /> : <CheckCircle2 size={24} />}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between">
                    <p className="font-black text-sm">{i.client}</p>
                    <span className="text-[10px] text-gray-400 uppercase font-black">{i.time}</span>
                  </div>
                  <p className="text-xs text-gray-500">{i.location} • {i.type}</p>
                </div>
                {i.photos?.length > 0 && (
                  <div className="p-1 px-2 bg-accent/10 text-accent text-[8px] font-black rounded-lg uppercase tracking-tighter">
                    PHOTOS REÇUES
                  </div>
                )}
                <button className="p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Eye size={18} className="text-accent" />
                </button>
              </div>
            )) : (
              <div className="p-12 text-center bg-gray-50 dark:bg-night-surface rounded-[40px] border border-dashed border-gray-200">
                <p className="text-sm font-bold text-gray-400 italic">Aucune mission enregistrée</p>
              </div>
            )}
          </div>

          {/* Modal de Détails Intervention */}
          {selectedIntervention && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
              <div className="bg-white dark:bg-night-surface w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-8 border-b border-gray-100 dark:border-night-border flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-black tracking-tight">{selectedIntervention.client}</h2>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{selectedIntervention.type} • {selectedIntervention.time}</p>
                  </div>
                  <button onClick={() => setSelectedIntervention(null)} className="p-3 bg-gray-50 dark:bg-night-bg rounded-full hover:bg-gray-100 transition-colors">
                    <X size={24} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">
                  {/* Photos de diagnostic */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <Camera size={14} /> Photos reçues du client
                    </h3>
                    {selectedIntervention.photos?.length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {selectedIntervention.photos.map((url: string, idx: number) => (
                          <div key={idx} className="aspect-square rounded-3xl overflow-hidden border border-gray-100 shadow-sm hover:scale-105 transition-transform cursor-zoom-in">
                            <img src={url} alt={`photo-${idx}`} className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-12 bg-gray-50 dark:bg-night-bg rounded-3xl border border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400">
                        <Camera size={40} className="mb-2 opacity-20" />
                        <p className="text-[10px] font-black uppercase tracking-widest">Aucune photo reçue</p>
                      </div>
                    )}
                  </div>

                  {/* Actions Rapides */}
                  <div className="p-8 bg-accent/5 rounded-[40px] border border-accent/10 space-y-4">
                    <p className="text-sm font-bold text-accent italic">
                      "Prochaine étape conseillée : Générer le devis basé sur ces éléments."
                    </p>
                  </div>
                </div>

                <div className="p-8 bg-gray-50 dark:bg-night-bg/50 border-t border-gray-100 dark:border-night-border flex flex-col md:flex-row gap-4">
                  <button
                    onClick={() => {
                      onNavigate('gestion');
                      setSelectedIntervention(null);
                    }}
                    className="flex-1 py-5 bg-accent text-white rounded-3xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-accent/20 hover:scale-[1.02] transition-all"
                  >
                    <FileText size={20} /> Créer le Devis
                  </button>
                  <button
                    onClick={() => setSelectedIntervention(null)}
                    className="flex-1 py-5 bg-white dark:bg-night-surface border border-gray-200 dark:border-night-border rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-gray-50 transition-all"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="p-6 rounded-3xl bg-accent/5 border border-accent/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center text-[10px] font-black">74</div>
              <p className="text-xs font-bold text-accent uppercase tracking-wider">Interventions ce mois-ci</p>
            </div>
            <ListFilter size={18} className="text-accent" />
          </div>
        </div>
      </div>

      {/* PHOTOS GRID - AT THE BOTTOM */}
      <div className="space-y-6">
        <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
          <Camera size={14} /> Flux Photos Diagnostic
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div
            onClick={() => createIntervention('Diag')}
            className="aspect-square rounded-[32px] bg-day-surface dark:bg-night-surface border-2 border-dashed border-gray-300 dark:border-night-border flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-accent hover:text-accent transition-all group cursor-pointer"
          >
            <Camera size={32} />
            <span className="text-[10px] font-black uppercase tracking-widest">Nouveau</span>
          </div>

          {interventions.flatMap(inter =>
            (inter.photos || []).map((url: string, idx: number) => ({
              url,
              client: inter.client,
              intervention: inter
            }))
          ).slice(0, 11).map((photo, i) => (
            <div
              key={`${photo.client}-${i}`}
              onClick={() => setSelectedIntervention(photo.intervention)}
              className="aspect-square rounded-[32px] overflow-hidden border border-day-border dark:border-night-border shadow-sm group relative cursor-pointer"
            >
              <img src={photo.url} alt="job" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity p-2 text-center">
                <span className="text-[8px] font-black text-white uppercase tracking-widest mb-1">{photo.client}</span>
                <span className="text-[10px] font-black text-white uppercase tracking-widest">Visualiser</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ActionDashboard;
