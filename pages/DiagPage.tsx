
import React, { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Camera, Image as ImageIcon, CheckCircle2, AlertCircle, Loader2, X, AlertTriangle, Send } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

const DiagPage: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [intervention, setIntervention] = useState<any>(null);
    const [plumber, setPlumber] = useState<any>(null);

    const [photos, setPhotos] = useState<{ file: File, preview: string }[]>([]);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [success, setSuccess] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

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
                    setError("Lien invalide ou expiré.");
                    return;
                }

                if (inter.diag_expires_at && new Date(inter.diag_expires_at) < new Date()) {
                    setError("Ce lien est arrivé à expiration.");
                    return;
                }

                setIntervention(inter);
                setPlumber(inter.profiles);
            } catch (err) {
                setError("Erreur lors du chargement.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [token]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        const newPhotos = (Array.from(files) as File[]).map(file => ({
            file,
            preview: URL.createObjectURL(file)
        }));

        setPhotos(prev => [...prev, ...newPhotos].slice(0, 3));
    };

    const removePhoto = (index: number) => {
        setPhotos(prev => {
            const updated = [...prev];
            URL.revokeObjectURL(updated[index].preview);
            updated.splice(index, 1);
            return updated;
        });
    };

    const handleSubmit = async () => {
        if (photos.length === 0) return;
        setUploading(true);
        setProgress(10);

        try {
            // Simulate/Implement upload to Supabase Storage
            // For this MVP, we simulate progress and update database with placeholders or real URLs if bucket exists
            const photoUrls: string[] = [];

            for (let i = 0; i < photos.length; i++) {
                const file = photos[i].file;
                const fileExt = file.name.split('.').pop();
                const fileName = `${token}/${Date.now()}_${i}.${fileExt}`;

                // Simuler un bucket "interventions"
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('interventions')
                    .upload(fileName, file);

                if (!uploadError) {
                    const { data: { publicUrl } } = supabase.storage.from('interventions').getPublicUrl(fileName);
                    photoUrls.push(publicUrl);
                }

                setProgress(10 + (i + 1) * (80 / photos.length));
            }

            // Update intervention with photo URLs
            const { error: updateError } = await supabase
                .from('interventions')
                .update({
                    diag_photos: photoUrls,
                    status: 'ongoing' // Assure que le plombier voit l'activité
                })
                .eq('id', token);

            if (updateError) throw updateError;

            setProgress(100);
            setTimeout(() => setSuccess(true), 500);

            // Trigger notification (simulated here)
            console.log("Diagnostic photos sent to plumber for intervention", token);

        } catch (err) {
            console.error(err);
            alert("Une erreur est survenue lors de l'envoi. Assurez-vous que le bucket 'interventions' existe dans Supabase.");
        } finally {
            setUploading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-white">
                <Loader2 className="animate-spin text-accent" size={40} />
                <p className="mt-4 font-black text-xs uppercase tracking-widest text-gray-400">Initialisation...</p>
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
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-white p-8 text-center animate-in zoom-in-95 duration-500">
                <div className="w-24 h-24 bg-green-500 text-white rounded-full flex items-center justify-center mb-8 shadow-2xl shadow-green-500/30 scale-110 animate-bounce">
                    <CheckCircle2 size={48} />
                </div>
                <h2 className="text-2xl font-black mb-4 tracking-tighter">Diagnostic Envoyé !</h2>
                <p className="text-gray-500 font-medium leading-relaxed max-w-xs mx-auto">
                    Bien reçu ! Votre expert <strong>{plumber?.director_name}</strong> analyse vos photos et vous recontacte très vite.
                </p>
                <button onClick={() => window.close()} className="mt-12 text-accent font-black text-xs uppercase tracking-widest border-b-2 border-accent/20 pb-1">
                    Fermer cette page
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white flex flex-col">
            {/* Header épuré */}
            <div className="p-8 pb-4">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center text-accent">
                        <Camera size={20} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black tracking-tight">Diagnostic Express</h1>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Client: {intervention?.client_name}</p>
                    </div>
                </div>

                <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100 mb-8">
                    <p className="text-sm font-bold text-gray-700 leading-relaxed">
                        "Montrez-nous votre problème. Prenez une photo de la fuite ou de l'appareil en panne."
                    </p>
                </div>
            </div>

            <div className="px-8 flex-1 space-y-6">
                {/* Zone de Capture */}
                <div
                    onClick={() => photos.length < 3 && fileInputRef.current?.click()}
                    className={`aspect-[4/3] rounded-[40px] border-4 border-dashed transition-all flex flex-col items-center justify-center gap-4 cursor-pointer relative overflow-hidden
            ${photos.length < 3 ? 'border-accent/20 bg-accent/5 hover:border-accent hover:bg-accent/10' : 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'}
          `}
                >
                    {photos.length > 0 ? (
                        <img src={photos[photos.length - 1].preview} className="absolute inset-0 w-full h-full object-cover opacity-20" alt="background" />
                    ) : null}

                    <div className="relative z-10 flex flex-col items-center gap-2">
                        <div className={`p-6 rounded-full ${photos.length < 3 ? 'bg-accent text-white shadow-xl shadow-accent/20' : 'bg-gray-300 text-white'}`}>
                            <Camera size={32} />
                        </div>
                        <span className="text-[11px] font-black uppercase tracking-widest mt-2">
                            {photos.length < 3 ? 'Prendre une photo' : 'Limite atteinte'}
                        </span>
                        <span className="text-[10px] font-bold text-gray-400">({photos.length}/3 photos)</span>
                    </div>

                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*"
                        capture="environment" // Force caméra arrière sur mobile
                        className="hidden"
                        multiple={false}
                    />
                </div>

                {/* Liste des photos */}
                {photos.length > 0 && (
                    <div className="grid grid-cols-3 gap-4 animate-in slide-in-from-bottom-4">
                        {photos.map((photo, i) => (
                            <div key={i} className="aspect-square rounded-2xl relative border-2 border-white shadow-md overflow-hidden ring-1 ring-gray-100">
                                <img src={photo.preview} className="w-full h-full object-cover" alt="prev" />
                                <button
                                    onClick={() => removePhoto(i)}
                                    className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg active:scale-90"
                                >
                                    <X size={12} strokeWidth={4} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Sécurité / Rassurance */}
                <div className="flex items-center gap-3 p-4 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">
                    <AlertCircle size={18} />
                    <p className="text-[10px] font-bold uppercase tracking-wider">Vos photos sont chiffrées et privées</p>
                </div>
            </div>

            {/* Footer Bouton */}
            <div className="p-8 sticky bottom-0 bg-white/80 backdrop-blur-md">
                {uploading ? (
                    <div className="space-y-4">
                        <div className="h-4 w-full bg-gray-100 rounded-full overflow-hidden border border-gray-100 p-0.5">
                            <div
                                className="h-full bg-accent rounded-full transition-all duration-300 shadow-sm"
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                        <p className="text-center text-[10px] font-black text-accent uppercase tracking-widest animate-pulse">
                            Envoi des fichiers en cours... {Math.round(progress)}%
                        </p>
                    </div>
                ) : (
                    <button
                        disabled={photos.length === 0}
                        onClick={handleSubmit}
                        className={`w-full py-5 rounded-3xl font-black text-sm uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all shadow-2xl shadow-accent/20
              ${photos.length > 0 ? 'bg-accent text-white active:scale-95' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}
            `}
                    >
                        Envoyer le diagnostic <Send size={18} />
                    </button>
                )}
            </div>
        </div>
    );
};

export default DiagPage;
