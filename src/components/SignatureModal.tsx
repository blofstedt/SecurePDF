import React, { useState, useRef, useEffect } from 'react';
import { Pen, Type, Eraser, CircleAlert, Smartphone } from 'lucide-react';
import { SavedSignature } from '../types';

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (sig: SavedSignature) => void;
}

export default function SignatureModal({ isOpen, onClose, onSave }: SignatureModalProps) {
  const [activeTab, setActiveTab] = useState<'draw' | 'type' | 'phone'>('draw');
  const [typedText, setTypedText] = useState('');
  const [selectedFont, setSelectedFont] = useState('font-signature-1');
  const [penColor, setPenColor] = useState('#0d1117'); // Black
  const [lineWidth, setLineWidth] = useState(3);
  const [sessionId, setSessionId] = useState<string>('');
  
  // Canvas refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastXRef = useRef(0);
  const lastYRef = useRef(0);

  // Generate unique session ID when switching to Phone connection
  useEffect(() => {
    if (activeTab === 'phone' && !sessionId) {
      const uniqueId = Math.random().toString(36).substring(2, 10).toUpperCase();
      setSessionId(uniqueId);
    }
  }, [activeTab, sessionId]);

  // Poll Express API for mobile signature input
  useEffect(() => {
    if (activeTab !== 'phone' || !sessionId || !isOpen) return;

    const intervalId = setInterval(async () => {
      try {
        const res = await fetch(`/api/signature/${sessionId}`);
        const data = await res.json();
        if (data && data.signature) {
          clearInterval(intervalId);
          // Auto-register received signature from phone
          const newSig: SavedSignature = {
            id: `sig_${Date.now()}`,
            dataUrl: data.signature,
            label: `Mobile Phone Seal [${sessionId}]`,
            createdAt: new Date().toLocaleTimeString(),
          };
          onSave(newSig);
          
          // Clear session and tab defaults
          setSessionId('');
          setActiveTab('draw');
          onClose();
        }
      } catch (err) {
        console.error("Polling error fetching mobile signature context:", err);
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [activeTab, sessionId, isOpen, onClose, onSave]);

  // Reset session ID on modal close or toggle
  useEffect(() => {
    if (!isOpen) {
      setSessionId('');
      setActiveTab('draw');
    }
  }, [isOpen]);

  // Initialize Canvas
  useEffect(() => {
    if (activeTab === 'draw' && canvasRef.current && isOpen) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = penColor;
        ctx.lineWidth = lineWidth;
      }
    }
  }, [activeTab, penColor, lineWidth, isOpen]);

  if (!isOpen) return null;

  // Drawing mouse/touch handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    isDrawingRef.current = true;
    const coords = getEventCoords(e, canvas);
    lastXRef.current = coords.x;
    lastYRef.current = coords.y;

    // Place a single dot instantly
    ctx.beginPath();
    ctx.arc(coords.x, coords.y, ctx.lineWidth / 2, 0, Math.PI * 2);
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !canvasRef.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const coords = getEventCoords(e, canvas);
    ctx.beginPath();
    ctx.moveTo(lastXRef.current, lastYRef.current);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();

    lastXRef.current = coords.x;
    lastYRef.current = coords.y;
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const getEventCoords = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
    canvas: HTMLCanvasElement
  ) => {
    const rect = canvas.getBoundingClientRect();
    
    // Check if TouchEvent
    if ('touches' in e) {
      if (e.touches && e.touches.length > 0) {
        const touch = e.touches[0];
        return {
          x: touch.clientX - rect.left,
          y: touch.clientY - rect.top,
        };
      }
      return { x: 0, y: 0 };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  const handleSave = () => {
    let finalDataUrl = '';

    if (activeTab === 'draw') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      // Check if canvas is completely empty to prevent blank signature imports
      const isBlank = isCanvasBlank(canvas);
      if (isBlank) {
        alert('Please draw a signature before saving.');
        return;
      }
      
      finalDataUrl = canvas.toDataURL('image/png');
    } else {
      if (!typedText.trim()) {
        alert('Please type your signature details before saving.');
        return;
      }

      // Convert typed signature into dynamic canvas rendered image
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = 450;
      tempCanvas.height = 130;
      const ctx = tempCanvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
        ctx.fillStyle = penColor;
        ctx.font = getCanvasFontFamily(selectedFont);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(typedText, tempCanvas.width / 2, tempCanvas.height / 2 + 5);
        
        // Dynamic bottom seal line for typed sigs to make them look authentic
        ctx.strokeStyle = `${penColor}44`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(30, tempCanvas.height - 15);
        ctx.lineTo(tempCanvas.width - 30, tempCanvas.height - 15);
        ctx.stroke();
        
        finalDataUrl = tempCanvas.toDataURL('image/png');
      }
    }

    if (finalDataUrl) {
      const newSig: SavedSignature = {
        id: `sig_${Date.now()}`,
        dataUrl: finalDataUrl,
        label: activeTab === 'draw' ? 'Drawn Signature' : `Typed: ${typedText}`,
        createdAt: new Date().toLocaleTimeString(),
      };
      onSave(newSig);
      // Clean states
      clearCanvas();
      setTypedText('');
      onClose();
    }
  };

  // Helper check if signature has pixels written
  const isCanvasBlank = (canvas: HTMLCanvasElement) => {
    const blank = document.createElement('canvas');
    blank.width = canvas.width;
    blank.height = canvas.height;
    return canvas.toDataURL() === blank.toDataURL();
  };

  const getCanvasFontFamily = (fontClass: string) => {
    switch (fontClass) {
      case 'font-signature-1':
        return '48px "Brush Script MT", cursive';
      case 'font-signature-2':
        return '48px "Lucida Handwriting", cursive';
      case 'font-signature-3':
        return '46px "Snell Roundhand", Georgia, serif';
      case 'font-signature-4':
        return '46px "Courier New", Courier, monospace';
      default:
        return '48px cursive';
    }
  };

  return (
    <div id="signature-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-colors">
      <div id="signature-modal" className="w-full max-w-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden text-slate-800 dark:text-slate-200 animate-in fade-in zoom-in-95 duration-200 transition-colors">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="p-1 px-2 text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-650 dark:text-indigo-400 font-bold rounded-sm border border-indigo-100 dark:border-indigo-800/50">SECURE REGISTRY</span>
            <h3 className="font-sans font-bold text-lg text-slate-800 dark:text-slate-100">Create Digital Signature</h3>
          </div>
          <button 
            id="close-sig-modal-btn"
            onClick={onClose}
            className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors cursor-pointer text-lg font-bold"
          >
            ✕
          </button>
        </div>

        {/* Tab Switcher */}
        <div id="sig-mode-tabs" className="flex border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 p-1 m-4 rounded-lg">
          <button
            id="tab-draw-btn"
            className={`flex-1 flex items-center justify-center py-2 text-sm font-bold rounded-md transition-all cursor-pointer ${
              activeTab === 'draw'
                ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
            onClick={() => setActiveTab('draw')}
          >
            <Pen className="w-4 h-4 mr-2 text-indigo-600 dark:text-indigo-400" />
            Draw Ink
          </button>
          <button
            id="tab-type-btn"
            className={`flex-1 flex items-center justify-center py-2 text-sm font-bold rounded-md transition-all cursor-pointer ${
              activeTab === 'type'
                ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
            onClick={() => setActiveTab('type')}
          >
            <Type className="w-4 h-4 mr-2 text-indigo-600 dark:text-indigo-400" />
            Type Keyboard
          </button>
          <button
            id="tab-phone-btn"
            className={`flex-1 flex items-center justify-center py-2 text-sm font-bold rounded-md transition-all cursor-pointer ${
              activeTab === 'phone'
                ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
            onClick={() => setActiveTab('phone')}
          >
            <Smartphone className="w-4 h-4 mr-2 text-indigo-600 dark:text-indigo-400" />
            Phone QR Code
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 pt-2">
          {/* Style Controls (Color & Stroke) */}
          {activeTab !== 'phone' && (
            <div className="flex items-center justify-between mb-4">
              <div className="flex space-x-3 items-center">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pen Color:</span>
                <div id="color-selectors" className="flex space-x-2">
                  {[
                    { value: '#0d1117', label: 'Ebony Black', colorClass: 'bg-black' },
                    { value: '#002fa7', label: 'Navy Blue', colorClass: 'bg-indigo-700' },
                    { value: '#b22222', label: 'Crimson Red', colorClass: 'bg-rose-700' }
                  ].map((color) => (
                    <button
                      key={color.value}
                      id={`color-${color.value}`}
                      title={color.label}
                      onClick={() => setPenColor(color.value)}
                      className={`w-6 h-6 rounded-full border cursor-pointer hover:scale-110 transition-transform ${color.colorClass} ${
                        penColor === color.value ? 'border-white scale-110 ring-2 ring-indigo-600' : 'border-slate-300'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {activeTab === 'draw' && (
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Brush:</span>
                  <select
                    id="brush-weight-select"
                    value={lineWidth}
                    onChange={(e) => setLineWidth(Number(e.target.value))}
                    className="bg-white text-xs border border-slate-200 rounded p-1 text-slate-800 focus:outline-hidden font-bold"
                  >
                    <option value={1.5}>Fine (1.5px)</option>
                    <option value={3}>Medium (3px)</option>
                    <option value={5}>Thick (5px)</option>
                  </select>
                </div>
              )}
            </div>
          )}

          {activeTab === 'phone' ? (
            <div className="flex flex-col items-center justify-center p-4 space-y-4 text-center">
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl shadow-inner flex flex-col items-center justify-center">
                {sessionId ? (
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                      window.location.origin + "/mobile-sign?sessionId=" + sessionId
                    )}`}
                    alt="Signature Sync QR Code"
                    className="w-44 h-44 object-contain shadow-xs bg-white p-2 rounded-lg"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-44 h-44 bg-slate-100 flex items-center justify-center rounded-lg">
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider animate-pulse">Generating QR...</span>
                  </div>
                )}
                <div className="mt-3 text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 p-1 px-3 rounded-full uppercase tracking-wider">
                  Session Code: {sessionId}
                </div>
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest">Active Scan & Draw Link</h4>
                <p className="text-[11px] text-slate-500 max-w-sm leading-relaxed font-semibold">
                  Scan the secure barcode with your mobile phone camera to draw a precision seal directly using your finger or stylus. No application downloads required!
                </p>
              </div>
              <div className="flex items-center space-x-2 text-[10px] text-slate-500 uppercase font-bold tracking-wider pt-1 bg-slate-100 p-2 px-4 rounded-full">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
                <span>Waiting for mobile ink...</span>
              </div>
            </div>
          ) : activeTab === 'draw' ? (
            <div className="space-y-3">
              <div className="relative border-2 border-slate-200 hover:border-slate-300 bg-slate-50 rounded-xl overflow-hidden h-40 shadow-inner">
                <canvas
                  id="signature-canvas"
                  ref={canvasRef}
                  width={450}
                  height={150}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-full cursor-crosshair touch-none"
                />
                
                {/* Clear canvas absolute button */}
                <button
                  id="clear-canvas-btn"
                  onClick={clearCanvas}
                  className="absolute bottom-2 right-2 text-xs text-slate-500 hover:text-rose-600 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-100 rounded-md p-1 px-2.5 transition-colors flex items-center shadow-xs cursor-pointer font-bold"
                >
                  <Eraser className="w-3 h-3 mr-1" />
                  Clear Drawing
                </button>
              </div>
              <p className="text-[11px] text-slate-400 font-semibold tracking-wide uppercase text-center select-none">
                Draw inside the bounding box. Works on stylus pens and mobile touch.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 flex items-center justify-between uppercase tracking-wider mt-1 select-none">
                  <span>Type Name or Initials</span>
                  <span className="text-[10px] text-indigo-650">Strictly Local Translation</span>
                </label>
                <input
                  id="typed-sig-input"
                  type="text"
                  value={typedText}
                  onChange={(e) => setTypedText(e.target.value)}
                  placeholder="e.g. Alexis Vance"
                  maxLength={32}
                  className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 focus:outline-hidden rounded-xl p-3 text-lg font-bold text-slate-850 placeholder-slate-300 transition-all font-sans"
                />
              </div>

              <div id="sig-font-choices" className="grid grid-cols-2 gap-2 mt-2">
                {[
                  { id: 'font-signature-1', name: 'Elegant Cursive', fontStyle: { fontFamily: '"Brush Script MT", cursive' } },
                  { id: 'font-signature-2', name: 'Modern Script', fontStyle: { fontFamily: '"Lucida Handwriting", cursive' } },
                  { id: 'font-signature-3', name: 'Editorial Serif', fontStyle: { fontFamily: '"Snell Roundhand", Georgia, serif' } },
                  { id: 'font-signature-4', name: 'Carbon Mono', fontStyle: { fontFamily: '"Courier New", Courier, monospace' } }
                ].map((fontChoice) => (
                  <button
                    key={fontChoice.id}
                    id={`font-tab-${fontChoice.id}`}
                    onClick={() => setSelectedFont(fontChoice.id)}
                    className={`p-3 text-center border rounded-xl transition-all ${
                      selectedFont === fontChoice.id
                        ? 'border-indigo-600 bg-indigo-50 text-slate-900 font-bold'
                        : 'border-slate-200 bg-slate-50 hover:border-slate-300 text-slate-600'
                    }`}
                  >
                    <div className="text-[10px] text-slate-400 text-left mb-1 font-bold uppercase tracking-wider">{fontChoice.name}</div>
                    <div 
                      className="text-lg overflow-hidden text-ellipsis whitespace-nowrap min-h-6"
                      style={{ ...fontChoice.fontStyle, color: penColor }}
                    >
                      {typedText || 'Signature Preview'}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Secure Warning Segment */}
          <div className="mt-5 p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start space-x-2.5 shadow-xs">
            <CircleAlert className="w-4 h-4 text-indigo-650 mt-0.5 shrink-0" />
            <p className="text-[11px] text-slate-500 leading-normal font-medium">
              <strong className="text-slate-800">Local Isolation Protocol:</strong> Your signature vector tracks are processed as an ephemeral bitmap. No signature vectors are saved in browser cookies, database logs, or uploaded to external cloud endpoints.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-end space-x-3">
          <button
            id="cancel-sig-btn"
            onClick={onClose}
            className="text-sm font-bold text-slate-400 hover:text-slate-700 px-4 py-2 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          {activeTab !== 'phone' && (
            <button
              id="save-sig-btn"
              onClick={handleSave}
              className="text-sm bg-indigo-600 hover:bg-indigo-750 text-white font-bold px-6 py-2 rounded-lg transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              Create & Register
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
