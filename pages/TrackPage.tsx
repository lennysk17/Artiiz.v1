
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Phone, MessageSquare, Truck, Home, Star, AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import L from 'leaflet';

const TrackPage: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [intervention, setIntervention] = useState<any>(null);
    const [plumber, setPlumber] = useState<any>(null);
    const [eta, setEta] = useState(12);

    useEffect(() => {
        const fetchData = async () => {
            if (!token) return;

            try {
                const { data: inter, error: interError } = await supabase
                    .from('interventions')
                    .select('*, profiles(*)')
                    .eq('id', token)
                    .single();

                if (interError || !inter) {
                    setError("Lien invalide ou mission introuvable.");
                    return;
                }

                // Check expiration
                if (inter.track_expires_at && new Date(inter.track_expires_at) < new Date()) {
                    setError("Ce lien a expiré.");
                    return;
                }

                setIntervention(inter);
                setPlumber(inter.profiles);

                // Notification logic (simulate event)
                console.log("Client opened tracking page for intervention", token);
            } catch (err) {
                setError("Une erreur est survenue.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [token]);

    useEffect(() => {
        if (!intervention) return;

        const mapElement = document.getElementById('map-track');
        if (!mapElement) return;

        const clientPos: L.LatLngExpression = [48.835, 2.33]; // Sample client pos
        const initialPlumberPos: L.LatLngExpression = [48.85, 2.35]; // Sample initial plumber pos

        const map = L.map('map-track', {
            center: [48.842, 2.34],
            zoom: 13,
            zoomControl: false,
            attributionControl: false
        });

        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png').addTo(map);

        const clientIcon = L.divIcon({
            className: 'custom-home-marker',
            html: `<div class="p-2 bg-white rounded-full border-2 border-accent text-accent shadow-lg"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16]
        });

        const truckIcon = L.divIcon({
            className: 'custom-truck-marker',
            html: `
        <div class="relative flex items-center justify-center">
          <div class="absolute w-12 h-12 bg-accent/20 rounded-full animate-ping"></div>
          <div class="relative p-2.5 bg-accent text-white rounded-xl shadow-xl border-2 border-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-5l-4-4h-3v10"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>
          </div>
        </div>
      `,
            iconSize: [40, 40],
            iconAnchor: [20, 20]
        });

        L.marker(clientPos, { icon: clientIcon }).addTo(map);
        const plumberMarker = L.marker(initialPlumberPos, { icon: truckIcon }).addTo(map);

        // Simulation of movement
        let step = 0;
        const interval = setInterval(() => {
            step += 0.0001;
            const newPos: L.LatLngExpression = [48.85 - step, 2.35 - step * 0.5];
            plumberMarker.setLatLng(newPos);
            if (step > 0.015) clearInterval(interval);
        }, 2000);

        return () => {
            clearInterval(interval);
            map.remove();
        };
    }, [intervention]);

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-white">
                <Loader2 className="animate-spin text-accent" size={40} />
                <p className="mt-4 font-black text-xs uppercase tracking-widest text-gray-400">Localisation Expert...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-8 text-center">
                <div className="w-20 h-20 bg-red-100 text-red-500 rounded-3xl flex items-center justify-center mb-6">
                    <AlertTriangle size={40} />
                </div>
                <h1 className="text-xl font-black mb-2 tracking-tight">Accès Impossible</h1>
                <p className="text-gray-500 text-sm font-medium">{error}</p>
                <button onClick={() => window.location.reload()} className="mt-8 px-8 py-4 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest">
                    Réessayer
                </button>
            </div>
        );
    }

    return (
        <div className="h-screen w-full flex flex-col overflow-hidden bg-white">
            {/* Header Plombier */}
            <header className="absolute top-4 left-4 right-4 z-[400] p-4 bg-white/95 backdrop-blur-md border border-gray-100 rounded-3xl shadow-xl flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-accent/20">
                            <img src={plumber?.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=plumber"} alt="Pro" className="w-full h-full object-cover" />
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white rounded-full flex items-center justify-center">
                            <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                        </div>
                    </div>
                    <div>
                        <h3 className="text-sm font-black tracking-tight">{plumber?.director_name || "Votre Expert"}</h3>
                        <div className="flex items-center gap-1">
                            <div className="flex">
                                {[...Array(5)].map((_, i) => <Star key={i} size={10} className="text-yellow-400 fill-yellow-400" />)}
                            </div>
                            <span className="text-[10px] font-black text-gray-400 ml-1">4.9/5</span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <a href="tel:0600000000" className="w-10 h-10 bg-accent text-white rounded-xl flex items-center justify-center shadow-lg shadow-accent/20 active:scale-90 transition-transform">
                        <Phone size={18} />
                    </a>
                    <a href="sms:0600000000" className="w-10 h-10 bg-day-bg text-gray-500 rounded-xl flex items-center justify-center border border-gray-100 active:scale-90 transition-transform">
                        <MessageSquare size={18} />
                    </a>
                </div>
            </header>

            {/* Carte Full Screen */}
            <div id="map-track" className="flex-1 w-full bg-gray-100 z-0" />

            {/* ETA Card Floattante */}
            <div className="absolute bottom-6 left-6 right-6 z-[400]">
                <div className="p-6 bg-white rounded-[32px] shadow-2xl border border-gray-100 space-y-4 animate-in slide-in-from-bottom-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Temps d'attente estimé</p>
                            <div className="flex items-baseline gap-2 mt-1">
                                <span className="text-4xl font-black tracking-tighter text-accent">{eta} min</span>
                                <span className="text-[11px] font-bold text-green-500 bg-green-50 px-2 py-0.5 rounded-full">En route</span>
                            </div>
                        </div>
                        <div className="w-16 h-16 bg-accent/5 rounded-3xl flex items-center justify-center text-accent">
                            <Truck size={32} />
                        </div>
                    </div>
                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-accent rounded-full w-2/3 animate-pulse"></div>
                    </div>
                    <p className="text-[11px] font-bold text-gray-500 text-center italic">
                        "Je prépare mon outillage, j'arrive pour régler ça."
                    </p>
                </div>
            </div>
        </div>
    );
};

export default TrackPage;
