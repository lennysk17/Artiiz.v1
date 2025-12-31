
import React, { useRef, useState, useEffect } from 'react';
import { X, Eraser, Check, PenTool } from 'lucide-react';

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (signatureData: string) => void;
}

const SignatureModal: React.FC<SignatureModalProps> = ({ isOpen, onClose, onSave }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    if (isOpen && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [isOpen]);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasSignature(false);
    }
  };

  const save = () => {
    const canvas = canvasRef.current;
    if (canvas && hasSignature) {
      onSave(canvas.toDataURL('image/png'));
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white dark:bg-night-surface w-full max-w-lg rounded-[32px] overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-gray-100 dark:border-night-border flex justify-between items-center">
          <div className="flex items-center gap-2">
            <PenTool size={18} className="text-accent" />
            <h3 className="font-black text-sm uppercase tracking-widest">Signature Client</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 space-y-6">
          <p className="text-xs text-gray-500 font-medium text-center italic">
            "Je certifie avoir pris connaissance du devis et accepte les travaux décrits."
          </p>
          
          <div className="relative aspect-[16/9] bg-gray-50 dark:bg-night-bg border-2 border-dashed border-gray-200 dark:border-night-border rounded-2xl overflow-hidden cursor-crosshair">
            <canvas
              ref={canvasRef}
              width={600}
              height={337}
              className="w-full h-full touch-none"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
          </div>

          <div className="flex gap-4">
            <button 
              onClick={clear}
              className="flex-1 py-4 border border-day-border dark:border-night-border rounded-xl font-black text-xs uppercase tracking-widest text-gray-400 hover:text-red-500 hover:border-red-500 transition-all flex items-center justify-center gap-2"
            >
              <Eraser size={16} /> Effacer
            </button>
            <button 
              onClick={save}
              disabled={!hasSignature}
              className="flex-[2] py-4 bg-accent disabled:opacity-50 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-xl shadow-accent/20 flex items-center justify-center gap-2"
            >
              <Check size={16} /> Valider l'accord
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignatureModal;
