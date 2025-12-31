
import React, { useState, useRef } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { Mic, MicOff, X, Sparkles, Loader2, CheckCircle2 } from 'lucide-react';

interface VocalAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  onQuoteCreated: (quote: any) => void;
}

const VocalAssistant: React.FC<VocalAssistantProps> = ({ isOpen, onClose, onQuoteCreated }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioURL(URL.createObjectURL(audioBlob));
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Erreur micro:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleGenerate = async () => {
    if (audioChunksRef.current.length === 0) return;

    setIsProcessing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const base64Audio = await blobToBase64(audioBlob);

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          {
            parts: [
              {
                inlineData: {
                  data: base64Audio,
                  mimeType: 'audio/webm',
                },
              },
              {
                text: "Analyse cet audio de plombier et extrait les informations pour créer un devis. Si des informations manquent, invente des valeurs réalistes basées sur le contexte. Retourne uniquement le JSON.",
              },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              clientName: { type: Type.STRING },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    description: { type: Type.STRING },
                    quantity: { type: Type.NUMBER },
                    unitPrice: { type: Type.NUMBER }
                  },
                  required: ['description', 'quantity', 'unitPrice']
                }
              },
              laborCost: { type: Type.NUMBER },
              travelCost: { type: Type.NUMBER },
              startDate: { type: Type.STRING },
              duration: { type: Type.STRING }
            },
            required: ['clientName', 'items', 'laborCost', 'travelCost']
          }
        }
      });

      const result = JSON.parse(response.text || '{}');
      onQuoteCreated(result);
      handleClose();
    } catch (error) {
      console.error("Erreur de génération:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    stopRecording();
    setAudioURL(null);
    audioChunksRef.current = [];
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-night-bg/95 backdrop-blur-3xl animate-in fade-in duration-500">
      <button onClick={handleClose} className="absolute top-8 right-8 p-3 bg-white/10 rounded-full text-white hover:bg-white/20 transition-all">
        <X size={24} />
      </button>

      <div className="w-full max-w-sm flex flex-col items-center text-center space-y-10">
        <div className="space-y-4">
          <div className="inline-flex p-4 bg-accent/20 rounded-2xl text-accent border border-accent/30">
            <Sparkles size={32} />
          </div>
          <h2 className="text-3xl font-black text-white">Assistant Devis</h2>
          <p className="text-gray-400 text-sm">Artiiz analyse votre voix pour générer le devis instantanément.</p>
        </div>

        <div className="relative flex items-center justify-center h-48 w-48">
          <div className={`absolute inset-0 bg-accent/30 rounded-full blur-3xl transition-all duration-700 ${isRecording ? 'scale-150 opacity-60' : 'scale-50 opacity-0'}`}></div>
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isProcessing}
            className={`relative z-10 w-28 h-28 rounded-full flex items-center justify-center transition-all duration-500 shadow-2xl ${isRecording ? 'bg-red-500 scale-110' : 'bg-accent hover:scale-105'} ${isProcessing ? 'opacity-20 cursor-not-allowed' : ''}`}
          >
            {isRecording ? <MicOff size={40} className="text-white" /> : <Mic size={40} className="text-white" />}
          </button>
          {isRecording && <div className="absolute inset-0 border-4 border-accent/20 rounded-full animate-ping pointer-events-none"></div>}
        </div>

        <div className="w-full space-y-6">
          <div className="flex flex-col items-center gap-2">
            <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-6 py-2 rounded-full border transition-all ${isRecording ? 'text-red-500 border-red-500/30 bg-red-500/10' : 'text-gray-500 border-gray-500/30'}`}>
              {isRecording ? 'ENREGISTREMENT...' : 'APPUYEZ POUR PARLER'}
            </span>
            {audioChunksRef.current.length > 0 && !isRecording && (
              <p className="text-accent text-[10px] font-bold animate-pulse">Audio prêt pour analyse</p>
            )}
          </div>

          {!isRecording && audioChunksRef.current.length > 0 && (
            <button
              onClick={handleGenerate}
              disabled={isProcessing}
              className="w-full py-5 bg-white text-black rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 shadow-2xl active:scale-95 transition-all disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Analyse par l'IA...
                </>
              ) : (
                <>
                  <CheckCircle2 size={20} />
                  Générer mon Devis
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default VocalAssistant;
