
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Mic, MicOff, Sparkles, X, Loader2, Volume2, VolumeX } from 'lucide-react';

// Audio decoding helper functions
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

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
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

const LiveVoiceChat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionRef = useRef<any>(null);

  const toggleChat = () => {
    if (isOpen && isActive) {
      stopSession();
    }
    setIsOpen(!isOpen);
  };

  const startSession = async () => {
    if (isActive) return;
    setIsActive(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      }
      if (!outputAudioContextRef.current) {
        outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          systemInstruction: "Tu es l'assistant vocal stratégique d'Artiiz, une application pour plombiers. Tu aides les artisans à optimiser leur rentabilité, leurs trajets et leur réputation Google Maps. Sois pro, expert, concis (réponses de moins de 15 secondes) et utilise un ton encourageant. Si on te pose une question sur les zones, conseille le 92 pour la rentabilité.",
        },
        callbacks: {
          onopen: () => {
            console.log('Gemini Live session opened');
            const source = audioContextRef.current!.createMediaStreamSource(stream);
            const scriptProcessor = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const l = inputData.length;
              const int16 = new Int16Array(l);
              for (let i = 0; i < l; i++) {
                int16[i] = inputData[i] * 32768;
              }
              const pcmBlob = {
                data: encode(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              
              sessionPromise.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            
            source.connect(scriptProcessor);
            scriptProcessor.connect(audioContextRef.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              setIsSpeaking(true);
              const ctx = outputAudioContextRef.current!;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              
              const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(ctx.destination);
              
              source.addEventListener('ended', () => {
                sourcesRef.current.delete(source);
                if (sourcesRef.current.size === 0) setIsSpeaking(false);
              });

              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }

            if (message.serverContent?.interrupted) {
              for (const source of sourcesRef.current) {
                source.stop();
              }
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setIsSpeaking(false);
            }
          },
          onerror: (e) => console.error('Gemini Live Error:', e),
          onclose: () => {
            setIsActive(false);
            setIsSpeaking(false);
          },
        },
      });

      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error('Failed to start Live session:', err);
      setIsActive(false);
    }
  };

  const stopSession = () => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    setIsActive(false);
    setIsSpeaking(false);
  };

  return (
    <div className="fixed bottom-24 lg:bottom-8 right-6 z-[100] flex flex-col items-end gap-4">
      {isOpen && (
        <div className="w-72 bg-white dark:bg-night-surface rounded-[32px] border border-day-border dark:border-night-border shadow-2xl p-6 animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-accent/10 text-accent rounded-xl">
                <Sparkles size={16} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest">Assistant Live</span>
            </div>
            <button onClick={toggleChat} className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
              <X size={18} />
            </button>
          </div>

          <div className="flex flex-col items-center gap-6 py-4">
            <div className="relative">
              {isActive && (
                <div className={`absolute -inset-4 bg-accent/20 rounded-full blur-xl transition-all duration-300 ${isSpeaking ? 'scale-150 opacity-60' : 'scale-100 opacity-20'}`}></div>
              )}
              <button 
                onClick={isActive ? stopSession : startSession}
                className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-all duration-500 shadow-xl ${
                  isActive ? (isSpeaking ? 'bg-accent animate-pulse scale-110' : 'bg-accent') : 'bg-gray-100 dark:bg-white/5 text-gray-400 hover:bg-accent/10 hover:text-accent'
                }`}
              >
                {isActive ? <Volume2 size={32} className="text-white" /> : <Mic size={32} />}
              </button>
              {isActive && isSpeaking && (
                 <div className="absolute inset-0 border-4 border-accent/20 rounded-full animate-ping pointer-events-none"></div>
              )}
            </div>
            
            <div className="text-center space-y-2">
              <p className="text-[11px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
                {isActive ? (isSpeaking ? 'Lia parle...' : 'Écoute en cours...') : 'Prêt à vous conseiller'}
              </p>
              <p className="text-[9px] font-bold text-gray-400 leading-tight italic">
                {isActive ? 'Posez vos questions sur votre rentabilité ou vos avis.' : 'Appuyez pour lancer la conversation vocale.'}
              </p>
            </div>
          </div>

          {isActive && (
            <button 
              onClick={stopSession}
              className="w-full mt-4 py-3 bg-red-500/10 text-red-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all"
            >
              Terminer l'appel
            </button>
          )}
        </div>
      )}

      <button 
        onClick={toggleChat}
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 active:scale-90 ${
          isOpen ? 'bg-night-bg text-white' : 'bg-accent text-white hover:scale-105 shadow-accent/20'
        }`}
      >
        {isOpen ? <X size={24} /> : <Sparkles size={24} fill="currentColor" />}
      </button>
    </div>
  );
};

export default LiveVoiceChat;
