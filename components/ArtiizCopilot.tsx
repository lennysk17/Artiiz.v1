
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Mic, MicOff, Sparkles, X, Loader2, Volume2, Send, MessageSquare, Phone, ChevronLeft, User as UserIcon, Bot, BarChart3 } from 'lucide-react';
import { UserProfile } from '../types';

// Audio helpers
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

interface ArtiizCopilotProps {
  profile: UserProfile;
}

const ArtiizCopilot: React.FC<ArtiizCopilotProps> = ({ profile }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'chat' | 'voice'>('chat');
  const [messages, setMessages] = useState<{role: 'user' | 'bot', text: string}[]>([
    { role: 'bot', text: "Bonjour " + profile.directorName + ". Je suis prêt à vous accompagner sur vos chantiers ou votre stratégie de zone. En quoi puis-je vous aider ?" }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Voice States
  const [isActive, setIsActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const systemInstruction = `Tu es l'Artiiz Copilot, un compagnon expert senior pour plombiers.
    Utilisateur : ${profile.directorName}. Entreprise : ${profile.companyName}.
    Zone Maître : ${profile.selectedDepartments?.join(', ') || '75, 92'}.
    
    DIRECTIVES DE PERSONNALITÉ ET STYLE :
    1. TON : Parle comme un collègue expert, pro et direct. Utilise le "tu" de camaraderie professionnelle.
    2. STRUCTURE : Réponds par des phrases courtes et des paragraphes aérés.
    3. PAS DE ROBOTIQUE : N'utilise jamais de préfixes comme "Statut :", "Problème :", "Action :" ou "Rentabilité :".
    4. INTERDIT : N'utilise AUCUN balisage markdown. Pas de gras (**), pas de titres (#). Uniquement du texte brut.
    5. MÉTIER : Sois précis sur les pannes techniques (Frisquet, ELM, etc.) et la rentabilité locale.
    6. CONCISION : Va droit au but pour que Jean puisse lire d'un coup d'oeil sur son téléphone.
    
    Exemple de réponse attendue :
    Bonjour Jean. Pour ton erreur sur l'Hydromotrix, c'est probablement la sonde corps de chauffe qui est fatiguée.
    • Vérifie la résistance de la sonde CTN.
    • Contrôle si la pompe n'est pas gommée.
    C'est un dépannage rapide qui reste très rentable dans le 92 à ton tarif horaire.`;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim()) return;

    const userMsg = inputText;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInputText('');
    setIsTyping(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: userMsg,
        config: { systemInstruction }
      });
      
      // Nettoyage supplémentaire au cas où l'IA renverrait du gras
      const cleanText = (response.text || "").replace(/\*\*/g, '').replace(/#/g, '');
      setMessages(prev => [...prev, { role: 'bot', text: cleanText }]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsTyping(false);
    }
  };

  const startVoiceSession = async () => {
    if (isActive) return;
    setIsActive(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      if (!audioContextRef.current) audioContextRef.current = new AudioContext({ sampleRate: 16000 });
      if (!outputAudioContextRef.current) outputAudioContextRef.current = new AudioContext({ sampleRate: 24000 });
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
          systemInstruction: systemInstruction + " (Réponds oralement de façon naturelle et très brève).",
        },
        callbacks: {
          onopen: () => {
            const source = audioContextRef.current!.createMediaStreamSource(stream);
            const scriptProcessor = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
              sessionPromise.then(s => s.sendRealtimeInput({ media: { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' } }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(audioContextRef.current!.destination);
          },
          onmessage: async (m: LiveServerMessage) => {
            const base64Audio = m.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              setIsSpeaking(true);
              const ctx = outputAudioContextRef.current!;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(ctx.destination);
              source.onended = () => { sourcesRef.current.delete(source); if (sourcesRef.current.size === 0) setIsSpeaking(false); };
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }
          },
          onclose: () => setIsActive(false),
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (err) { setIsActive(false); }
  };

  const stopVoiceSession = () => {
    sessionRef.current?.close();
    setIsActive(false);
    setIsSpeaking(false);
  };

  return (
    <div className="fixed bottom-24 lg:bottom-8 right-6 z-[100] flex flex-col items-end gap-4">
      {isOpen && (
        <div className="w-[320px] md:w-[400px] h-[550px] bg-white dark:bg-night-surface rounded-[40px] border border-day-border dark:border-night-border shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="p-5 bg-accent text-white flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/20 rounded-2xl"><Sparkles size={20} /></div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest">Artiiz Copilot</h3>
                <span className="text-[10px] font-bold opacity-80 uppercase tracking-tight">{profile.selectedDepartments?.join(' • ')}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => { setIsOpen(false); stopVoiceSession(); }} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                <X size={22} />
              </button>
            </div>
          </div>

          {/* Mode Selector */}
          <div className="flex border-b border-day-border dark:border-night-border bg-gray-50 dark:bg-night-bg/50">
            <button 
              onClick={() => { setMode('chat'); if(isActive) stopVoiceSession(); }}
              className={`flex-1 py-3 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'chat' ? 'text-accent bg-white dark:bg-night-surface border-b-2 border-accent' : 'text-gray-400'}`}
            >
              <MessageSquare size={14} /> Messagerie
            </button>
            <button 
              onClick={() => setMode('voice')}
              className={`flex-1 py-3 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'voice' ? 'text-accent bg-white dark:bg-night-surface border-b-2 border-accent' : 'text-gray-400'}`}
            >
              <Phone size={14} /> Mode Oral
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-hidden relative flex flex-col bg-gray-50/30 dark:bg-transparent">
            {mode === 'chat' ? (
              <>
                <div className="flex-1 overflow-y-auto p-5 space-y-6 no-scrollbar">
                  {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[95%] p-4 rounded-3xl text-[13px] font-bold leading-relaxed shadow-sm whitespace-pre-wrap ${
                        m.role === 'user' ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'bg-white dark:bg-night-bg text-gray-700 dark:text-gray-200 border border-day-border dark:border-night-border'
                      }`}>
                        {m.text}
                      </div>
                    </div>
                  ))}
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="bg-white dark:bg-night-bg p-4 rounded-3xl border border-day-border dark:border-night-border flex gap-1.5 items-center">
                        <div className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce"></div>
                        <div className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce [animation-delay:0.2s]"></div>
                        <div className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce [animation-delay:0.4s]"></div>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
                <form onSubmit={handleSendMessage} className="p-4 bg-white dark:bg-night-surface border-t border-day-border dark:border-night-border">
                  <div className="relative group">
                    <input 
                      value={inputText}
                      onChange={e => setInputText(e.target.value)}
                      placeholder="Comment purger ce ballon ?"
                      className="w-full bg-day-bg dark:bg-night-bg border border-day-border dark:border-night-border rounded-2xl px-5 py-4 pr-14 text-xs font-bold outline-none focus:border-accent transition-all"
                    />
                    <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-accent text-white rounded-xl flex items-center justify-center shadow-lg shadow-accent/20 active:scale-95 transition-all">
                      <Send size={18} />
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-10 space-y-10">
                <div className="relative">
                  <div className={`absolute -inset-16 bg-accent/20 rounded-full blur-3xl transition-all duration-700 ${isSpeaking ? 'scale-125 opacity-100' : 'scale-100 opacity-40'}`}></div>
                  <button 
                    onClick={isActive ? stopVoiceSession : startVoiceSession}
                    className={`relative w-32 h-32 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${
                      isActive ? 'bg-accent animate-pulse scale-110' : 'bg-white dark:bg-white/5 text-gray-400 border border-day-border dark:border-night-border'
                    }`}
                  >
                    {isActive ? <Volume2 size={48} className="text-white" /> : <Mic size={48} />}
                  </button>
                </div>
                <div className="text-center space-y-4">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 rounded-full border border-accent/20">
                    <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-accent">
                      {isActive ? (isSpeaking ? 'Lia parle...' : 'Écoute active...') : 'Copilot Vocal'}
                    </p>
                  </div>
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 italic max-w-[240px] leading-relaxed">
                    Parlez-moi comme à un collègue. Je connais vos zones et vos statistiques.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-16 h-16 rounded-full flex items-center justify-center shadow-[0_12px_40px_rgb(139,92,246,0.4)] transition-all duration-300 active:scale-90 relative ${
          isOpen ? 'bg-night-bg text-white' : 'bg-accent text-white hover:scale-110'
        }`}
      >
        {isOpen ? <X size={28} /> : <Bot size={32} />}
        {!isOpen && (
           <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 border-4 border-white dark:border-night-bg rounded-full animate-bounce"></span>
        )}
      </button>
    </div>
  );
};

export default ArtiizCopilot;
