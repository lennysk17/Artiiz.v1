
import React, { useState, useRef, useEffect } from 'react';
import { UserProfile } from '../types';
import { Camera, Save, Building2, User, MapPin, Hash, CheckCircle2, Zap, Target, Loader2, Search, AlertCircle, Navigation, Map as MapIcon, Info } from 'lucide-react';

interface ProfilePageProps {
  profile: UserProfile;
  onSave: (profile: UserProfile) => void;
}

const IDF_DEPARTMENTS = [
  { id: '75', name: 'Paris' },
  { id: '77', name: 'Seine-et-Marne' },
  { id: '78', name: 'Yvelines' },
  { id: '91', name: 'Essonne' },
  { id: '92', name: 'Hauts-de-Seine' },
  { id: '93', name: 'Seine-Saint-Denis' },
  { id: '94', name: 'Val-de-Marne' },
  { id: '95', name: 'Val-d\'Oise' },
];

const ProfilePage: React.FC<ProfilePageProps> = ({ profile, onSave }) => {
  const [formData, setFormData] = useState<UserProfile>(profile);
  const [saved, setSaved] = useState(false);
  const [addressSearch, setAddressSearch] = useState(profile.companyAddress);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAddressVerified, setIsAddressVerified] = useState(true);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const searchTimeout = useRef<any>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'logoUrl' | 'avatarUrl') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, [field]: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const searchAddress = async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=5`);
      const data = await res.json();
      setSuggestions(data.features || []);
    } catch (e) {
      console.error("Erreur recherche adresse:", e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setAddressSearch(val);
    setIsAddressVerified(false);

    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => searchAddress(val), 300);
  };

  const selectSuggestion = (feature: any) => {
    const props = feature.properties;
    const coords = feature.geometry.coordinates; // [lng, lat]

    if (!coords || coords.length < 2) return;

    const lat = Number(coords[1]);
    const lng = Number(coords[0]);

    if (isNaN(lat) || isNaN(lng)) {
      console.error("Coordonnées invalides reçues de l'API");
      return;
    }

    const fullAddress = props.label;

    setFormData({
      ...formData,
      companyAddress: fullAddress,
      lat: lat,
      lng: lng
    });
    setAddressSearch(fullAddress);
    setSuggestions([]);
    setIsAddressVerified(true);
  };

  const toggleDepartment = (deptId: string) => {
    const current = formData.selectedDepartments || [];
    if (current.includes(deptId)) {
      setFormData({ ...formData, selectedDepartments: current.filter(id => id !== deptId) });
    } else if (current.length < 3) {
      setFormData({ ...formData, selectedDepartments: [...current, deptId] });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAddressVerified) return;

    onSave(formData);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Configuration Profil</h1>
          <p className="text-gray-500 dark:text-gray-400">Identité visuelle et zone d'intervention</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          {/* Card Photo de Profil (Avatar) */}
          <div className="p-6 bg-day-surface dark:bg-night-surface border border-day-border dark:border-night-border rounded-[32px] flex flex-col items-center text-center space-y-4 shadow-sm">
            <div
              onClick={() => avatarInputRef.current?.click()}
              className="relative w-32 h-32 rounded-full bg-gray-50 dark:bg-night-bg border border-day-border dark:border-night-border flex items-center justify-center overflow-hidden cursor-pointer group hover:border-accent transition-all ring-4 ring-accent/5"
            >
              {formData.avatarUrl ? (
                <img src={formData.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User size={32} className="text-gray-400 group-hover:text-accent" />
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[10px] font-black uppercase tracking-widest">
                Modifier
              </div>
            </div>
            <input type="file" ref={avatarInputRef} onChange={(e) => handleFileUpload(e, 'avatarUrl')} accept="image/*" className="hidden" />
            <div>
              <h3 className="font-black text-xs uppercase tracking-tight">Votre Portrait</h3>
              <p className="text-[10px] text-gray-400 mt-1 leading-tight px-4">S'affiche sur Trakiiz pour rassurer le client</p>
            </div>
          </div>

          {/* Card Logo */}
          <div className="p-6 bg-day-surface dark:bg-night-surface border border-day-border dark:border-night-border rounded-[32px] flex flex-col items-center text-center space-y-4 shadow-sm">
            <div
              onClick={() => logoInputRef.current?.click()}
              className="relative w-28 h-28 rounded-2xl bg-gray-50 dark:bg-night-bg border border-day-border dark:border-night-border flex items-center justify-center overflow-hidden cursor-pointer group hover:border-accent transition-all"
            >
              {formData.logoUrl ? (
                <img src={formData.logoUrl} alt="Logo" className="w-full h-full object-contain p-2" />
              ) : (
                <Building2 size={28} className="text-gray-400 group-hover:text-accent" />
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[10px] font-black uppercase tracking-widest">
                Modifier
              </div>
            </div>
            <input type="file" ref={logoInputRef} onChange={(e) => handleFileUpload(e, 'logoUrl')} accept="image/*" className="hidden" />
            <div>
              <h3 className="font-black text-xs uppercase tracking-tight">Logo Entreprise</h3>
              <p className="text-[10px] text-gray-400 mt-1 leading-tight px-4">S'affiche sur vos Devis et Factures</p>
            </div>
          </div>

          {/* Card Zone Influence (Radius) */}
          <div className="p-6 bg-day-surface dark:bg-night-surface border border-day-border dark:border-night-border rounded-[32px] shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/10 text-accent rounded-xl"><Zap size={18} /></div>
              <h3 className="font-black text-[11px] uppercase tracking-widest">Rayon d'Urgence</h3>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-2xl font-black text-accent">{formData.influenceRadius} km</span>
                <Target size={20} className="text-accent/30" />
              </div>
              <input
                type="range"
                min="1"
                max="50"
                step="1"
                value={formData.influenceRadius}
                onChange={(e) => setFormData({ ...formData, influenceRadius: parseInt(e.target.value) })}
                className="w-full h-2 bg-gray-200 dark:bg-night-bg rounded-lg appearance-none cursor-pointer accent-accent"
              />
              <p className="text-[8px] font-black text-gray-400 uppercase text-center">Rayon max pour interventions flash (IDF)</p>
            </div>
          </div>

          {/* Stats de déplacement Info */}
          <div className="p-6 bg-blue-500/5 border border-blue-500/10 rounded-[32px] space-y-4">
            <div className="flex items-center gap-2 text-blue-500">
              <Info size={16} />
              <h3 className="text-[10px] font-black uppercase tracking-widest">Réalité IDF</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-bold">
                <span className="text-gray-500">Distance moy.</span>
                <span className="text-blue-600">9 km</span>
              </div>
              <div className="flex justify-between text-[10px] font-bold">
                <span className="text-gray-500">Cible Urgence</span>
                <span className="text-blue-600">-30 min</span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="p-8 bg-day-surface dark:bg-night-surface border border-day-border dark:border-night-border rounded-[32px] shadow-sm space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><Building2 size={12} /> Nom Commercial</label>
                <input
                  value={formData.companyName}
                  onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                  className="w-full bg-day-bg dark:bg-night-bg border border-day-border dark:border-night-border p-4 rounded-xl font-bold focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><User size={12} /> Dirigeant</label>
                <input
                  value={formData.directorName}
                  onChange={e => setFormData({ ...formData, directorName: e.target.value })}
                  className="w-full bg-day-bg dark:bg-night-bg border border-day-border dark:border-night-border p-4 rounded-xl font-bold focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all"
                  required
                />
              </div>
            </div>

            {/* Barre de recherche d'adresse */}
            <div className="space-y-2 relative">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <MapPin size={12} /> Siège Social (GPS)
                </label>
                {isAddressVerified ? (
                  <span className="flex items-center gap-1 text-[9px] font-black text-green-500 uppercase tracking-[0.1em] bg-green-500/10 px-2.5 py-1 rounded-full border border-green-500/20">
                    <CheckCircle2 size={10} /> Certifiée
                  </span>
                ) : addressSearch.length > 0 && (
                  <span className="flex items-center gap-1 text-[9px] font-black text-orange-500 uppercase tracking-[0.1em] bg-orange-500/10 px-2.5 py-1 rounded-full border border-orange-500/20 animate-pulse">
                    <AlertCircle size={10} /> Sélectionnez l'adresse
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  value={addressSearch}
                  onChange={handleAddressChange}
                  placeholder="Ex: 12 bis Avenue des Champs-Élysées, 75008 Paris"
                  className={`w-full bg-day-bg dark:bg-night-bg border ${isAddressVerified ? 'border-day-border dark:border-night-border' : 'border-orange-500'} p-4 pl-12 rounded-xl font-bold focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all`}
                  required
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  {isSearching ? <Loader2 size={18} className="animate-spin text-accent" /> : <Search size={18} />}
                </div>
              </div>
              {suggestions.length > 0 && (
                <div className="absolute z-[100] w-full mt-2 bg-day-surface dark:bg-night-surface border border-day-border dark:border-night-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <div className="max-h-72 overflow-y-auto no-scrollbar">
                    {suggestions.map((s, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => selectSuggestion(s)}
                        className="w-full text-left p-4 hover:bg-accent group transition-all border-b border-day-border dark:border-night-border last:border-0 flex items-start gap-4"
                      >
                        <div className="p-2.5 bg-gray-100 dark:bg-night-bg rounded-xl group-hover:bg-white/20 transition-colors shadow-sm">
                          <Navigation size={16} className="text-accent group-hover:text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-black group-hover:text-white transition-colors">{s.properties.name}</p>
                          <p className="text-[11px] text-gray-500 group-hover:text-white/70 transition-colors">{s.properties.postcode} {s.properties.city}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sélecteur de Départements - ZONE MAITRE */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <MapIcon size={12} /> Zone Maître (Max 3)
                </label>
                <span className="text-[10px] font-black text-accent uppercase tracking-widest">{formData.selectedDepartments?.length || 0} / 3 sélectionnés</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {IDF_DEPARTMENTS.map((dept) => {
                  const isSelected = formData.selectedDepartments?.includes(dept.id);
                  const isFull = (formData.selectedDepartments?.length || 0) >= 3;
                  return (
                    <button
                      key={dept.id}
                      type="button"
                      disabled={!isSelected && isFull}
                      onClick={() => toggleDepartment(dept.id)}
                      className={`p-3 rounded-2xl border transition-all flex flex-col items-center gap-1 group ${isSelected
                          ? 'bg-accent border-accent text-white shadow-lg shadow-accent/20'
                          : 'bg-day-bg dark:bg-night-bg border-day-border dark:border-night-border text-gray-500 hover:border-accent disabled:opacity-30 disabled:hover:border-day-border'
                        }`}
                    >
                      <span className="text-xs font-black">{dept.id}</span>
                      <span className={`text-[8px] font-bold uppercase tracking-tight text-center leading-none ${isSelected ? 'text-white/80' : 'text-gray-400'}`}>{dept.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-6 flex flex-col md:flex-row justify-end gap-4 items-center">
              <button
                type="submit"
                disabled={!isAddressVerified}
                className={`w-full md:w-auto px-10 py-4 ${isAddressVerified ? 'bg-accent shadow-accent/20 hover:scale-105 active:scale-95 cursor-pointer' : 'bg-gray-200 dark:bg-white/5 text-gray-400 cursor-not-allowed opacity-60'} text-white rounded-2xl font-black text-sm uppercase shadow-xl flex items-center justify-center gap-3 transition-all`}
              >
                {saved ? <CheckCircle2 size={20} /> : <Save size={20} />}
                {saved ? 'Changements Enregistrés' : 'Valider ma Zone Maître'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ProfilePage;
