import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import * as pdfjsLib from "pdfjs-dist";
import "pdfjs-dist/web/pdf_viewer.css";
import { PDFDocument, rgb, StandardFonts, PDFName, PDFDict, PDFArray, PDFString, PDFHexString, PDFTextField, degrees } from "pdf-lib";
import {
  ShieldAlert,
  Upload,
  Trash2,
  Eye,
  RotateCcw,
  RotateCw,
  MoreVertical,
  Download,
  FileMinus,
  Sparkles,
  FileText,
  ZoomIn,
  ZoomOut,
  AlertCircle,
  Clock,
  Layers,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Smartphone,
  CheckCircle,
  Menu,
  ChevronDown,
  Moon,
  Sun,
  Undo,
  Redo,
  PenTool,
  Type,
  Edit3,
  Square,
  Circle,
  Minus,
  Palette,
  EyeOff,
  CheckSquare,
  Sidebar,
  HelpCircle,
  Lock,
  Maximize2,
  Loader2,
  X,
  Grid,
  HardDrive,
  CheckCircle2,
  DownloadCloud,
} from "lucide-react";

import {
  AnnotationItem,
  SavedSignature,
  ActivityLog,
  PDFPageSize,
} from "./types";
import {
  saveAutoSaveSession,
  loadAutoSaveSession,
  clearAutoSaveSession,
} from "./lib/db";
import SignatureModal from "./components/SignatureModal";
import Toolbar, { ToolMode, StampType } from "./components/Toolbar";
import LayerControl from "./components/LayerControl";
import HistoryControl from "./components/HistoryControl";
import PurgeOverlay from "./components/PurgeOverlay";
import PdfMergeModal from "./components/PdfMergeModal";
import PdfCompressModal from "./components/PdfCompressModal";
import PdfSearch from "./components/PdfSearch";
import FindAndRedactModal from "./components/FindAndRedactModal";

// Initialize PDFJS Worker (using unpkg matching our installed 6.0.227)
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

// Sub-component for Mobile signing page
function MobileSignPage({ sessionId }: { sessionId: string }) {
  const [penColor, setPenColor] = useState("#0d1117");
  const [lineWidth, setLineWidth] = useState(3.5);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastXRef = useRef(0);
  const lastYRef = useRef(0);

  // Initialize canvas when color/width changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = penColor;
        ctx.lineWidth = lineWidth;
      }
    }
  }, [penColor, lineWidth]);

  const getEventCoords = (
    e:
      React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
    canvas: HTMLCanvasElement,
  ) => {
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      if (e.touches && e.touches.length > 0) {
        const touch = e.touches[0];
        return {
          x: ((touch.clientX - rect.left) / rect.width) * canvas.width,
          y: ((touch.clientY - rect.top) / rect.height) * canvas.height,
        };
      }
      return { x: 0, y: 0 };
    } else {
      return {
        x: ((e.clientX - rect.left) / rect.width) * canvas.width,
        y: ((e.clientY - rect.top) / rect.height) * canvas.height,
      };
    }
  };

  const startDrawing = (
    e:
      React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    isDrawingRef.current = true;
    const coords = getEventCoords(e, canvas);
    lastXRef.current = coords.x;
    lastYRef.current = coords.y;

    ctx.beginPath();
    ctx.arc(coords.x, coords.y, ctx.lineWidth / 2, 0, Math.PI * 2);
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
  };

  const draw = (
    e:
      React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    if (!isDrawingRef.current || !canvasRef.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
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

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  const handleSubmit = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Check if empty
    const isEmpty = isCanvasBlank(canvas);
    if (isEmpty) {
      alert("Please draw your signature before submitting!");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");
    const dataUrl = canvas.toDataURL("image/png");

    try {
      const res = await fetch(`/api/signature/${sessionId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ signature: dataUrl }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(true);
      } else {
        setErrorMsg(data.error || "Failed to submit signature.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Network error. Failed to reach server.");
    } finally {
      setSubmitting(false);
    }
  };

  const isCanvasBlank = (canvas: HTMLCanvasElement) => {
    const context = canvas.getContext("2d");
    if (!context) return true;
    const buffer = new Uint32Array(
      context.getImageData(0, 0, canvas.width, canvas.height).data.buffer,
    );
    return !buffer.some((color) => color !== 0);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between p-4 font-sans select-none">
      {/* Header */}
      <header className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center space-x-2">
          <div className="bg-indigo-600 p-1.5 rounded-lg text-white">
            <Smartphone className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-800 leading-none">
              Mobile Signature
            </h1>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
              Secure Isolated Ink
            </p>
          </div>
        </div>
        <div className="text-[9px] font-mono font-bold bg-indigo-50 border border-indigo-100 text-indigo-650 p-1 px-2.5 rounded-full select-all">
          ID: {sessionId || "No Session"}
        </div>
      </header>

      {/* Main interactive compartment */}
      <main className="flex-1 flex flex-col justify-center my-4 space-y-4">
        {success ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center flex flex-col items-center justify-center space-y-4 shadow-sm animate-in fade-in zoom-in-95 duration-200 min-h-[300px]">
            <div className="bg-emerald-50 text-emerald-600 p-4 rounded-full border border-emerald-100 shadow-sm animate-bounce">
              <CheckCircle className="w-12 h-12" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-lg font-bold text-slate-800">
                Signature Submitted!
              </h2>
              <p className="text-xs text-slate-500 font-medium max-w-[280px]">
                Your hand-drawn signature was transferred instantly to your
                laptop screen session. You can now close this tab.
              </p>
            </div>
          </div>
        ) : !sessionId ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center flex flex-col items-center justify-center space-y-3 shadow-xs min-h-[300px]">
            <div className="bg-rose-50 text-rose-600 p-3.5 rounded-full border border-rose-100">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-bold text-slate-800">
                Invalid Link Session
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed font-semibold max-w-[240px] uppercase tracking-wide">
                Please scan the QR code from your laptop browser's Signature
                screen.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col space-y-3">
            {/* Color control bar */}
            <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between shadow-xs">
              <div className="flex space-x-3 items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Color:
                </span>
                <div className="flex space-x-2">
                  {[
                    {
                      value: "#0d1117",
                      label: "Ebony Black",
                      colorClass: "bg-black",
                    },
                    {
                      value: "#002fa7",
                      label: "Navy Blue",
                      colorClass: "bg-indigo-700",
                    },
                    {
                      value: "#b22222",
                      label: "Crimson Red",
                      colorClass: "bg-rose-700",
                    },
                  ].map((color) => (
                    <button
                      key={color.value}
                      title={color.label}
                      onClick={() => setPenColor(color.value)}
                      className={`w-7 h-7 rounded-full border-2 cursor-pointer transition-transform ${color.colorClass} ${
                        penColor === color.value
                          ? "border-indigo-600 scale-110 shadow-xs"
                          : "border-slate-200"
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                  Brush:
                </span>
                <select
                  value={lineWidth}
                  onChange={(e) => setLineWidth(Number(e.target.value))}
                  className="bg-slate-50 text-xs border border-slate-200 rounded p-1 text-slate-700 focus:outline-hidden font-bold"
                >
                  <option value={2}>Fine</option>
                  <option value={3.5}>Medium</option>
                  <option value={5.5}>Thick</option>
                </select>
              </div>
            </div>

            {/* Drawing box */}
            <div className="flex-1 bg-white border-2 border-slate-200 hover:border-indigo-400 rounded-2xl relative overflow-hidden shadow-inner flex flex-col min-h-[300px]">
              <canvas
                ref={canvasRef}
                width={600}
                height={400}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-full cursor-crosshair touch-none bg-slate-50/50"
              />
              <button
                onClick={clearCanvas}
                className="absolute bottom-3 left-3 text-xs text-slate-500 hover:text-rose-600 bg-white hover:bg-rose-50 border border-slate-200 rounded-xl p-2 px-3.5 transition-colors flex items-center shadow-xs font-bold"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                Clear Ink
              </button>
            </div>

            {errorMsg && (
              <div className="bg-rose-50 text-rose-600 border border-rose-100 p-2.5 rounded-xl text-xs font-bold text-center">
                {errorMsg}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Button cluster at the bottom */}
      {!success && sessionId && (
        <footer className="space-y-2">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className={`w-full py-4 rounded-2xl text-sm font-bold text-white shadow-md active:scale-97 transition-all flex items-center justify-center space-x-2 ${
              submitting ? "bg-indigo-400" : "bg-indigo-600 hover:bg-indigo-750"
            }`}
          >
            {submitting ? (
              <>
                <svg
                  className="animate-spin h-4 w-4 text-white mr-1.5"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Streaming Signature...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-0.5" />
                <span>Submit Signature to Desktop</span>
              </>
            )}
          </button>

          <p className="text-[9px] text-slate-400 text-center uppercase tracking-wider font-semibold">
            SECURE SESSION ENCRYPTED • ephemeral server transfer buffer
          </p>
        </footer>
      )}
    </div>
  );
}


function parseColorFromDA(da: string | undefined) {
  if (!da) return "#000000";
  const match = da.match(/([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+rg/);
  if (match) {
    const r = Math.round(parseFloat(match[1]) * 255);
    const g = Math.round(parseFloat(match[2]) * 255);
    const b = Math.round(parseFloat(match[3]) * 255);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
  const matchG = da.match(/([\d.]+)\s+g/);
  if (matchG) {
    const v = Math.round(parseFloat(matchG[1]) * 255);
    return `#${v.toString(16).padStart(2, '0')}${v.toString(16).padStart(2, '0')}${v.toString(16).padStart(2, '0')}`;
  }
  return "#000000";
}

async function extractAndCleanAnnotations(bytes: Uint8Array): Promise<{cleanedBytes: Uint8Array, extractedAnnotations: AnnotationItem[]}> {
  try {
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const pages = doc.getPages();
    const newAnnotations: AnnotationItem[] = [];
    const refsToRemove = new Set<string>();
    
    // 1. Extract from AcroForm Text Fields
    let acroForm: any;
    try {
      acroForm = (doc.catalog as any).lookup(PDFName.of("AcroForm"));
    } catch (e) {}
    
    if (acroForm) {
      const form = doc.getForm();
      const fields = form.getFields();
      for (const f of fields) {
        if (f instanceof PDFTextField) {
          const text = (f as any).getText();
          if (text && text.trim().length > 0) {
            let color = "#000000";
            try {
               const da = (f as any).acroField.getDefaultAppearance();
               color = parseColorFromDA(da);
            } catch (e) {}

            const widgets = (f as any).acroField.getWidgets();
            for (const w of widgets) {
              const rect = w.getRectangle();
              const ref = w.P();
              let pageIndex = pages.findIndex(p => p.ref === ref);
              if (pageIndex === -1) pageIndex = 0;
              const pageHeight = pages[pageIndex].getHeight();
              // In PDF, y is from bottom. We want y from top.
              const yFromTop = pageHeight - rect.y - rect.height;
              newAnnotations.push({
                id: Math.random().toString(36).substring(7),
                pageNumber: pageIndex + 1,
                type: "text",
                x: rect.x,
                y: yFromTop,
                text: text,
                fontColor: color,
                width: Math.max(100, rect.width),
                height: Math.max(20, rect.height),
                fontFamily: "Helvetica",
                fontSize: Math.max(10, rect.height * 0.7),
              });
            }
          }
          
          const kids = (f as any).acroField.Kids();
          if (kids) {
            for (let i = 0; i < kids.size(); i++) {
               const r = kids.get(i);
               if (r && (r as any).tag) refsToRemove.add((r as any).tag);
            }
          } else {
             if ((f as any).ref && (f as any).ref.tag) refsToRemove.add((f as any).ref.tag);
          }
          form.removeField(f);
        }
      }
    }

    // 2. Extract from FreeText annotations
    for (let pIdx = 0; pIdx < pages.length; pIdx++) {
      const p = pages[pIdx];
      const pAnnots = p.node.Annots();
      if (pAnnots instanceof PDFArray) {
        for (let i = pAnnots.size() - 1; i >= 0; i--) {
          const aRef = pAnnots.get(i);
          let removeThis = false;
          if (aRef && (aRef as any).tag && refsToRemove.has((aRef as any).tag)) {
             removeThis = true;
          }
          
          const a = pAnnots.lookupMaybe(i, PDFDict);
          if (a) {
             const subtype = a.lookup(PDFName.of('Subtype'));
             if (subtype === PDFName.of('FreeText')) {
                const rectArr = a.lookupMaybe(PDFName.of('Rect'), PDFArray);
                if (rectArr) {
                  const rArr = rectArr.asArray().map(n => (n as any).numberValue || 0);
                  const x = rArr[0];
                  const yBottom = rArr[1];
                  const w = rArr[2] - rArr[0];
                  const h = rArr[3] - rArr[1];
                  const pageHeight = p.getHeight();
                  const yFromTop = pageHeight - yBottom - h;
                  
                  let text = '';
                  const contents = a.lookupMaybe(PDFName.of('Contents'), PDFString) || a.lookupMaybe(PDFName.of('Contents'), PDFHexString);
                  if (contents) {
                    text = contents.decodeText();
                  }
                  
                  let color = "#000000";
                  try {
                     const daStr = a.lookupMaybe(PDFName.of('DA'), PDFString);
                     if (daStr) color = parseColorFromDA(daStr.decodeText());
                  } catch (e) {}

                  if (text && text.trim().length > 0) {
                    newAnnotations.push({
                      id: Math.random().toString(36).substring(7),
                      pageNumber: pIdx + 1,
                      type: "text",
                      x: x,
                      y: yFromTop,
                      text: text,
                      fontColor: color,
                      width: Math.max(100, w),
                      height: Math.max(20, h),
                      fontFamily: "Helvetica",
                      fontSize: Math.max(10, h * 0.7),
                    });
                  }
                }
                removeThis = true;
             }
          }
          if (removeThis) {
             pAnnots.remove(i);
          }
        }
      }
    }

    if (acroForm) {
      acroForm.delete(PDFName.of("XFA"));
    }

    const cleanedBytes = await doc.save();
    return { cleanedBytes, extractedAnnotations: newAnnotations };
  } catch (err) {
    console.warn("Could not parse annotations:", err);
    return { cleanedBytes: bytes, extractedAnnotations: [] };
  }
}

function PageThumbnailCard({
  pageNumber,
  pdfDocProxy,
  isActive,
  onClick,
  onDelete,
  onRotateCw,
  onRotateCcw,
}: {
  key?: React.Key;
  pageNumber: number;
  pdfDocProxy: any;
  isActive: boolean;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
  onRotateCw: (e: React.MouseEvent) => void;
  onRotateCcw: (e: React.MouseEvent) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
        setMenuPosition(null);
      }
    };
    if (isMenuOpen || menuPosition) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isMenuOpen, menuPosition]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuPosition({ x: e.clientX, y: e.clientY });
    setIsMenuOpen(true);
  };

  useEffect(() => {
    let isCancelled = false;
    let renderTask: any = null;

    async function renderThumbnail() {
      if (!pdfDocProxy || !canvasRef.current) return;
      try {
        setIsLoading(true);
        const page = await pdfDocProxy.getPage(pageNumber);
        if (isCancelled) return;

        const viewport = page.getViewport({ scale: 0.22 });
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        renderTask = page.render({
          canvasContext: ctx,
          viewport: viewport,
        });

        await renderTask.promise;
        if (!isCancelled) setIsLoading(false);
      } catch (err: any) {
        if (err?.name !== "RenderingCancelledException") {
          console.warn("Thumbnail render failed for page", pageNumber, err);
        }
      }
    }

    renderThumbnail();

    return () => {
      isCancelled = true;
      if (renderTask) {
        try {
          renderTask.cancel();
        } catch (_) {}
      }
    };
  }, [pdfDocProxy, pageNumber]);

  return (
    <div
      onClick={onClick}
      onContextMenu={handleContextMenu}
      className={`group relative flex flex-col items-center p-2 rounded-xl border transition-all cursor-pointer ${
        isActive
          ? "border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/50 ring-2 ring-indigo-500/50 shadow-md"
          : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-xs"
      }`}
    >
      <div className="relative w-full aspect-[1/1.3] bg-slate-100 dark:bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center border border-slate-200/80 dark:border-slate-700/80">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-slate-900 text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
          </div>
        )}
        <canvas ref={canvasRef} className="max-w-full max-h-full object-contain shadow-xs" />

        {/* Hover Quick Action Buttons */}
        <div className="absolute top-1.5 right-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRotateCw(e);
            }}
            title={`Rotate page ${pageNumber} 90° Clockwise`}
            className="p-1 bg-slate-900/80 hover:bg-slate-900 text-white rounded-md shadow-md transition-colors cursor-pointer"
          >
            <RotateCw className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRotateCcw(e);
            }}
            title={`Rotate page ${pageNumber} 90° Counter-Clockwise`}
            className="p-1 bg-slate-900/80 hover:bg-slate-900 text-white rounded-md shadow-md transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(e);
            }}
            title={`Delete page ${pageNumber}`}
            className="p-1 bg-rose-600 hover:bg-rose-700 text-white rounded-md shadow-md transition-colors cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
              setMenuPosition({ x: rect.left, y: rect.bottom + 4 });
              setIsMenuOpen(true);
            }}
            title="Page Context Menu"
            className="p-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md shadow-md transition-colors cursor-pointer"
          >
            <MoreVertical className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="mt-1.5 flex items-center justify-between w-full px-1">
        <span
          className={`text-[11px] font-bold ${
            isActive
              ? "text-indigo-600 dark:text-indigo-400"
              : "text-slate-600 dark:text-slate-300"
          }`}
        >
          Page {pageNumber}
        </span>
        {isActive && (
          <span className="text-[9px] font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/60 px-1.5 py-0.5 rounded-md">
            Active
          </span>
        )}
      </div>

      {/* Context Menu Popup */}
      {isMenuOpen && menuPosition && (
        <div
          ref={menuRef}
          style={{
            position: "fixed",
            left: Math.min(menuPosition.x, window.innerWidth - 190),
            top: Math.min(menuPosition.y, window.innerHeight - 150),
          }}
          className="z-50 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 py-1.5 text-xs text-slate-800 dark:text-slate-200 animate-in fade-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700/80 mb-1">
            Page {pageNumber} Options
          </div>
          <button
            onClick={(e) => {
              setIsMenuOpen(false);
              setMenuPosition(null);
              onRotateCw(e);
            }}
            className="w-full text-left px-3 py-2 hover:bg-indigo-50 dark:hover:bg-slate-700/80 flex items-center gap-2 font-medium transition-colors cursor-pointer text-slate-700 dark:text-slate-200"
          >
            <RotateCw className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Rotate 90° Clockwise</span>
          </button>
          <button
            onClick={(e) => {
              setIsMenuOpen(false);
              setMenuPosition(null);
              onRotateCcw(e);
            }}
            className="w-full text-left px-3 py-2 hover:bg-indigo-50 dark:hover:bg-slate-700/80 flex items-center gap-2 font-medium transition-colors cursor-pointer text-slate-700 dark:text-slate-200"
          >
            <RotateCcw className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Rotate 90° Counter-CW</span>
          </button>
          <div className="border-t border-slate-100 dark:border-slate-700/80 my-1" />
          <button
            onClick={(e) => {
              setIsMenuOpen(false);
              setMenuPosition(null);
              onDelete(e);
            }}
            className="w-full text-left px-3 py-2 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center gap-2 font-medium transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
            <span>Delete Page</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default function App() {
  // Mobile router interception
  const searchParams = new URLSearchParams(window.location.search);
  const mobileSessionId = searchParams.get("sessionId");
  const isMobileRoute = window.location.pathname.startsWith("/mobile-sign");

  if (isMobileRoute) {
    return <MobileSignPage sessionId={mobileSessionId || ""} />;
  }

  // PDF File state
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string>("");
  const [pdfDocProxy, setPdfDocProxy] = useState<any>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [zoomScale, setZoomScale] = useState<number>(1.2);
  const [deletePageRange, setDeletePageRange] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [originalPageSize, setOriginalPageSize] = useState<PDFPageSize>({
    width: 595,
    height: 842,
  }); // Default A4
  const [canvasDimensions, setCanvasDimensions] = useState({
    width: 595,
    height: 842,
  });

  // Canvas and interaction state
  const [annotations, setAnnotations] = useState<AnnotationItem[]>([]);
  const [savedSignatures, setSavedSignatures] = useState<SavedSignature[]>([]);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<
    string | null
  >(null);
  const [toolMode, setToolMode] = useState<ToolMode>("select");

  // History state for undo/redo
  const [history, setHistory] = useState<{
    timeline: {
      annotations: AnnotationItem[];
      description: string;
      id: string;
    }[];
    currentIndex: number;
  }>({
    timeline: [{ annotations: [], description: "Document loaded", id: "init" }],
    currentIndex: 0,
  });

  const [isPdfMergeModalOpen, setIsPdfMergeModalOpen] = useState(false);
  const [isPdfCompressModalOpen, setIsPdfCompressModalOpen] = useState(false);
  const [shapeContextMenu, setShapeContextMenu] = useState<{
    annId: string;
    x: number;
    y: number;
  } | null>(null);

  // Auto-Save and PWA state
  const [autoSaveStatus, setAutoSaveStatus] = useState<
    "saved" | "saving" | "restored" | "idle"
  >("idle");
  const [restoredNotice, setRestoredNotice] = useState<{
    fileName: string;
    annotationsCount: number;
    timestamp: number;
  } | null>(null);
  const [isAutoSaveLoaded, setIsAutoSaveLoaded] = useState(false);

  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<any>(null);
  const [isAppInstalled, setIsAppInstalled] = useState(false);

  // Listen for PWA install prompt
  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredInstallPrompt(e);
    };
    const handleAppInstalled = () => {
      setIsAppInstalled(true);
      setDeferredInstallPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleTriggerPwaInstall = async () => {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      const choice = await deferredInstallPrompt.userChoice;
      if (choice && choice.outcome === "accepted") {
        setIsAppInstalled(true);
      }
      setDeferredInstallPrompt(null);
    } else {
      alert(
        "To install Secure PDF on your mobile phone:\n\n" +
          "• iOS (Safari): Tap Share button → 'Add to Home Screen'\n" +
          "• Android (Chrome): Tap '⋮' Menu → 'Add to Home screen' or 'Install App'",
      );
    }
  };

  // 1. Initial Load from IndexedDB
  useEffect(() => {
    async function restoreSession() {
      try {
        const session = await loadAutoSaveSession();
        if (session && session.pdfBytes && session.pdfBytes.byteLength > 0) {
          setPdfBytes(session.pdfBytes);
          setPdfFileName(session.pdfFileName || "Restored_Document.pdf");
          setCurrentPage(session.currentPage || 1);
          setAnnotations(session.annotations || []);
          if (session.savedSignatures && session.savedSignatures.length > 0) {
            setSavedSignatures(session.savedSignatures);
          }
          setRestoredNotice({
            fileName: session.pdfFileName || "Restored_Document.pdf",
            annotationsCount: (session.annotations || []).length,
            timestamp: session.timestamp,
          });
          setAutoSaveStatus("restored");
          addLog(
            "Restored document state from IndexedDB auto-save session",
            "info",
          );
        }
      } catch (err) {
        console.warn("Failed to load auto-save session:", err);
      } finally {
        setIsAutoSaveLoaded(true);
      }
    }
    restoreSession();
  }, []);

  // 2. Debounced Auto-Save to IndexedDB
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isAutoSaveLoaded) return;
    if (!pdfBytes) return;

    setAutoSaveStatus("saving");
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        await saveAutoSaveSession({
          pdfBytes,
          pdfFileName,
          currentPage,
          annotations,
          savedSignatures,
          timestamp: Date.now(),
        });
        setAutoSaveStatus("saved");
      } catch (err) {
        console.warn("Auto-save to IndexedDB failed:", err);
        setAutoSaveStatus("idle");
      }
    }, 800);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [
    pdfBytes,
    pdfFileName,
    currentPage,
    annotations,
    savedSignatures,
    isAutoSaveLoaded,
  ]);

  useEffect(() => {
    const handleGlobalClick = () => setShapeContextMenu(null);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShapeContextMenu(null);
    };
    window.addEventListener("click", handleGlobalClick);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("click", handleGlobalClick);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const resetAnnotations = (initialAnns: AnnotationItem[] = []) => {
    setAnnotations(initialAnns);
    setHistory({
      timeline: [
        {
          annotations: initialAnns,
          description: "Document loaded",
          id: Date.now().toString(),
        },
      ],
      currentIndex: 0,
    });
  };

  const dispatchAnnotationUpdate = (
    updater: AnnotationItem[] | ((prev: AnnotationItem[]) => AnnotationItem[]),
    description: string,
  ) => {
    setAnnotations((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;

      setHistory((currHist) => {
        const newTimeline = currHist.timeline.slice(
          0,
          currHist.currentIndex + 1,
        );
        newTimeline.push({
          annotations: next,
          description,
          id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        });
        return {
          timeline: newTimeline,
          currentIndex: newTimeline.length - 1,
        };
      });

      return next;
    });
  };

  const undo = () => {
    setHistory((currHist) => {
      if (currHist.currentIndex > 0) {
        const newIndex = currHist.currentIndex - 1;
        setAnnotations(currHist.timeline[newIndex].annotations);
        return { ...currHist, currentIndex: newIndex };
      }
      return currHist;
    });
  };

  const redo = () => {
    setHistory((currHist) => {
      if (currHist.currentIndex < currHist.timeline.length - 1) {
        const newIndex = currHist.currentIndex + 1;
        setAnnotations(currHist.timeline[newIndex].annotations);
        return { ...currHist, currentIndex: newIndex };
      }
      return currHist;
    });
  };

  const jumpToHistory = (index: number) => {
    setHistory((currHist) => {
      if (index >= 0 && index < currHist.timeline.length) {
        setAnnotations(currHist.timeline[index].annotations);
        return { ...currHist, currentIndex: index };
      }
      return currHist;
    });
  };

  // Selected sub-tool attributes
  const [textFontSize, setTextFontSize] = useState<number>(14);
  const [textFontColor, setTextFontColor] = useState<string>("#0e1118");
  const [textFontFamily, setTextFontFamily] = useState<string>("Helvetica");
  const [activeStampType, setActiveStampType] = useState<StampType>("APPROVED");

  // Ink drawing state
  const [isDrawingInk, setIsDrawingInk] = useState<boolean>(false);
  const [currentInkPoints, setCurrentInkPoints] = useState<
    { x: number; y: number }[]
  >([]);
  const [inkColor, setInkColor] = useState<string>("#b22222"); // Crimson red default
  const [inkWidth, setInkWidth] = useState<number>(3);

  // Redact drawing state
  const [isDrawingRedact, setIsDrawingRedact] = useState<boolean>(false);
  const [redactStart, setRedactStart] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [redactCurrent, setRedactCurrent] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // Signatures list
  const [isSignatureModalOpen, setIsSignatureModalOpen] =
    useState<boolean>(false);
  const [isFindAndRedactOpen, setIsFindAndRedactOpen] =
    useState<boolean>(false);

  // Sandbox privacy elements
  const [isPurging, setIsPurging] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [activeMenu, setActiveMenu] = useState<
    "file" | "edit" | "insert" | "view" | "help" | null
  >(null);
  const [isKeyboardHelpOpen, setIsKeyboardHelpOpen] = useState<boolean>(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState<boolean>(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [draggedElementId, setDraggedElementId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeDirection, setResizeDirection] = useState<"br" | null>(null);

  // References
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const xfaLayerRef = useRef<HTMLDivElement>(null);
  const annotationLayerRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<any>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const menuBarRef = useRef<HTMLDivElement>(null);
  const sidebarContainerRef = useRef<HTMLDivElement>(null);
  const thumbnailRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

  // Auto-scroll sidebar thumbnail list so the active page slides smoothly to the top position
  useEffect(() => {
    if (!isSidebarOpen || !currentPage) return;
    const timer = setTimeout(() => {
      const container = sidebarContainerRef.current;
      const activeCard = thumbnailRefs.current[currentPage];
      if (container && activeCard) {
        // Calculate target scrollTop so active card aligns smoothly at the top
        const targetScrollTop = activeCard.offsetTop - container.offsetTop - 12; // 12px padding offset
        container.scrollTo({
          top: Math.max(0, targetScrollTop),
          behavior: "smooth",
        });
      }
    }, 40);
    return () => clearTimeout(timer);
  }, [currentPage, isSidebarOpen, numPages]);

  // Click outside menu bar listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuBarRef.current &&
        !menuBarRef.current.contains(e.target as Node)
      ) {
        setActiveMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        redo();
      } else if (
        !isInput &&
        (e.key === "ArrowLeft" || e.key === "ArrowUp" || e.key === "PageUp")
      ) {
        e.preventDefault();
        setCurrentPage((prev) => Math.max(prev - 1, 1));
      } else if (
        !isInput &&
        (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === "PageDown")
      ) {
        e.preventDefault();
        setCurrentPage((prev) =>
          numPages ? Math.min(prev + 1, numPages) : prev,
        );
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [history, numPages]);

  // App initialization log
  useEffect(() => {
    // Logs removed per user request
  }, []);

  // Helper log generator (No-op)
  const addLog = (
    message: string,
    type: "info" | "success" | "warning" | "security" = "info",
  ) => {
    // no-op
  };

  // Convert Hex color to RGB object
  const hexToRgb = (
    hex: string | undefined,
  ): { r: number; g: number; b: number } | null => {
    if (!hex) return null;
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    const fullHex = hex.replace(
      shorthandRegex,
      (_, r, g, b) => r + r + g + g + b + b,
    );
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  };

  // Conversion: base64 data to ArrayBuffer
  const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
    const binaryString = window.atob(base64.split(",")[1]);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  };

  // PDF.js PDF page loading & rendering
  useEffect(() => {
    if (!pdfBytes) return;

    const renderPDFPage = async () => {
      try {
        setLoading(true);
        // Clear previous render tasks
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
        }

        // Initialize doc proxy if not exists or if bytes change
        let docProxy = pdfDocProxy;
        if (!docProxy) {
          addLog("Parsing document binary array metadata...", "info");
          // Pass absolute clone of bytes buffer to avoid proxy freezing
          const loadingTask = pdfjsLib.getDocument({
            data: pdfBytes.slice(0),
            enableXfa: true,
            cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
            cMapPacked: true,
            standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/standard_fonts/`,
          });
          docProxy = await loadingTask.promise;
          setPdfDocProxy(docProxy);
          setNumPages(docProxy.numPages);
          addLog(
            `Document parsed successfully. Total pages: ${docProxy.numPages}`,
            "success",
          );
        }

        const page = await docProxy.getPage(currentPage);

        // Fetch base scale page sizes
        const originalViewport = page.getViewport({ scale: 1.0 });
        const width_original = originalViewport.width;
        const height_original = originalViewport.height;
        setOriginalPageSize({ width: width_original, height: height_original });

        // Calculate and apply scaled displays
        const viewport = page.getViewport({ scale: zoomScale });
        const canvas = canvasRef.current;
        if (canvas) {
          const context = canvas.getContext("2d");
          if (context) {
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            setCanvasDimensions({
              width: viewport.width,
              height: viewport.height,
            });

            const renderContext = {
              canvasContext: context,
              viewport: viewport,
            };

            const renderTask = page.render(renderContext);
            renderTaskRef.current = renderTask;
            await renderTask.promise;

            // XFA rendering
            try {
              const xfaData = await page.getXfa();
              if (xfaData && xfaLayerRef.current) {
                xfaLayerRef.current.innerHTML = "";
                pdfjsLib.XfaLayer.render({
                  viewport: viewport.clone({ dontFlip: true }),
                  div: xfaLayerRef.current,
                  xfaHtml: xfaData,
                  annotationStorage: docProxy.annotationStorage,
                  linkService: null as any,
                });
              } else if (xfaLayerRef.current) {
                xfaLayerRef.current.innerHTML = "";
              }
            } catch (xfaErr) {
              console.warn(
                "XFA layer not available or failed rendering:",
                xfaErr,
              );
            }

            // Standard Annotation rendering (AcroForms)
            try {
              if (annotationLayerRef.current) {
                annotationLayerRef.current.innerHTML = "";
                const annotationsData = await page.getAnnotations();
                const annotationLayer = new pdfjsLib.AnnotationLayer({
                  page,
                  viewport: viewport.clone({ dontFlip: true }),
                  div: annotationLayerRef.current,
                  annotationStorage: docProxy.annotationStorage,
                  linkService: null as any,
                  accessibilityManager: null,
                  annotationCanvasMap: null,
                  annotationEditorUIManager: null,
                  structTreeLayer: null,
                  commentManager: null,
                });
                await annotationLayer.render({
                  viewport: viewport.clone({ dontFlip: true }),
                  div: annotationLayerRef.current,
                  annotations: annotationsData,
                  page: page,
                  linkService: null as any,
                  annotationStorage: docProxy.annotationStorage,
                  renderForms: true,
                });
              }
            } catch (annErr) {
              console.warn("Annotation layer rendering failed:", annErr);
            }

            addLog(
              `Rendered page ${currentPage} successfully at zoom ${Math.round(zoomScale * 100)}%`,
              "info",
            );
          }
        }
        setLoading(false);
      } catch (err: any) {
        if (err.name === "RenderingCancelledException") {
          // Normal during zooming, ignore
          return;
        }
        console.error("PDF Render Error:", err);
        addLog(`PDF Loader Error: ${err.message}`, "warning");
        setLoading(false);
        // Clear invalid pdf bytes
        if (err.name === "InvalidPDFException" || err.message?.includes("Invalid PDF structure")) {
          setPdfBytes(null);
          setPdfDocProxy(null);
          setPdfFileName("");
          addLog("Invalid PDF file selected. Please choose a valid PDF document.", "warning");
        }
      }
    };

    renderPDFPage();
  }, [pdfBytes, currentPage, zoomScale, pdfDocProxy]);

  // Track dynamic window resizing or zoom adjustment scales
  const scaleMultiplier = canvasDimensions.width / originalPageSize.width;

  // Handle local File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();
    reader.onload = () => {
      const arrayBuffer = reader.result as ArrayBuffer;
      setPdfBytes(new Uint8Array(arrayBuffer));
      setPdfFileName(file.name);
      setPdfDocProxy(null); // Force rebuild proxy
      setCurrentPage(1);
      resetAnnotations([]); // Reset edits
      setSelectedAnnotationId(null);
      addLog(`Securely imported raw PDF bytes for: ${file.name}`, "success");
    };
    reader.readAsArrayBuffer(file);
  };

  const loadMergedPdf = (mergedPdfBytes: Uint8Array, fileName: string) => {
    setLoading(true);
    setPdfBytes(mergedPdfBytes);
    setPdfFileName(fileName);
    setPdfDocProxy(null);
    setCurrentPage(1);
    resetAnnotations([]);
    setSelectedAnnotationId(null);
    addLog(`Securely imported merged PDF: ${fileName}`, "success");
  };

  // Generate dynamic sample agreement so users can play without finding a PDF file!
  const loadSampleAgreement = async () => {
    setLoading(true);
    addLog(
      "Generating interactive ledger mockup using local vector stream...",
      "info",
    );
    try {
      const ledgerBytes = await createSamplePDF();
      setPdfBytes(new Uint8Array(ledgerBytes));
      setPdfFileName("Secure_Transaction_Sandbox.pdf");
      setPdfDocProxy(null); // Reset proxy
      setCurrentPage(1);
      resetAnnotations([]); // Reset edit layers
      setSelectedAnnotationId(null);
      addLog("Sample isolation file generated successfully!", "success");
    } catch (err: any) {
      addLog(`Failed to compile sample: ${err.message}`, "warning");
    } finally {
      setLoading(false);
    }
  };

  // Create crisp sample agreements programmatically using pdf-lib (100% Client-Side)!
  const createSamplePDF = async (): Promise<ArrayBuffer> => {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // Standard A4 points
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const logoColor = rgb(0.06, 0.44, 0.3); // Secure deep forest teal

    // Header banner carbon plate
    page.drawRectangle({
      x: 0,
      y: 775,
      width: 595,
      height: 67,
      color: rgb(0.09, 0.12, 0.15),
    });

    page.drawText("[SECURE] CLIENT ENVIRONMENT PRIVATE SANDBOX", {
      x: 35,
      y: 810,
      size: 13,
      font: boldFont,
      color: rgb(1, 1, 1),
    });

    page.drawText(
      "100% LOCAL COMPILATION RUNTIME • ZERO OUTBOUND TRAFFIC DETECTED",
      {
        x: 35,
        y: 794,
        size: 8,
        font: font,
        color: rgb(0.6, 0.8, 0.7),
      },
    );

    // Content Outline
    page.drawText("MUTUAL NDA, TRANSACTION, & CONSENT FORM", {
      x: 35,
      y: 725,
      size: 16,
      font: boldFont,
      color: rgb(0.12, 0.15, 0.18),
    });

    page.drawText("Transaction ID: TSX-9082-MEMSEC • Generated: June 2, 2026", {
      x: 35,
      y: 705,
      size: 9,
      font: font,
      color: rgb(0.4, 0.5, 0.5),
    });

    page.drawText(
      "The recipient of this document is testing a high-privacy PDF signer environment.",
      {
        x: 35,
        y: 665,
        size: 10.5,
        font: font,
      },
    );
    page.drawText(
      "All textual typing, hand-drawn vector elements, and stamps exist inside RAM buffers.",
      {
        x: 35,
        y: 650,
        size: 10.5,
        font: font,
      },
    );

    // Data table box
    page.drawRectangle({
      x: 35,
      y: 535,
      width: 525,
      height: 90,
      borderColor: rgb(0.8, 0.83, 0.87),
      borderWidth: 1,
    });

    // Table Header
    page.drawRectangle({
      x: 35,
      y: 600,
      width: 525,
      height: 25,
      color: rgb(0.94, 0.96, 0.98),
    });

    page.drawText("ITEM / PROTOCOL", {
      x: 45,
      y: 608,
      size: 9,
      font: boldFont,
      color: rgb(0.2, 0.3, 0.3),
    });
    page.drawText("SECURITY BOUNDARY STATEMENT", {
      x: 220,
      y: 608,
      size: 9,
      font: boldFont,
      color: rgb(0.2, 0.3, 0.3),
    });
    page.drawText("VERDICT", {
      x: 450,
      y: 608,
      size: 9,
      font: boldFont,
      color: rgb(0.2, 0.3, 0.3),
    });

    const rows = [
      {
        item: "Local V8 VM Heap",
        detail: "Ephemerally allocated, zero persistency tags",
        verdict: "SECURED",
      },
      {
        item: "Signature Image",
        detail: "Drawn in SVG vector bounds, zero server logs",
        verdict: "ENCRYPTED",
      },
      {
        item: "Data Disposal",
        detail: "Hard garbage collection triggered on Burn Session",
        verdict: "PENDING",
      },
    ];

    rows.forEach((row, idx) => {
      const yLine = 575 - idx * 22;
      page.drawText(row.item, { x: 45, y: yLine, size: 9, font: font });
      page.drawText(row.detail, { x: 220, y: yLine, size: 9, font: font });
      page.drawText(row.verdict, {
        x: 450,
        y: yLine,
        size: 9,
        font: boldFont,
        color: idx === 2 ? rgb(0.85, 0.5, 0.1) : rgb(0.06, 0.44, 0.3),
      });

      if (idx < 2) {
        page.drawLine({
          start: { x: 35, y: yLine - 5 },
          end: { x: 560, y: yLine - 5 },
          color: rgb(0.9, 0.93, 0.95),
          thickness: 1,
        });
      }
    });

    // Sub-segment Isolation terms
    page.drawText("SECURITY DISCRIMINANT AGREEMENTS", {
      x: 35,
      y: 495,
      size: 11,
      font: boldFont,
      color: logoColor,
    });

    const clauses = [
      "1. No telemetry packets: Clicking buttons or drawing sigs releases no webhook triggers.",
      "2. Memory Isolation: The PDF document is never sent to a background node script processes.",
      "3. Complete purging paradigm: Tab shutdown completely overwrites browser execution.",
      "4. Strict sandboxed canvas rendering prevents any graphic cache leaking.",
    ];

    clauses.forEach((cls, i) => {
      page.drawText(cls, {
        x: 35,
        y: 472 - i * 16,
        size: 9,
        font: font,
        color: rgb(0.3, 0.33, 0.35),
      });
    });

    // Signature placeholders boxes
    page.drawRectangle({
      x: 35,
      y: 160,
      width: 240,
      height: 95,
      borderColor: rgb(0.8, 0.83, 0.87),
      borderWidth: 1,
      color: rgb(0.99, 1.0, 1.0),
    });
    page.drawText("PRIMARY ACCOUNT DIGITAL SIGNATURE", {
      x: 45,
      y: 240,
      size: 8.5,
      font: boldFont,
      color: rgb(0.3, 0.33, 0.35),
    });
    page.drawText("Click and place your handwritten signature here.", {
      x: 45,
      y: 172,
      size: 8,
      font: font,
      color: rgb(0.5, 0.55, 0.6),
    });

    page.drawRectangle({
      x: 320,
      y: 160,
      width: 240,
      height: 95,
      borderColor: rgb(0.8, 0.83, 0.87),
      borderWidth: 1,
      color: rgb(0.99, 1.0, 1.0),
    });
    page.drawText("ADMIN VERIFICATION SEAL AND DATE", {
      x: 330,
      y: 240,
      size: 8.5,
      font: boldFont,
      color: rgb(0.3, 0.33, 0.35),
    });
    page.drawText("Place date stamps or APPROVED emblems here.", {
      x: 330,
      y: 172,
      size: 8,
      font: font,
      color: rgb(0.5, 0.55, 0.6),
    });

    page.drawText("--- Isolated Client-Sandbox Document Registry ---", {
      x: 180,
      y: 100,
      size: 9.5,
      font: font,
      color: rgb(0.6, 0.65, 0.7),
    });

    return await pdfDoc.save();
  };

  // Clear states securely (Self-Destruct Sequence)
  const executeSecurePurge = () => {
    setIsPurging(true);
    addLog("CRITICAL! Initiated self-destruction of memory arrays!", "warning");
  };

  const handlePurgeFinished = () => {
    // Clear IndexedDB auto-save session
    clearAutoSaveSession().catch(console.warn);

    // Zero-out arrays before resetting references
    if (pdfBytes) {
      pdfBytes.fill(0); // Physically overwrite bytes in RAM with absolute zeroes!
    }

    // Purge React fields
    setPdfBytes(null);
    setPdfFileName("");
    setPdfDocProxy(null);
    resetAnnotations([]);
    setSavedSignatures([]);
    setSelectedAnnotationId(null);
    setIsPurging(false);

    // Trigger window location reset to wipe V8 state heaps
    window.location.reload();
  };

  // Navigation page controls
  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((p) => p - 1);
      setSelectedAnnotationId(null);
    }
  };

  const nextPage = () => {
    if (currentPage < numPages) {
      setCurrentPage((p) => p + 1);
      setSelectedAnnotationId(null);
    }
  };

  const handleZoomIn = () => {
    setZoomScale((z) => Math.min(3.0, z + 0.15));
  };

  const handleZoomOut = () => {
    setZoomScale((z) => Math.max(0.6, z - 0.15));
  };

  // Canvas clicking listener (for adding text/stamps)
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (toolMode === "select" || toolMode === "draw") return;
    if (!overlayRef.current) return;

    const rect = overlayRef.current.getBoundingClientRect();
    const clickX_px = e.clientX - rect.left;
    const clickY_px = e.clientY - rect.top;

    // Convert pixel click coordinates back to original PDF points units
    const pdfX = clickX_px / scaleMultiplier;
    const pdfY = clickY_px / scaleMultiplier;

    if (toolMode === "text") {
      const newTextAnn: AnnotationItem = {
        id: `ann_text_${Date.now()}`,
        type: "text",
        pageNumber: currentPage,
        x: pdfX - 10,
        y: pdfY - 14,
        width: 150,
        height: 24,
        text: "Type text here",
        fontSize: textFontSize,
        fontColor: textFontColor,
        fontFamily: textFontFamily,
        userResized: false,
      };

      dispatchAnnotationUpdate(
        (prev) => [...prev, newTextAnn],
        "Added text layer",
      );
      setSelectedAnnotationId(newTextAnn.id);
      addLog("Placed editable text block layer on page.", "info");
    } else if (toolMode === "shape") {
      const newShapeAnn: AnnotationItem = {
        id: `ann_shape_${Date.now()}`,
        type: "shape",
        pageNumber: currentPage,
        x: pdfX - 50,
        y: pdfY - 25,
        width: 100,
        height: 50,
        shapeType: "rectangle",
        shapeFillColor: "#ffffff",
        hasFill: true,
        shapeStrokeColor: "#000000",
        shapeStrokeWidth: 2,
        hasStroke: true,
      };
      dispatchAnnotationUpdate(
        (prev) => [...prev, newShapeAnn],
        "Added white masking shape layer",
      );
      setSelectedAnnotationId(newShapeAnn.id);
      setToolMode("select");
      addLog("Placed white masking shape on page.", "info");
    } else if (toolMode === "stamp") {
      const stampWidth =
        activeStampType === "CHECKMARK" || activeStampType === "CROSS"
          ? 32
          : 120;
      const stampHeight =
        activeStampType === "CHECKMARK" || activeStampType === "CROSS"
          ? 32
          : 55;

      const newStampAnn: AnnotationItem = {
        id: `ann_stamp_${Date.now()}`,
        type: "stamp",
        pageNumber: currentPage,
        x: pdfX - stampWidth / 2,
        y: pdfY - stampHeight / 2,
        width: stampWidth,
        height: stampHeight,
        stampType: activeStampType,
      };

      dispatchAnnotationUpdate(
        (prev) => [...prev, newStampAnn],
        "Placed stamp layer",
      );
      setSelectedAnnotationId(newStampAnn.id);
      setToolMode("select");
      addLog(`Stamp [${activeStampType}] dropped onto target page.`, "info");
    }
  };

  // Placement of saved signatures on page
  const placeSavedSignature = (sig: SavedSignature) => {
    // Drop signature near center of active viewport bounds
    const pdf_centerX = originalPageSize.width / 2 - 80;
    const pdf_centerY = originalPageSize.height / 2 - 40;

    const signatureAnn: AnnotationItem = {
      id: `ann_sig_${Date.now()}`,
      type: "signature",
      pageNumber: currentPage,
      x: pdf_centerX,
      y: pdf_centerY,
      width: 160,
      height: 60,
      signatureDataUrl: sig.dataUrl,
    };

    dispatchAnnotationUpdate(
      (prev) => [...prev, signatureAnn],
      "Added signature seal",
    );
    setSelectedAnnotationId(signatureAnn.id);
    setToolMode("select");
    addLog("Placed digital signature seal onto active document.", "success");
  };

  // Drawing event handlers in draw mode
  const handleInkStart = (
    e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>,
  ) => {
    if (toolMode !== "draw") return;
    if (!overlayRef.current) return;

    const rect = overlayRef.current.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ("touches" in e) {
      if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        return;
      }
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const startX_px = clientX - rect.left;
    const startY_px = clientY - rect.top;

    // Convert to PDF resolution points
    const pdfX = startX_px / scaleMultiplier;
    const pdfY = startY_px / scaleMultiplier;

    setIsDrawingInk(true);
    setCurrentInkPoints([{ x: pdfX, y: pdfY }]);
  };

  const handleInkMove = (
    e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>,
  ) => {
    if (!isDrawingInk || toolMode !== "draw" || !overlayRef.current) return;

    const rect = overlayRef.current.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ("touches" in e) {
      if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        return;
      }
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const curX_px = clientX - rect.left;
    const curY_px = clientY - rect.top;

    const pdfX = curX_px / scaleMultiplier;
    const pdfY = curY_px / scaleMultiplier;

    setCurrentInkPoints((prev) => [...prev, { x: pdfX, y: pdfY }]);
  };

  const handleInkEnd = () => {
    if (!isDrawingInk) return;
    setIsDrawingInk(false);

    if (currentInkPoints.length < 2) {
      setCurrentInkPoints([]);
      return;
    }

    // Capture min and max boundingbox
    const xs = currentInkPoints.map((p) => p.x);
    const ys = currentInkPoints.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    // Save as normalized relative drawing item
    const drawAnn: AnnotationItem = {
      id: `ann_draw_${Date.now()}`,
      type: "drawing",
      pageNumber: currentPage,
      x: minX,
      y: minY,
      width: Math.max(10, maxX - minX),
      height: Math.max(10, maxY - minY),
      drawingPoints: currentInkPoints,
      drawingColor: inkColor,
      drawingWidth: inkWidth,
    };

    dispatchAnnotationUpdate(
      (prev) => [...prev, drawAnn],
      "Added drawing layer",
    );
    addLog("Saved hand-drawn stroke as vector layer.", "info");
    setCurrentInkPoints([]);
  };

  const handleRedactStart = (
    e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>,
  ) => {
    if (toolMode !== "redact" || !overlayRef.current) return;

    const rect = overlayRef.current.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ("touches" in e) {
      if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else return;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const startX_px = clientX - rect.left;
    const startY_px = clientY - rect.top;

    const pdfX = startX_px / scaleMultiplier;
    const pdfY = startY_px / scaleMultiplier;

    setIsDrawingRedact(true);
    setRedactStart({ x: pdfX, y: pdfY });
    setRedactCurrent({ x: pdfX, y: pdfY });
  };

  const handleRedactMove = (
    e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>,
  ) => {
    if (!isDrawingRedact || toolMode !== "redact" || !overlayRef.current)
      return;

    const rect = overlayRef.current.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ("touches" in e) {
      if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else return;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const curX_px = clientX - rect.left;
    const curY_px = clientY - rect.top;

    const pdfX = curX_px / scaleMultiplier;
    const pdfY = curY_px / scaleMultiplier;

    setRedactCurrent({ x: pdfX, y: pdfY });
  };

  const handleRedactEnd = async () => {
    if (!isDrawingRedact || !redactStart || !redactCurrent) return;
    setIsDrawingRedact(false);

    const minX = Math.min(redactStart.x, redactCurrent.x);
    const maxX = Math.max(redactStart.x, redactCurrent.x);
    const minY = Math.min(redactStart.y, redactCurrent.y);
    const maxY = Math.max(redactStart.y, redactCurrent.y);

    let width = maxX - minX;
    let height = maxY - minY;

    let finalX = minX;
    let finalY = minY;

    if (width <= 5 || height <= 5) {
      // Smart redact: find text under cursor
      if (pdfDocProxy) {
        try {
          const page = await pdfDocProxy.getPage(currentPage);
          const textContent = await page.getTextContent();
          const viewport = page.getViewport({ scale: 1.0 });

          interface TextRect {
            left: number;
            right: number;
            top: number;
            bottom: number;
            baselineY: number;
            str: string;
          }

          const textRects: TextRect[] = [];
          for (const item of textContent.items) {
            if ("str" in item && item.str.trim() !== "") {
              const tx = item.transform[4];
              const ty = item.transform[5];
              const baselineY = viewport.height - ty;
              const itemTop = baselineY - item.height;
              const itemBottom = baselineY + item.height * 0.2;
              const itemLeft = tx;
              const itemRight = tx + item.width;
              textRects.push({
                left: itemLeft,
                right: itemRight,
                top: itemTop,
                bottom: itemBottom,
                baselineY,
                str: item.str,
              });
            }
          }

          textRects.sort((a, b) => {
            if (Math.abs(a.baselineY - b.baselineY) > 5) {
              return a.baselineY - b.baselineY;
            }
            return a.left - b.left;
          });

          const groupedRects: TextRect[] = [];
          if (textRects.length > 0) {
            let currentGroup = { ...textRects[0] };
            for (let i = 1; i < textRects.length; i++) {
              const rect = textRects[i];
              const isSameLine =
                Math.abs(currentGroup.baselineY - rect.baselineY) <= 5;
              const isClose = rect.left - currentGroup.right <= 25;

              if (isSameLine && isClose) {
                currentGroup.right = Math.max(currentGroup.right, rect.right);
                currentGroup.left = Math.min(currentGroup.left, rect.left);
                currentGroup.top = Math.min(currentGroup.top, rect.top);
                currentGroup.bottom = Math.max(
                  currentGroup.bottom,
                  rect.bottom,
                );
                currentGroup.str += " " + rect.str;
              } else {
                groupedRects.push(currentGroup);
                currentGroup = { ...rect };
              }
            }
            groupedRects.push(currentGroup);
          }

          let foundMatch = false;
          for (const group of groupedRects) {
            if (
              redactStart.x >= group.left - 4 &&
              redactStart.x <= group.right + 4 &&
              redactStart.y >= group.top - 4 &&
              redactStart.y <= group.bottom + 4
            ) {
              finalX = group.left;
              finalY = group.top;
              width = group.right - group.left;
              height = group.bottom - group.top;
              foundMatch = true;
              break;
            }
          }

          if (!foundMatch) {
            setRedactStart(null);
            setRedactCurrent(null);
            return;
          }
        } catch (err) {
          console.error("Smart redact failed", err);
          setRedactStart(null);
          setRedactCurrent(null);
          return;
        }
      } else {
        setRedactStart(null);
        setRedactCurrent(null);
        return;
      }
    }

    const redactAnn: AnnotationItem = {
      id: `ann_redact_${Date.now()}`,
      type: "redact",
      pageNumber: currentPage,
      x: finalX,
      y: finalY,
      width,
      height,
    };

    dispatchAnnotationUpdate(
      (prev) => [...prev, redactAnn],
      "Added redact block",
    );
    addLog(
      "Applied redaction block. (Warning: Native save will permanently flatten these pages)",
      "security",
    );

    setRedactStart(null);
    setRedactCurrent(null);
  };

  // Draggable handlers
  const handleDragStart = (e: React.MouseEvent, ann: AnnotationItem) => {
    e.stopPropagation();

    setSelectedAnnotationId(ann.id);
    setDraggedElementId(ann.id);

    const clientX = e.clientX;
    const clientY = e.clientY;

    const elementX_px = ann.x * scaleMultiplier;
    const elementY_px = ann.y * scaleMultiplier;

    setDragOffset({
      x: clientX - elementX_px,
      y: clientY - elementY_px,
    });
  };

  const handleResizeStart = (e: React.MouseEvent, ann: AnnotationItem) => {
    e.stopPropagation();

    setSelectedAnnotationId(ann.id);
    setDraggedElementId(ann.id);
    setResizeDirection("br");

    setDragOffset({
      x: e.clientX,
      y: e.clientY,
    });
  };

  const handleGlobalMouseMoveOrTouch = (e: React.MouseEvent) => {
    if (!draggedElementId) return;

    const ann = annotations.find((a) => a.id === draggedElementId);
    if (!ann) return;

    if (resizeDirection === "br") {
      // Delta-based scale resizing
      const deltaX_px = e.clientX - dragOffset.x;
      const deltaY_px = e.clientY - dragOffset.y;

      const deltaX_pdf = deltaX_px / scaleMultiplier;
      const deltaY_pdf = deltaY_px / scaleMultiplier;

      // Update offsets to current position
      setDragOffset({ x: e.clientX, y: e.clientY });

      setAnnotations((prev) =>
        prev.map((item) => {
          if (item.id === draggedElementId) {
            // Keep bounds in range
            const newW = Math.max(25, item.width + deltaX_pdf);
            const newH = Math.max(15, item.height + deltaY_pdf);
            return { ...item, width: newW, height: newH, userResized: true };
          }
          return item;
        }),
      );
    } else {
      // Move tracking
      const rect = overlayRef.current?.getBoundingClientRect();
      if (!rect) return;

      const currentX_px = e.clientX - rect.left - dragOffset.x;
      const currentY_px = e.clientY - rect.top - dragOffset.y;

      const currentX_pdf = (e.clientX - dragOffset.x) / scaleMultiplier;
      const currentY_pdf = (e.clientY - dragOffset.y) / scaleMultiplier;

      setAnnotations((prev) =>
        prev.map((item) => {
          if (item.id === draggedElementId) {
            // Contain in bounds
            const finalX = Math.max(
              0,
              Math.min(originalPageSize.width - item.width, currentX_pdf),
            );
            const finalY = Math.max(
              0,
              Math.min(originalPageSize.height - item.height, currentY_pdf),
            );
            return { ...item, x: finalX, y: finalY };
          }
          return item;
        }),
      );
    }
  };

  const handleGlobalMouseUp = () => {
    if (draggedElementId) {
      setDraggedElementId(null);
      setResizeDirection(null);
    }
  };

  const handleDeleteAnnotation = (id: string) => {
    dispatchAnnotationUpdate(
      (prev) => prev.filter((a) => a.id !== id),
      "Deleted layer",
    );
    if (selectedAnnotationId === id) {
      setSelectedAnnotationId(null);
    }
    addLog("Annotation layer deleted.", "info");
  };

  const handleDeletePages = async (explicitRange?: string) => {
    if (!pdfBytes || !pdfDocProxy) return;

    setLoading(true);
    try {
      const pdfDoc = await PDFDocument.load(pdfBytes, {
        ignoreEncryption: true,
      });
      const totalPages = pdfDoc.getPageCount();

      let pagesToDelete: number[] = [];
      const rangeToUse =
        typeof explicitRange === "string" ? explicitRange : deletePageRange;

      if (rangeToUse.trim() === "") {
        pagesToDelete = [currentPage];
      } else {
        // Parse range string (e.g., "1-3, 5")
        const parts = rangeToUse.split(",");
        for (const part of parts) {
          const trimmed = part.trim();
          if (trimmed.includes("-")) {
            const [start, end] = trimmed.split("-");
            const startNum = parseInt(start);
            const endNum = parseInt(end);
            if (!isNaN(startNum) && !isNaN(endNum)) {
              const min = Math.min(startNum, endNum);
              const max = Math.max(startNum, endNum);
              for (let i = min; i <= max; i++) {
                pagesToDelete.push(i);
              }
            }
          } else {
            const num = parseInt(trimmed);
            if (!isNaN(num)) {
              pagesToDelete.push(num);
            }
          }
        }
      }

      // Filter out invalid pages and deduplicate
      pagesToDelete = [...new Set(pagesToDelete)].filter(
        (p) => p >= 1 && p <= totalPages,
      );

      if (pagesToDelete.length === 0) {
        addLog("No valid pages selected for deletion.", "warning");
        setLoading(false);
        return;
      }

      if (pagesToDelete.length >= totalPages) {
        addLog("Cannot delete all pages in the document.", "warning");
        setLoading(false);
        return;
      }

      addLog(`Removing pages: ${pagesToDelete.join(", ")}...`, "info");

      // Sort in descending order to avoid index shifting issues when removing
      pagesToDelete.sort((a, b) => b - a);

      for (const pageNum of pagesToDelete) {
        pdfDoc.removePage(pageNum - 1);
      }

      // Update annotations
      // We need to shift pageNumbers of remaining annotations down by the number of deleted pages before them
      dispatchAnnotationUpdate(
        (prev) => {
          return prev
            .filter((ann) => !pagesToDelete.includes(ann.pageNumber))
            .map((ann) => {
              const deletedBefore = pagesToDelete.filter(
                (p) => p < ann.pageNumber,
              ).length;
              return { ...ann, pageNumber: ann.pageNumber - deletedBefore };
            });
        },
        `Deleted pages: ${pagesToDelete.join(", ")}`,
      );

      const updatedBytes = await pdfDoc.save();
      setPdfBytes(updatedBytes);

      setPdfDocProxy(null);
      setDeletePageRange("");

      // Adjust current page if it was deleted or shifted
      const remainingPages = totalPages - pagesToDelete.length;
      let newPage = currentPage;
      const deletedBeforeOrEqual = pagesToDelete.filter(
        (p) => p <= currentPage,
      ).length;
      newPage = currentPage - deletedBeforeOrEqual;
      if (newPage < 1) newPage = 1;
      if (newPage > remainingPages) newPage = remainingPages;

      setCurrentPage(newPage);

      addLog(`Pages successfully removed.`, "success");
    } catch (err: any) {
      addLog(`Failed to delete pages: ${err.message}`, "warning");
    } finally {
      setLoading(false);
    }
  };

  const handleRotatePage = async (targetPageNumber: number, direction: "cw" | "ccw") => {
    if (!pdfBytes || !pdfDocProxy) return;

    setLoading(true);
    try {
      const pdfDoc = await PDFDocument.load(pdfBytes, {
        ignoreEncryption: true,
      });
      const totalPages = pdfDoc.getPageCount();

      if (targetPageNumber < 1 || targetPageNumber > totalPages) {
        setLoading(false);
        return;
      }

      const page = pdfDoc.getPage(targetPageNumber - 1);
      const currentRotation = page.getRotation().angle || 0;
      const delta = direction === "cw" ? 90 : -90;
      const newRotation = (currentRotation + delta + 360) % 360;

      page.setRotation(degrees(newRotation));

      const updatedBytes = await pdfDoc.save();
      setPdfBytes(updatedBytes);
      setPdfDocProxy(null);

      addLog(
        `Page ${targetPageNumber} rotated ${direction === "cw" ? "90° Clockwise" : "90° Counter-Clockwise"} (New angle: ${newRotation}°).`,
        "success"
      );
    } catch (err: any) {
      addLog(`Failed to rotate page: ${err.message}`, "warning");
    } finally {
      setLoading(false);
    }
  };

  // Compile final annotated PDF and trigger standard 100% Client-Side memory download!
  const downloadFinishedPDF = async () => {
    if (!pdfBytes || !pdfDocProxy) return;

    try {
      setLoading(true);
      addLog("Compiling vector modifications natively...", "info");

      // Load into pdf-lib directly instead of creating a blank document
      const pdfDoc = await PDFDocument.load(pdfBytes, {
        ignoreEncryption: true,
      });

      // Remove XFA from AcroForm to fix Adobe Reader Error 132 while preserving normal pdf vectors!
      let acroForm: any;
      try {
        acroForm = (pdfDoc.catalog as any).lookupMaybe(PDFName.of("AcroForm"));
      } catch (e) {
        console.warn("Could not lookup AcroForm:", e);
      }

      if (acroForm) {
        addLog(
          "Stripping XFA streams to ensure Adobe compatibility...",
          "warning",
        );
        acroForm.delete(PDFName.of("XFA"));
      }

      const hFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const hFontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const timesFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
      const courierFont = await pdfDoc.embedFont(StandardFonts.Courier);

      const pages = pdfDoc.getPages();

      // Helper to locate user fonts
      const getEmbeddedFont = (fontName: string | undefined) => {
        if (fontName === "Times-Roman") return timesFont;
        if (fontName === "Courier") return courierFont;
        return hFont;
      };

      for (let pNum = 1; pNum <= pages.length; pNum++) {
        let page = pages[pNum - 1];
        const { width, height } = page.getSize();

        // Form field filling using PDF.js standard annotations storage
        if (pdfDocProxy.annotationStorage) {
          try {
            const proxyPage = await pdfDocProxy.getPage(pNum);
            const pageAnns = await proxyPage.getAnnotations();
            const storageObj = pdfDocProxy.annotationStorage.getAll();

            for (const ann of pageAnns) {
              if (
                ann.id &&
                storageObj[ann.id] &&
                storageObj[ann.id].value !== undefined
              ) {
                const val = storageObj[ann.id].value;
                const rect = ann.rect; // [x, y, maxX, maxY]
                if (rect && typeof val === "string") {
                  // Draw text onto the pdf-lib page directly based on standard coordinates relative to bottom-left
                  page.drawText(val, {
                    x: rect[0] + 1,
                    y: rect[1] + 3,
                    size: 11,
                    font: hFont,
                    color: rgb(0, 0, 0),
                  });
                } else if (rect && typeof val === "boolean" && val) {
                  page.drawText("X", {
                    x: rect[0] + 2,
                    y: rect[1] + 2,
                    size: 12,
                    font: hFont,
                    color: rgb(0, 0, 0),
                  });
                }
              }
            }
          } catch (formErr) {
            console.warn(
              "Error overlaying form fields text onto target PDF:",
              formErr,
            );
          }
        }

        // Add user DOM Annotations (Text, Signatures, Images, Stamps, Drawings, Redacts)
        const userAnns = annotations.filter((a) => a.pageNumber === pNum);

        const hasRedactions = userAnns.some((a) => a.type === "redact");
        if (hasRedactions && pdfDocProxy) {
          addLog(
            `Securely flattening page ${pNum} to permanently obscure redacted text streams...`,
            "security",
          );
          try {
            const proxyPage = await pdfDocProxy.getPage(pNum);
            // Render at high resolution to preserve quality
            const viewport = proxyPage.getViewport({ scale: 2.5 });
            const canvas = document.createElement("canvas");
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              await proxyPage.render({ canvasContext: ctx, viewport }).promise;

              // Draw redactions directly onto the image canvas!
              for (const ann of userAnns) {
                if (ann.type === "redact") {
                  ctx.fillStyle = "#000000";
                  // coordinates are in points, viewport is points * 2.5
                  ctx.fillRect(
                    ann.x * 2.5,
                    ann.y * 2.5,
                    ann.width * 2.5,
                    ann.height * 2.5,
                  );
                }
              }

              // Embed the newly flattened image
              const imgDataUrl = canvas.toDataURL("image/jpeg", 0.92);
              const imgBytes = base64ToArrayBuffer(imgDataUrl);
              const embeddedImage = await pdfDoc.embedJpg(imgBytes);

              // Obliterate underlying text streams by completely replacing the page
              pdfDoc.removePage(pNum - 1);
              page = pdfDoc.insertPage(pNum - 1, [width, height]);

              page.drawImage(embeddedImage, {
                x: 0,
                y: 0,
                width: width,
                height: height,
              });
            }
          } catch (err) {
            console.error("Failed to securely rasterize page:", err);
            addLog(
              `Failed to securely flatten page ${pNum}, redactions may be vulnerable.`,
              "warning",
            );
          }
        }

        for (const ann of userAnns) {
          if (ann.type === "text" && ann.text) {
            const textClr = hexToRgb(ann.fontColor) || { r: 14, g: 17, b: 24 };
            page.drawText(ann.text, {
              x: ann.x,
              y: height - ann.y - (ann.fontSize || 12),
              size: ann.fontSize || 12,
              font: getEmbeddedFont(ann.fontFamily),
              color: rgb(textClr.r / 255, textClr.g / 255, textClr.b / 255),
            });
          } else if (ann.type === "shape") {
            const hasFill =
              ann.hasFill !== false &&
              ann.shapeFillColor !== "transparent" &&
              ann.shapeFillColor !== "none";
            const fillClr = hasFill
              ? hexToRgb(ann.shapeFillColor || "#ffffff") || {
                  r: 255,
                  g: 255,
                  b: 255,
                }
              : null;

            const hasStroke =
              ann.hasStroke !== false && (ann.shapeStrokeWidth ?? 2) > 0;
            const strokeClr = hasStroke
              ? hexToRgb(ann.shapeStrokeColor || "#000000") || {
                  r: 0,
                  g: 0,
                  b: 0,
                }
              : null;
            const strokeWidth = ann.shapeStrokeWidth ?? 2;

            if (ann.shapeType === "circle") {
              page.drawEllipse({
                x: ann.x + ann.width / 2,
                y: height - ann.y - ann.height / 2,
                xScale: ann.width / 2,
                yScale: ann.height / 2,
                color: fillClr
                  ? rgb(fillClr.r / 255, fillClr.g / 255, fillClr.b / 255)
                  : undefined,
                borderColor: strokeClr
                  ? rgb(strokeClr.r / 255, strokeClr.g / 255, strokeClr.b / 255)
                  : undefined,
                borderWidth: hasStroke ? strokeWidth : 0,
              });
            } else if (ann.shapeType === "line") {
              page.drawLine({
                start: { x: ann.x, y: height - ann.y - ann.height / 2 },
                end: { x: ann.x + ann.width, y: height - ann.y - ann.height / 2 },
                thickness: strokeWidth || 2,
                color: strokeClr
                  ? rgb(strokeClr.r / 255, strokeClr.g / 255, strokeClr.b / 255)
                  : fillClr
                  ? rgb(fillClr.r / 255, fillClr.g / 255, fillClr.b / 255)
                  : rgb(0, 0, 0),
              });
            } else {
              page.drawRectangle({
                x: ann.x,
                y: height - ann.y - ann.height,
                width: ann.width,
                height: ann.height,
                color: fillClr
                  ? rgb(fillClr.r / 255, fillClr.g / 255, fillClr.b / 255)
                  : undefined,
                borderColor: strokeClr
                  ? rgb(strokeClr.r / 255, strokeClr.g / 255, strokeClr.b / 255)
                  : undefined,
                borderWidth: hasStroke ? strokeWidth : 0,
              });
            }
          } else if (
            (ann.type === "signature" || ann.type === "image") &&
            ann.signatureDataUrl
          ) {
            const sigBytes = base64ToArrayBuffer(ann.signatureDataUrl);
            const embeddedImage = ann.signatureDataUrl.includes("image/png")
              ? await pdfDoc.embedPng(sigBytes)
              : await pdfDoc.embedJpg(sigBytes);
            page.drawImage(embeddedImage, {
              x: ann.x,
              y: height - ann.y - ann.height,
              width: ann.width,
              height: ann.height,
            });
          } else if (ann.type === "stamp" && ann.stampType) {
            const borderClr =
              ann.stampType === "APPROVED" || ann.stampType === "CHECKMARK"
                ? rgb(16 / 255, 185 / 255, 129 / 255)
                : ann.stampType === "REJECTED" || ann.stampType === "CROSS"
                  ? rgb(244 / 255, 63 / 255, 94 / 255)
                  : ann.stampType === "SIGN_HERE"
                    ? rgb(245 / 255, 158 / 255, 11 / 255)
                    : ann.stampType === "INITIAL_HERE"
                      ? rgb(168 / 255, 85 / 255, 247 / 255)
                      : rgb(56 / 255, 189 / 255, 248 / 255);

            if (ann.stampType === "CHECKMARK") {
              page.drawLine({
                start: { x: ann.x + 6, y: height - ann.y - 18 },
                end: { x: ann.x + 14, y: height - ann.y - 26 },
                thickness: 3.5,
                color: borderClr,
              });
              page.drawLine({
                start: { x: ann.x + 14, y: height - ann.y - 26 },
                end: { x: ann.x + 28, y: height - ann.y - 8 },
                thickness: 3.5,
                color: borderClr,
              });
            } else if (ann.stampType === "CROSS") {
              page.drawLine({
                start: { x: ann.x + 6, y: height - ann.y - 6 },
                end: { x: ann.x + 26, y: height - ann.y - 26 },
                thickness: 3.5,
                color: borderClr,
              });
              page.drawLine({
                start: { x: ann.x + 6, y: height - ann.y - 26 },
                end: { x: ann.x + 26, y: height - ann.y - 6 },
                thickness: 3.5,
                color: borderClr,
              });
            } else {
              page.drawRectangle({
                x: ann.x,
                y: height - ann.y - ann.height,
                width: ann.width,
                height: ann.height,
                borderColor: borderClr,
                borderWidth: 2,
                color: rgb(0.98, 1.0, 0.99),
              });
              page.drawRectangle({
                x: ann.x + 3,
                y: height - ann.y - ann.height + 3,
                width: ann.width - 6,
                height: ann.height - 6,
                borderColor: borderClr,
                borderWidth: 0.75,
              });
              let stampLabelText = ann.stampType.replace("_", " ");
              if (ann.stampType === "SIGN_HERE") stampLabelText = "SIGN HERE ➔";
              if (ann.stampType === "INITIAL_HERE")
                stampLabelText = "INITIALS ➔";
              page.drawText(stampLabelText, {
                x: ann.x + 14,
                y: height - ann.y - ann.height / 2 - 4,
                size: 9.5,
                font: hFontBold,
                color: borderClr,
              });
            }
          } else if (ann.type === "drawing" && ann.drawingPoints) {
            const drawClr = hexToRgb(ann.drawingColor) || {
              r: 178,
              g: 34,
              b: 34,
            };
            for (let sIdx = 0; sIdx < ann.drawingPoints.length - 1; sIdx++) {
              const startPt = ann.drawingPoints[sIdx];
              const endPt = ann.drawingPoints[sIdx + 1];
              page.drawLine({
                start: { x: startPt.x, y: height - startPt.y },
                end: { x: endPt.x, y: height - endPt.y },
                thickness: ann.drawingWidth || 3,
                color: rgb(drawClr.r / 255, drawClr.g / 255, drawClr.b / 255),
              });
            }
          }
        }
      }

      const finishedBytesComp = await pdfDoc.save();

      const outBlob = new Blob([finishedBytesComp], {
        type: "application/pdf",
      });
      const defaultFileName = `Signed_${pdfFileName || "document.pdf"}`;

      const dlLink = document.createElement("a");
      dlLink.href = URL.createObjectURL(outBlob);
      dlLink.download = defaultFileName;
      document.body.appendChild(dlLink);
      dlLink.click();
      document.body.removeChild(dlLink);
      addLog(
        "Document compiled & triggered local memory download successfully!",
        "success",
      );
    } catch (exportErr: any) {
      console.error(exportErr);
      addLog(
        `Failed compiling vector streams: ${exportErr.message}`,
        "warning",
      );
    } finally {
      setLoading(false);
    }
  };

  // Rendering of draggable active annotation on sheet overlay
  const renderDraggableAnnotation = (ann: AnnotationItem) => {
    const isSelected = selectedAnnotationId === ann.id;
    const x_px = ann.x * scaleMultiplier;
    const y_px = ann.y * scaleMultiplier;
    const w_px = ann.width * scaleMultiplier;
    const h_px = ann.height * scaleMultiplier;

    // Selected input box logic
    if (ann.type === "text") {
      return (
        <div
          key={ann.id}
          id={`draggable-${ann.id}`}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
          className={`absolute flex items-center justify-between group pointer-events-auto select-none ${
            isSelected
              ? "ring-2 ring-emerald-400 bg-emerald-500/5 z-20 shadow-md"
              : "hover:ring-1 hover:ring-gray-400 z-10"
          }`}
          style={{
            left: x_px,
            top: y_px,
            width: w_px,
            height: h_px,
          }}
        >
          {/* Edge Drag Handles */}
          <div onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => handleDragStart(e, ann)} className="absolute top-0 left-0 w-full h-2 cursor-move z-20" />
          <div onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => handleDragStart(e, ann)} className="absolute bottom-0 left-0 w-full h-2 cursor-move z-20" />
          <div onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => handleDragStart(e, ann)} className="absolute top-0 left-0 w-2 h-full cursor-move z-20" />
          <div onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => handleDragStart(e, ann)} className="absolute top-0 right-0 w-2 h-full cursor-move z-20" />
          
          <textarea
            id={`input-ann-${ann.id}`}
            value={ann.text || ""}
            onChange={(e) => {
              const capText = e.target.value;
              const targetEl = e.target;
              targetEl.style.height = "auto";
              const scrollH = targetEl.scrollHeight;
              const singleLineH = ((ann.fontSize || 12) * scaleMultiplier) + 6;
              const neededPxH = Math.max(scrollH, singleLineH);
              const neededPdfH = Math.ceil(neededPxH / scaleMultiplier);

              setAnnotations((prev) =>
                prev.map((item) =>
                  item.id === ann.id
                    ? {
                        ...item,
                        text: capText,
                        height: item.userResized
                          ? Math.max(item.height, neededPdfH)
                          : neededPdfH,
                      }
                    : item,
                ),
              );
            }}
            onBlur={() => {
              setAnnotations((prev) => {
                setHistory((currHist) => {
                  const newTimeline = currHist.timeline.slice(
                    0,
                    currHist.currentIndex + 1,
                  );
                  newTimeline.push({
                    annotations: prev,
                    description: "Edited text content",
                    id:
                      Date.now().toString() +
                      Math.random().toString(36).substr(2, 5),
                  });
                  return {
                    timeline: newTimeline,
                    currentIndex: newTimeline.length - 1,
                  };
                });
                return prev;
              });
            }}
            onClick={(e) => e.stopPropagation()}
            onFocus={() => setSelectedAnnotationId(ann.id)}
            style={{
              fontSize: (ann.fontSize || 12) * scaleMultiplier,
              color: ann.fontColor || "#000",
              fontFamily:
                ann.fontFamily === "Courier"
                  ? "monospace"
                  : ann.fontFamily === "Times-Roman"
                    ? "serif"
                    : "sans-serif",
            }}
            className="bg-transparent border-none outline-hidden w-full h-full px-1.5 focus:bg-white/40 leading-tight rounded-xs select-text cursor-text resize-none overflow-hidden"
          />

          {/* Action corner tags overlay when mouse over */}
          {isSelected && (
            <button
              id={`del-inline-btn-${ann.id}`}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteAnnotation(ann.id);
              }}
              className="absolute -top-3 -right-3 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center hover:bg-rose-600 transition-colors shadow-md pointer-events-auto z-50 cursor-pointer"
              title="Delete text box"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Sizing scale grip element */}
          {isSelected && (
            <div
              id={`resize-handle-${ann.id}`}
              onMouseDown={(e) => handleResizeStart(e, ann)}
              className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border border-slate-900 cursor-se-resize shadow-xs z-30"
            />
          )}
        </div>
      );
    }

    if (ann.type === "signature") {
      return (
        <div
          key={ann.id}
          id={`draggable-${ann.id}`}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => handleDragStart(e, ann)}
          className={`absolute group pointer-events-auto select-none flex items-center justify-center p-0.5 ${
            isSelected
              ? "ring-2 ring-emerald-400 bg-emerald-500/5 cursor-move z-20 shadow-md"
              : "hover:ring-1 hover:ring-gray-400 cursor-pointer z-10"
          }`}
          style={{
            left: x_px,
            top: y_px,
            width: w_px,
            height: h_px,
          }}
        >
          <img
            src={ann.signatureDataUrl}
            alt="Sig seal"
            className="max-w-full max-h-full pointer-events-none select-none object-contain"
            referrerPolicy="no-referrer"
          />

          {isSelected && (
            <button
              id={`del-inline-btn-${ann.id}`}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteAnnotation(ann.id);
              }}
              className="absolute -top-7 -right-1 text-[10px] bg-red-600 hover:bg-red-500 text-white rounded bg-red-600 p-0.5 px-1.5 transition-all shadow-xs cursor-pointer font-mono pointer-events-auto z-50"
            >
              Delete
            </button>
          )}

          {isSelected && (
            <div
              id={`resize-handle-${ann.id}`}
              onMouseDown={(e) => handleResizeStart(e, ann)}
              className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-slate-950 cursor-se-resize shadow-sm"
            />
          )}
        </div>
      );
    }

    if (ann.type === "stamp") {
      const isIconClass =
        ann.stampType === "CHECKMARK" || ann.stampType === "CROSS";
      const borderClrClass =
        ann.stampType === "APPROVED" || ann.stampType === "CHECKMARK"
          ? "border-emerald-500 text-emerald-500 bg-emerald-500/10"
          : ann.stampType === "REJECTED" || ann.stampType === "CROSS"
            ? "border-rose-500 text-rose-500 bg-rose-500/10"
            : ann.stampType === "SIGN_HERE"
              ? "border-amber-500 text-amber-500 bg-amber-500/10"
              : ann.stampType === "INITIAL_HERE"
                ? "border-purple-500 text-purple-500 bg-purple-500/10"
                : "border-sky-500 text-sky-500 bg-sky-500/10";

      return (
        <div
          key={ann.id}
          id={`draggable-${ann.id}`}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => handleDragStart(e, ann)}
          className={`absolute group pointer-events-auto select-none flex items-center justify-center ${
            isSelected
              ? "ring-2 ring-emerald-400 z-20 shadow-md"
              : "hover:ring-1 hover:ring-gray-400 z-10"
          } ${
            isIconClass
              ? "bg-transparent text-xl font-bold cursor-move"
              : `border-2 border-dashed rounded-lg font-mono font-bold tracking-wide uppercase px-2 text-[10px] text-center select-none cursor-move ${borderClrClass}`
          }`}
          style={{
            left: x_px,
            top: y_px,
            width: w_px,
            height: h_px,
          }}
        >
          {ann.stampType === "APPROVED" && <span>APPROVED</span>}
          {ann.stampType === "REJECTED" && <span>REJECTED</span>}
          {ann.stampType === "SIGN_HERE" && (
            <span className="text-[9px]">SIGN HERE ➔</span>
          )}
          {ann.stampType === "INITIAL_HERE" && (
            <span className="text-[9px]">INITIAL ➔</span>
          )}
          {ann.stampType === "DATE" && (
            <span className="text-[9px]">DATE PLACE</span>
          )}
          {ann.stampType === "CHECKMARK" && (
            <span className="text-emerald-500 text-2xl font-black">✓</span>
          )}
          {ann.stampType === "CROSS" && (
            <span className="text-rose-500 text-2xl font-black">✗</span>
          )}

          {isSelected && (
            <button
              id={`del-inline-btn-${ann.id}`}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteAnnotation(ann.id);
              }}
              className="absolute -top-7 -right-1 text-[10px] bg-red-600 hover:bg-red-500 text-white rounded p-0.5 px-1.5 transition-all shadow-xs cursor-pointer font-mono pointer-events-auto z-50"
            >
              ✕
            </button>
          )}

          {!isIconClass && isSelected && (
            <div
              id={`resize-handle-${ann.id}`}
              onMouseDown={(e) => handleResizeStart(e, ann)}
              className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full cursor-se-resize"
            />
          )}
        </div>
      );
    }

    if (ann.type === "shape") {
      const hasFill =
        ann.hasFill !== false &&
        ann.shapeFillColor !== "transparent" &&
        ann.shapeFillColor !== "none";
      const fillClr = hasFill ? ann.shapeFillColor || "#ffffff" : "transparent";

      const hasStroke =
        ann.hasStroke !== false && (ann.shapeStrokeWidth ?? 2) > 0;
      const strokeClr = ann.shapeStrokeColor || "#000000";
      const strokeWidth = hasStroke
        ? (ann.shapeStrokeWidth ?? 2) * scaleMultiplier
        : 0;

      const shapeType = ann.shapeType || "rectangle";

      return (
        <div
          key={ann.id}
          id={`draggable-${ann.id}`}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedAnnotationId(ann.id);
          }}
          onDoubleClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setSelectedAnnotationId(ann.id);
            setShapeContextMenu({
              annId: ann.id,
              x: e.clientX,
              y: e.clientY,
            });
          }}
          onMouseDown={(e) => handleDragStart(e, ann)}
          className={`absolute group pointer-events-auto cursor-move ${
            isSelected ? "ring-2 ring-emerald-400 z-20 shadow-md" : "z-10"
          }`}
          style={{
            left: x_px,
            top: y_px,
            width: w_px,
            height: h_px,
          }}
        >
          {/* Shape background & border visual element */}
          {shapeType === "line" ? (
            <div
              className="w-full absolute top-1/2 -translate-y-1/2"
              style={{
                height: Math.max(2, strokeWidth),
                backgroundColor: strokeClr,
              }}
            />
          ) : (
            <div
              className="w-full h-full transition-all"
              style={{
                backgroundColor: fillClr,
                border: hasStroke
                  ? `${Math.max(1, strokeWidth)}px solid ${strokeClr}`
                  : "none",
                borderRadius: shapeType === "circle" ? "9999px" : "0px",
              }}
            />
          )}

          {/* Delete button at top right */}
          {isSelected && (
            <button
              id={`del-inline-btn-${ann.id}`}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteAnnotation(ann.id);
              }}
              className="absolute -top-3 -right-3 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center hover:bg-rose-600 transition-colors shadow-md pointer-events-auto z-50 cursor-pointer"
              title="Delete shape"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Resize handle */}
          {isSelected && (
            <div
              id={`resize-handle-${ann.id}`}
              onMouseDown={(e) => handleResizeStart(e, ann)}
              className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full cursor-se-resize shadow-xs z-30"
            />
          )}
        </div>
      );
    }
    if (ann.type === "redact") {
      return (
        <div
          key={ann.id}
          id={`draggable-${ann.id}`}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => handleDragStart(e, ann)}
          className={`absolute group pointer-events-auto select-none bg-black cursor-move ${
            isSelected ? "ring-2 ring-emerald-400 z-20 shadow-md" : "z-10"
          }`}
          style={{
            left: x_px,
            top: y_px,
            width: w_px,
            height: h_px,
          }}
        >
          {isSelected && (
            <button
              id={`del-inline-btn-${ann.id}`}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteAnnotation(ann.id);
              }}
              className="absolute -top-3 -right-3 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center hover:bg-rose-600 transition-colors shadow-sm"
              title="Delete block"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          {isSelected && (
            <div
              id={`resize-handle-${ann.id}`}
              onMouseDown={(e) => handleResizeStart(e, ann)}
              className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full cursor-se-resize"
            />
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div
      id="app-root-container"
      className={`min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 flex flex-col font-sans transition-colors ${isDarkMode ? "dark" : ""}`}
      onMouseMove={handleGlobalMouseMoveOrTouch}
      onMouseUp={handleGlobalMouseUp}
    >
      {/* Dynamic Incineration Scrub screen block lock */}
      <PurgeOverlay
        isPurging={isPurging}
        onPurgeFinished={handlePurgeFinished}
      />

      {/* Signature Placement Modal */}
      <SignatureModal
        isOpen={isSignatureModalOpen}
        onClose={() => setIsSignatureModalOpen(false)}
        onSave={(sig) => {
          setSavedSignatures((prev) => [...prev, sig]);
          addLog(
            `Added signature seal context in memory registry: "${sig.label}"`,
            "security",
          );
          placeSavedSignature(sig);
        }}
      />

      <PdfMergeModal
        isOpen={isPdfMergeModalOpen}
        onClose={() => setIsPdfMergeModalOpen(false)}
        onMerged={loadMergedPdf}
      />

      <PdfCompressModal
        isOpen={isPdfCompressModalOpen}
        onClose={() => setIsPdfCompressModalOpen(false)}
      />

      <FindAndRedactModal
        isOpen={isFindAndRedactOpen}
        onClose={() => setIsFindAndRedactOpen(false)}
        pdfDocProxy={pdfDocProxy}
        numPages={numPages}
        onApplyRedactions={(newRedactions, patternLabel) => {
          dispatchAnnotationUpdate(
            (prev) => [...prev, ...newRedactions],
            `Applied ${newRedactions.length} auto-redaction blocks for ${patternLabel}`,
          );
          addLog(
            `Applied ${newRedactions.length} auto-redaction blackout blocks across document for ${patternLabel}.`,
            "security",
          );
          setToolMode("redact");
        }}
        onNavigate={(page) => setCurrentPage(page)}
      />

      {/* Keyboard Shortcuts Help Modal */}
      {isKeyboardHelpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-indigo-500" /> Keyboard Shortcuts
              </h3>
              <button
                onClick={() => setIsKeyboardHelpOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                <span>Previous / Next Page</span>
                <span className="font-mono bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-600 font-bold">← → ↑ ↓ / PgUp PgDn</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                <span>Undo Change</span>
                <span className="font-mono bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-600 font-bold">Ctrl + Z</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                <span>Redo Change</span>
                <span className="font-mono bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-600 font-bold">Ctrl + Y</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                <span>Add Text Box</span>
                <span className="font-mono bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-600 font-bold">Double Click Page</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setIsKeyboardHelpOpen(false)}
                className="px-4 py-2 text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-500 rounded-xl transition-colors cursor-pointer"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* About & Security Modal */}
      {isAboutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Lock className="w-5 h-5 text-emerald-500" /> About Secure PDF
              </h3>
              <button
                onClick={() => setIsAboutModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <p>
                <strong>Secure PDF</strong> is a zero-trust, 100% client-side PDF editing and signature application.
              </p>
              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl space-y-1">
                <div className="font-bold text-emerald-700 dark:text-emerald-400">🔒 Volatile Memory Architecture</div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  No document or signature data is ever transmitted to a remote server. All parsing, rendering, vector stream manipulation, and redactions execute exclusively in volatile local browser memory.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setIsAboutModalOpen(false)}
                className="px-4 py-2 text-xs font-bold bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Application Top Bar Header */}
      <header className="h-14 flex items-center justify-between px-4 lg:px-6 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-xs z-40 sticky top-0 transition-colors">
        <input
          id="pdf-file-uploader-input"
          type="file"
          accept="application/pdf"
          onChange={handleFileUpload}
          className="hidden"
        />
        <div className="w-full flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            {/* Branding Logo & Title */}
            <div className="flex items-center gap-2.5">
              <div className="bg-indigo-600 p-1.5 rounded-lg text-white shadow-xs">
                <Lock className="w-4 h-4" />
              </div>
              <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-none">
                Secure PDF
              </h1>
            </div>

            {/* Adobe Style Top Menu Bar */}
            <div ref={menuBarRef} className="relative flex items-center gap-0.5 border-l border-slate-200 dark:border-slate-700 pl-4">
              {(["file", "edit", "insert", "view", "help"] as const).map((menuName) => {
                const isDisabled = !pdfBytes && ["edit", "insert", "view"].includes(menuName);
                const isOpen = activeMenu === menuName && !isDisabled;
                const label = menuName.charAt(0).toUpperCase() + menuName.slice(1);
                return (
                  <div key={menuName} className="relative">
                    <button
                      disabled={isDisabled}
                      onClick={() => {
                        if (isDisabled) return;
                        setActiveMenu(isOpen ? null : menuName);
                      }}
                      onMouseEnter={() => {
                        if (isDisabled) return;
                        if (activeMenu !== null && activeMenu !== menuName) {
                          setActiveMenu(menuName);
                        }
                      }}
                      title={isDisabled ? `Open or upload a PDF to enable ${label} menu` : undefined}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors select-none ${
                        isDisabled
                          ? "opacity-40 cursor-not-allowed pointer-events-none text-slate-400 dark:text-slate-500"
                          : isOpen
                          ? "bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white cursor-pointer"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 cursor-pointer"
                      }`}
                    >
                      {label}
                    </button>

                    {isOpen && (
                      <div className="absolute left-0 mt-1 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50 py-1 text-slate-800 dark:text-slate-200 animate-in fade-in slide-in-from-top-1 duration-150">
                        {menuName === "file" && (
                          <>
                            <label
                              htmlFor="pdf-file-uploader-input"
                              onClick={() => {
                                setActiveMenu(null);
                              }}
                              className="w-full text-left px-3.5 py-2 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-between transition-colors cursor-pointer"
                            >
                              <span className="flex items-center gap-2"><Upload className="w-3.5 h-3.5 text-indigo-500" /> Open PDF...</span>
                              <kbd className="text-[10px] text-slate-400 font-mono">Ctrl+O</kbd>
                            </label>
                            <button
                              onClick={() => {
                                setActiveMenu(null);
                                setIsPdfMergeModalOpen(true);
                              }}
                              className="w-full text-left px-3.5 py-2 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-between transition-colors cursor-pointer"
                            >
                              <span className="flex items-center gap-2"><Layers className="w-3.5 h-3.5 text-indigo-500" /> Merge PDFs...</span>
                            </button>
                            <button
                              onClick={() => {
                                setActiveMenu(null);
                                setIsPdfCompressModalOpen(true);
                              }}
                              className="w-full text-left px-3.5 py-2 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-between transition-colors cursor-pointer"
                            >
                              <span className="flex items-center gap-2"><Maximize2 className="w-3.5 h-3.5 text-indigo-500" /> Compress PDF...</span>
                            </button>
                            <div className="border-t border-slate-100 dark:border-slate-700/80 my-1" />
                            <button
                              disabled={!pdfBytes}
                              onClick={() => {
                                setActiveMenu(null);
                                downloadFinishedPDF();
                              }}
                              className={`w-full text-left px-3.5 py-2 text-xs font-medium flex items-center justify-between transition-colors ${
                                pdfBytes
                                  ? "hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 cursor-pointer font-bold"
                                  : "opacity-40 cursor-not-allowed"
                              }`}
                            >
                              <span className="flex items-center gap-2"><Download className="w-3.5 h-3.5" /> Save / Export PDF</span>
                              <kbd className="text-[10px] font-mono opacity-60">Ctrl+S</kbd>
                            </button>
                            <div className="border-t border-slate-100 dark:border-slate-700/80 my-1" />
                            <button
                              disabled={!pdfBytes && savedSignatures.length === 0}
                              onClick={() => {
                                setActiveMenu(null);
                                executeSecurePurge();
                              }}
                              className={`w-full text-left px-3.5 py-2 text-xs font-medium flex items-center justify-between transition-colors ${
                                pdfBytes || savedSignatures.length > 0
                                  ? "text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 cursor-pointer font-bold"
                                  : "opacity-40 cursor-not-allowed"
                              }`}
                            >
                              <span className="flex items-center gap-2"><ShieldAlert className="w-3.5 h-3.5" /> Purge & Exit</span>
                            </button>
                          </>
                        )}

                        {menuName === "edit" && (
                          <>
                            <button
                              disabled={history.currentIndex <= 0}
                              onClick={() => {
                                setActiveMenu(null);
                                undo();
                              }}
                              className={`w-full text-left px-3.5 py-2 text-xs font-medium flex items-center justify-between transition-colors ${
                                history.currentIndex > 0
                                  ? "hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                                  : "opacity-40 cursor-not-allowed"
                              }`}
                            >
                              <span className="flex items-center gap-2"><Undo className="w-3.5 h-3.5 text-indigo-500" /> Undo</span>
                              <kbd className="text-[10px] text-slate-400 font-mono">Ctrl+Z</kbd>
                            </button>
                            <button
                              disabled={history.currentIndex >= history.timeline.length - 1}
                              onClick={() => {
                                setActiveMenu(null);
                                redo();
                              }}
                              className={`w-full text-left px-3.5 py-2 text-xs font-medium flex items-center justify-between transition-colors ${
                                history.currentIndex < history.timeline.length - 1
                                  ? "hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                                  : "opacity-40 cursor-not-allowed"
                              }`}
                            >
                              <span className="flex items-center gap-2"><Redo className="w-3.5 h-3.5 text-indigo-500" /> Redo</span>
                              <kbd className="text-[10px] text-slate-400 font-mono">Ctrl+Y</kbd>
                            </button>
                            <div className="border-t border-slate-100 dark:border-slate-700/80 my-1" />
                            <button
                              onClick={() => {
                                setActiveMenu(null);
                                setIsSignatureModalOpen(true);
                              }}
                              className="w-full text-left px-3.5 py-2 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-between transition-colors cursor-pointer"
                            >
                              <span className="flex items-center gap-2"><PenTool className="w-3.5 h-3.5 text-indigo-500" /> Manage Signatures...</span>
                            </button>
                            <button
                              disabled={annotations.length === 0}
                              onClick={() => {
                                setActiveMenu(null);
                                resetAnnotations([]);
                              }}
                              className={`w-full text-left px-3.5 py-2 text-xs font-medium flex items-center justify-between transition-colors ${
                                annotations.length > 0
                                  ? "hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                                  : "opacity-40 cursor-not-allowed"
                              }`}
                            >
                              <span className="flex items-center gap-2"><RotateCcw className="w-3.5 h-3.5 text-indigo-500" /> Clear All Annotations</span>
                            </button>
                            <div className="border-t border-slate-100 dark:border-slate-700/80 my-1" />
                            <button
                              disabled={!pdfBytes}
                              onClick={() => {
                                setActiveMenu(null);
                                handleRotatePage(currentPage, "cw");
                              }}
                              className={`w-full text-left px-3.5 py-2 text-xs font-medium flex items-center justify-between transition-colors ${
                                pdfBytes
                                  ? "hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                                  : "opacity-40 cursor-not-allowed"
                              }`}
                            >
                              <span className="flex items-center gap-2"><RotateCw className="w-3.5 h-3.5 text-indigo-500" /> Rotate Page Clockwise</span>
                            </button>
                            <button
                              disabled={!pdfBytes}
                              onClick={() => {
                                setActiveMenu(null);
                                handleRotatePage(currentPage, "ccw");
                              }}
                              className={`w-full text-left px-3.5 py-2 text-xs font-medium flex items-center justify-between transition-colors ${
                                pdfBytes
                                  ? "hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                                  : "opacity-40 cursor-not-allowed"
                              }`}
                            >
                              <span className="flex items-center gap-2"><RotateCcw className="w-3.5 h-3.5 text-indigo-500" /> Rotate Page Counter-CW</span>
                            </button>
                          </>
                        )}

                        {menuName === "insert" && (
                          <>
                            <button
                              onClick={() => {
                                setActiveMenu(null);
                                setToolMode("text");
                              }}
                              className="w-full text-left px-3.5 py-2 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-between transition-colors cursor-pointer"
                            >
                              <span className="flex items-center gap-2"><Type className="w-3.5 h-3.5 text-indigo-500" /> Text Box</span>
                              <kbd className="text-[10px] text-slate-400 font-mono">Double Click</kbd>
                            </button>
                            <button
                              onClick={() => {
                                setActiveMenu(null);
                                setToolMode("draw");
                              }}
                              className="w-full text-left px-3.5 py-2 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-between transition-colors cursor-pointer"
                            >
                              <span className="flex items-center gap-2"><Edit3 className="w-3.5 h-3.5 text-indigo-500" /> Freehand Ink</span>
                            </button>
                            <button
                              onClick={() => {
                                setActiveMenu(null);
                                setToolMode("shape");
                              }}
                              className="w-full text-left px-3.5 py-2 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-between transition-colors cursor-pointer"
                            >
                              <span className="flex items-center gap-2"><Square className="w-3.5 h-3.5 text-indigo-500" /> Masking Rectangle</span>
                            </button>
                            <button
                              onClick={() => {
                                setActiveMenu(null);
                                setToolMode("redact");
                              }}
                              className="w-full text-left px-3.5 py-2 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-between transition-colors cursor-pointer"
                            >
                              <span className="flex items-center gap-2"><EyeOff className="w-3.5 h-3.5 text-rose-500" /> Permanent Redaction</span>
                            </button>
                            <button
                              onClick={() => {
                                setActiveMenu(null);
                                setIsFindAndRedactOpen(true);
                              }}
                              className="w-full text-left px-3.5 py-2 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-between transition-colors cursor-pointer text-rose-600 dark:text-rose-400 font-bold"
                            >
                              <span className="flex items-center gap-2"><ShieldAlert className="w-3.5 h-3.5 text-rose-500" /> Find & Auto-Redact Patterns...</span>
                            </button>
                            <div className="border-t border-slate-100 dark:border-slate-700/80 my-1" />
                            <button
                              onClick={() => {
                                setActiveMenu(null);
                                setIsSignatureModalOpen(true);
                              }}
                              className="w-full text-left px-3.5 py-2 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-between transition-colors cursor-pointer"
                            >
                              <span className="flex items-center gap-2"><CheckSquare className="w-3.5 h-3.5 text-indigo-500" /> Signature Seal...</span>
                            </button>
                          </>
                        )}

                        {menuName === "view" && (
                          <>
                            <button
                              onClick={() => {
                                setActiveMenu(null);
                                setIsSidebarOpen(!isSidebarOpen);
                              }}
                              className="w-full text-left px-3.5 py-2 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-between transition-colors cursor-pointer"
                            >
                              <span className="flex items-center gap-2"><Sidebar className="w-3.5 h-3.5 text-indigo-500" /> {isSidebarOpen ? "Hide Side Panel" : "Show Side Panel"}</span>
                            </button>
                            <div className="border-t border-slate-100 dark:border-slate-700/80 my-1" />
                            <button
                              onClick={() => {
                                setActiveMenu(null);
                                handleZoomIn();
                              }}
                              className="w-full text-left px-3.5 py-2 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-between transition-colors cursor-pointer"
                            >
                              <span className="flex items-center gap-2"><ZoomIn className="w-3.5 h-3.5 text-indigo-500" /> Zoom In</span>
                              <kbd className="text-[10px] text-slate-400 font-mono">+15%</kbd>
                            </button>
                            <button
                              onClick={() => {
                                setActiveMenu(null);
                                handleZoomOut();
                              }}
                              className="w-full text-left px-3.5 py-2 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-between transition-colors cursor-pointer"
                            >
                              <span className="flex items-center gap-2"><ZoomOut className="w-3.5 h-3.5 text-indigo-500" /> Zoom Out</span>
                              <kbd className="text-[10px] text-slate-400 font-mono">-15%</kbd>
                            </button>
                            <div className="border-t border-slate-100 dark:border-slate-700/80 my-1" />
                            <button
                              onClick={() => {
                                setActiveMenu(null);
                                setIsDarkMode(!isDarkMode);
                              }}
                              className="w-full text-left px-3.5 py-2 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-between transition-colors cursor-pointer"
                            >
                              <span className="flex items-center gap-2">
                                {isDarkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-500" />}
                                {isDarkMode ? "Light Mode" : "Dark Mode"}
                              </span>
                            </button>
                          </>
                        )}

                        {menuName === "help" && (
                          <>
                            <button
                              onClick={() => {
                                setActiveMenu(null);
                                setIsKeyboardHelpOpen(true);
                              }}
                              className="w-full text-left px-3.5 py-2 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-between transition-colors cursor-pointer"
                            >
                              <span className="flex items-center gap-2"><HelpCircle className="w-3.5 h-3.5 text-indigo-500" /> Keyboard Shortcuts</span>
                            </button>
                            <button
                              onClick={() => {
                                setActiveMenu(null);
                                setIsAboutModalOpen(true);
                              }}
                              className="w-full text-left px-3.5 py-2 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-between transition-colors cursor-pointer"
                            >
                              <span className="flex items-center gap-2"><Lock className="w-3.5 h-3.5 text-emerald-500" /> Security & About</span>
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Auto-Save Indicator */}
            {pdfBytes && (
              <div id="auto-save-status-indicator" className="flex items-center">
                {autoSaveStatus === "saved" && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    <span className="hidden sm:inline">Auto-Saved</span>
                  </span>
                )}
                {autoSaveStatus === "saving" && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-50 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/80">
                    <Loader2 className="w-3 h-3 text-amber-500 animate-spin" />
                    <span className="hidden sm:inline">Saving...</span>
                  </span>
                )}
                {autoSaveStatus === "restored" && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80">
                    <HardDrive className="w-3 h-3 text-indigo-500" />
                    <span className="hidden sm:inline">Restored</span>
                  </span>
                )}
              </div>
            )}

            {/* Find & Auto-Redact Button */}
            <button
              onClick={() => setIsFindAndRedactOpen(true)}
              disabled={!pdfBytes}
              title="Find and Auto-Redact Patterns (Emails, SSNs, Credit Cards, etc.)"
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/80 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-bold border border-rose-200/80 dark:border-rose-800/80 transition-all cursor-pointer shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              <span className="hidden sm:inline">Find & Redact</span>
            </button>

            {/* PWA Install Button */}
            <button
              onClick={handleTriggerPwaInstall}
              title="Install Secure PDF as App"
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold border border-indigo-200/80 dark:border-indigo-800/80 transition-all cursor-pointer shrink-0"
            >
              <Smartphone className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span className="hidden sm:inline">Install App</span>
            </button>

            {/* Core Privacy Checklist */}
            <div
              id="privacy-quick-dashboard"
              className="hidden xl:flex items-center gap-3 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800/50 rounded-full"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                Memory Sandbox
              </span>
            </div>

            <PdfSearch
              pdfDocProxy={pdfDocProxy}
              onNavigate={(page) => setCurrentPage(page)}
              onOpenFindAndRedactModal={() => setIsFindAndRedactOpen(true)}
            />
          </div>
        </div>
      </header>

      {/* Restored Session Alert Banner */}
      {restoredNotice && (
        <div className="bg-indigo-600 dark:bg-indigo-700 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between gap-3 shadow-md z-30 animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap">
            <HardDrive className="w-4 h-4 text-indigo-200 shrink-0" />
            <span>
              Auto-saved session restored for <strong className="underline">{restoredNotice.fileName}</strong> ({restoredNotice.annotationsCount} markup layers)
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setRestoredNotice(null)}
              className="px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-white font-bold transition-colors cursor-pointer text-[11px]"
            >
              Keep Session
            </button>
            <button
              onClick={async () => {
                await clearAutoSaveSession();
                setRestoredNotice(null);
                setPdfBytes(null);
                setPdfFileName("document.pdf");
                setAnnotations([]);
                setAutoSaveStatus("idle");
              }}
              className="px-2.5 py-1 bg-rose-500/80 hover:bg-rose-500 rounded-lg text-white font-bold transition-colors cursor-pointer text-[11px]"
            >
              Discard & Clear
            </button>
          </div>
        </div>
      )}

      {/* Main Workspace Layout */}
      <main className="flex-1 w-full relative overflow-hidden flex">
        {/* Left Side Column Panel (Page Thumbnails - Adobe Acrobat style) */}
        {pdfBytes && isSidebarOpen && (
          <aside
            id="sidebar-left-thumbnails"
            className="w-56 lg:w-64 bg-slate-50 dark:bg-slate-800/90 border-r border-slate-200 dark:border-slate-700 flex flex-col z-30 flex-shrink-0 h-full shadow-xs transition-all"
          >
            {/* Sidebar Header */}
            <div className="p-3.5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-white dark:bg-slate-800">
              <div className="flex items-center gap-2">
                <Grid className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                  Page Thumbnails
                </h2>
                {numPages > 0 && (
                  <span className="text-[10px] font-bold bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-800/50">
                    {numPages}
                  </span>
                )}
              </div>
              <button
                onClick={() => setIsSidebarOpen(false)}
                title="Hide Side Panel"
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Thumbnails Container */}
            <div
              ref={sidebarContainerRef}
              className="flex-1 overflow-y-auto p-3 space-y-3 scroll-smooth"
            >
              {pdfDocProxy && numPages > 0 && (
                Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
                  <motion.div
                    key={pageNum}
                    ref={(el) => (thumbnailRefs.current[pageNum] = el)}
                    layout
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 350,
                      damping: 28,
                    }}
                    className="relative"
                  >
                    <PageThumbnailCard
                      pageNumber={pageNum}
                      pdfDocProxy={pdfDocProxy}
                      isActive={currentPage === pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      onDelete={(e) => {
                        e.stopPropagation();
                        handleDeletePages(pageNum.toString());
                      }}
                      onRotateCw={(e) => {
                        e.stopPropagation();
                        handleRotatePage(pageNum, "cw");
                      }}
                      onRotateCcw={(e) => {
                        e.stopPropagation();
                        handleRotatePage(pageNum, "ccw");
                      }}
                    />
                  </motion.div>
                ))
              )}
            </div>
          </aside>
        )}

        {/* Center Canvas Main Board & Tool Controls (Main Panel spacing) */}
        <section
          id="workspace-center-track"
          className="flex-1 w-full relative h-full flex flex-col"
        >
          {/* Overlay Floating Controls */}
          {pdfBytes && (
            <>
              {/* Toolbar responsive positioning */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 md:top-1/2 md:-translate-y-1/2 md:bottom-auto md:left-auto md:translate-x-0 md:right-4 z-20 pointer-events-none max-w-[98vw]">
                <Toolbar
                  activeMode={toolMode}
                  setMode={(mode) => {
                    setToolMode(mode);
                    setSelectedAnnotationId(null);
                  }}
                  textFontSize={textFontSize}
                  setTextFontSize={setTextFontSize}
                  textFontColor={textFontColor}
                  setTextFontColor={setTextFontColor}
                  textFontFamily={textFontFamily}
                  setTextFontFamily={setTextFontFamily}
                  activeStampType={activeStampType}
                  setActiveStampType={setActiveStampType}
                  onOpenSignatureModal={() => setIsSignatureModalOpen(true)}
                  onSignatureToolClick={() => setIsSidebarOpen(true)}
                  onOpenFindAndRedactModal={() => setIsFindAndRedactOpen(true)}
                  savedSignaturesCount={savedSignatures.length}
                  onDeletePage={() => {
                    handleDeletePages(currentPage.toString());
                  }}
                />
              </div>

              {/* Pagination (Top-Center on Phone, Middle-Bottom on Desktop) */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 md:top-auto md:bottom-6 z-20 flex items-center bg-white/95 dark:bg-slate-800/95 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-full shadow-lg p-1 pointer-events-auto transition-colors">
                <button
                  onClick={prevPage}
                  disabled={currentPage <= 1}
                  className="p-1.5 md:p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-700 dark:text-slate-300 disabled:opacity-50 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
                </button>
                <span className="text-xs md:text-sm font-bold text-slate-600 dark:text-slate-400 px-3 min-w-[70px] md:min-w-[80px] text-center font-mono">
                  {currentPage} / {numPages || "?"}
                </span>
                <button
                  onClick={nextPage}
                  disabled={currentPage >= numPages}
                  className="p-1.5 md:p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-700 dark:text-slate-300 disabled:opacity-50 transition-colors"
                >
                  <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
                </button>
              </div>

              {/* Zoom (Top-Right on Phone, Bottom-Right on Desktop) */}
              <div className="absolute top-3 right-3 md:top-auto md:bottom-6 md:right-6 z-20 flex items-center bg-white/95 dark:bg-slate-800/95 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-full shadow-lg p-1 pointer-events-auto transition-colors">
                <button
                  onClick={handleZoomOut}
                  className="p-1.5 md:p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-700 dark:text-slate-300 transition-colors"
                >
                  <ZoomOut className="w-3.5 h-3.5 md:w-4 md:h-4" />
                </button>
                <span className="text-[11px] md:text-xs font-mono font-bold text-slate-700 dark:text-slate-300 px-1.5 select-none min-w-[40px] md:min-w-[50px] text-center">
                  {Math.round(zoomScale * 100)}%
                </span>
                <button
                  onClick={handleZoomIn}
                  className="p-1.5 md:p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-700 dark:text-slate-300 transition-colors"
                >
                  <ZoomIn className="w-3.5 h-3.5 md:w-4 md:h-4" />
                </button>
              </div>
            </>
          )}

          {/* Core Interactive Sandbox Viewport Rendering Layer */}
          <div className="relative border border-slate-300 dark:border-slate-800 rounded-2xl bg-slate-200 dark:bg-slate-900/50 p-4 md:p-8 overflow-auto flex items-center justify-center h-full shadow-inner transition-colors">
            {loading && (
              <div
                id="viewport-loading-overlay"
                className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-white/70 dark:bg-slate-900/80 backdrop-blur-xs select-none pointer-events-none transition-colors"
              >
                <div className="w-10 h-10 border-4 border-indigo-600 dark:border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-xs font-bold font-mono text-slate-600 dark:text-slate-300">
                  Memory Cache Processing Page...
                </p>
              </div>
            )}

            {pdfBytes ? (
              <div
                id="pdf-render-frame-container"
                onMouseDown={() => {
                  if (toolMode === "select" && selectedAnnotationId) {
                    setSelectedAnnotationId(null);
                  }
                }}
                onDoubleClick={(e) => {
                  if (toolMode === "text" || toolMode === "draw") return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickX_px = e.clientX - rect.left;
                  const clickY_px = e.clientY - rect.top;
                  const pdfX = clickX_px / scaleMultiplier;
                  const pdfY = clickY_px / scaleMultiplier;
                  const newTextAnn: AnnotationItem = {
                    id: `ann_text_${Date.now()}`,
                    type: "text",
                    pageNumber: currentPage,
                    x: pdfX - 10,
                    y: pdfY - 14,
                    width: 150,
                    height: 24,
                    text: "Type text here",
                    fontSize: textFontSize,
                    fontColor: textFontColor,
                    fontFamily: textFontFamily,
                    userResized: false,
                  };
                  dispatchAnnotationUpdate(
                    (prev) => [...prev, newTextAnn],
                    "Added text layer via double click",
                  );
                  setSelectedAnnotationId(newTextAnn.id);
                  setToolMode("select");
                  addLog("Placed editable text block layer on page.", "info");
                }}
                className="relative shadow-2xl bg-white dark:bg-[#e2e8f0] border border-slate-300 dark:border-slate-600 select-none scale-100 transition-all origin-center dark:brightness-90"
                style={{
                  width: canvasDimensions.width,
                  height: canvasDimensions.height,
                }}
              >
                <canvas
                  id="pdf-canvas-frame-node"
                  ref={canvasRef}
                  className="absolute inset-0 select-none pointer-events-none"
                />

                <div
                  ref={xfaLayerRef}
                  className="xfaLayer absolute inset-0 select-none"
                />

                <div
                  ref={annotationLayerRef}
                  className="annotationLayer absolute inset-0"
                />

                {/* Annotation Overlay Wrapper */}
                <div
                  id="annotation-interactive-overlay"
                  ref={overlayRef}
                  onClick={handleOverlayClick}
                  onMouseDown={(e) => {
                    handleInkStart(e);
                    handleRedactStart(e);
                  }}
                  onMouseMove={(e) => {
                    handleInkMove(e);
                    handleRedactMove(e);
                  }}
                  onMouseUp={(e) => {
                    handleInkEnd();
                    handleRedactEnd();
                  }}
                  onMouseLeave={(e) => {
                    handleInkEnd();
                    handleRedactEnd();
                  }}
                  onTouchStart={(e) => {
                    handleInkStart(e);
                    handleRedactStart(e);
                  }}
                  onTouchMove={(e) => {
                    handleInkMove(e);
                    handleRedactMove(e);
                  }}
                  onTouchEnd={(e) => {
                    handleInkEnd();
                    handleRedactEnd();
                  }}
                  className={`absolute inset-0 select-none ${
                    toolMode === "select"
                      ? "pointer-events-none"
                      : "pointer-events-auto"
                  } ${
                    toolMode === "draw" || toolMode === "redact"
                      ? "cursor-crosshair touch-none"
                      : "cursor-default"
                  }`}
                >
                  {/* Visual SVG Ink Segment tracker renderer for freehand */}
                  <svg
                    className="absolute inset-0 pointer-events-none select-none z-20 w-full h-full"
                    width="100%"
                    height="100%"
                  >
                    {/* Render currently drawing stroke */}
                    {isDrawingInk && currentInkPoints.length > 1 && (
                      <path
                        d={currentInkPoints
                          .map(
                            (p, idx) =>
                              `${idx === 0 ? "M" : "L"} ${p.x * scaleMultiplier} ${p.y * scaleMultiplier}`,
                          )
                          .join(" ")}
                        fill="none"
                        stroke={inkColor}
                        strokeWidth={inkWidth * scaleMultiplier}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}

                    {/* Render currently drawing redact rect */}
                    {isDrawingRedact && redactStart && redactCurrent && (
                      <rect
                        x={
                          Math.min(redactStart.x, redactCurrent.x) *
                          scaleMultiplier
                        }
                        y={
                          Math.min(redactStart.y, redactCurrent.y) *
                          scaleMultiplier
                        }
                        width={
                          Math.abs(redactStart.x - redactCurrent.x) *
                          scaleMultiplier
                        }
                        height={
                          Math.abs(redactStart.y - redactCurrent.y) *
                          scaleMultiplier
                        }
                        fill="#000000"
                        className="opacity-75"
                      />
                    )}

                    {/* Render saved drawing stroke layers on current page */}
                    {annotations
                      .filter(
                        (ann) =>
                          ann.type === "drawing" &&
                          ann.pageNumber === currentPage,
                      )
                      .map((ann) => {
                        if (
                          !ann.drawingPoints ||
                          ann.drawingPoints.length === 0
                        )
                          return null;
                        const pathD = ann.drawingPoints
                          .map(
                            (p, idx) =>
                              `${idx === 0 ? "M" : "L"} ${p.x * scaleMultiplier} ${p.y * scaleMultiplier}`,
                          )
                          .join(" ");
                        const isSel = selectedAnnotationId === ann.id;
                        return (
                          <g
                            key={ann.id}
                            onClick={(e) => {
                              if (toolMode === "select") {
                                e.stopPropagation();
                                setSelectedAnnotationId(ann.id);
                              }
                            }}
                            className="pointer-events-auto cursor-pointer"
                          >
                            <path
                              d={pathD}
                              fill="none"
                              stroke={ann.drawingColor || "#000"}
                              strokeWidth={
                                (ann.drawingWidth || 3) * scaleMultiplier
                              }
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className={
                                isSel
                                  ? "stroke-indigo-500 drop-shadow-md"
                                  : "hover:stroke-slate-400"
                              }
                            />
                            {isSel && (
                              <foreignObject
                                x={ann.x * scaleMultiplier - 10}
                                y={ann.y * scaleMultiplier - 30}
                                width={60}
                                height={24}
                              >
                                <button
                                  id={`del-draw-${ann.id}`}
                                  onClick={(ev) => {
                                    ev.stopPropagation();
                                    handleDeleteAnnotation(ann.id);
                                  }}
                                  className="text-[9px] bg-red-650 bg-rose-600 hover:bg-rose-500 text-white rounded p-0.5 px-1.5 leading-none shadow-xs font-bold"
                                >
                                  Wipe
                                </button>
                              </foreignObject>
                            )}
                          </g>
                        );
                      })}
                  </svg>

                  {/* Render draggable signature and text boxes */}
                  {annotations
                    .filter(
                      (ann) =>
                        ann.type !== "drawing" &&
                        ann.pageNumber === currentPage,
                    )
                    .map((ann) => renderDraggableAnnotation(ann))}
                </div>
              </div>
            ) : (
              <div
                id="unloaded-blank-prompt"
                className="flex flex-col items-center justify-center p-8 text-center max-w-sm"
              >
                <label
                  htmlFor="pdf-file-uploader-input"
                  title="Click to select PDF file"
                  className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border-2 border-indigo-200 dark:border-indigo-700/60 text-indigo-600 dark:text-indigo-400 rounded-3xl flex items-center justify-center mb-5 shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer group"
                >
                  <Upload className="w-10 h-10 animate-pulse group-hover:animate-none pointer-events-none" />
                </label>
                <h3 className="font-sans font-bold text-lg text-slate-800 dark:text-slate-200 mb-2">
                  No Private Document Active
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-5">
                  Upload a standard PDF locally from your device to begin editing and signing securely.
                </p>
                <label
                  htmlFor="pdf-file-uploader-input"
                  className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md transition-all hover:scale-105 cursor-pointer inline-flex items-center gap-2"
                >
                  <Upload className="w-4 h-4 pointer-events-none" /> Open PDF...
                </label>
              </div>
            )}
          </div>

          {/* Right Action & Elements Setting Control (Activates only when element is selected) */}
          {selectedAnnotationId && (
            <div
              id="selection-adjuster-panel"
              className="bg-white dark:bg-slate-800 border-2 border-indigo-150 dark:border-indigo-500/50 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 animate-in slide-in-from-bottom-2 duration-200 shadow-md transition-colors"
            >
              <div className="flex items-center space-x-3">
                <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                    Active Drag Node Elements Selected
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono font-bold">
                    ID Ref: {selectedAnnotationId.slice(0, 16)}...
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  id="deselect-annotation-btn"
                  onClick={() => setSelectedAnnotationId(null)}
                  className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors cursor-pointer border border-slate-200 dark:border-slate-600"
                >
                  Dismiss selection
                </button>
                <button
                  id="delete-selected-annotation-btn"
                  onClick={() => handleDeleteAnnotation(selectedAnnotationId)}
                  className="text-xs font-bold bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50 hover:bg-rose-100 dark:hover:bg-rose-900/50 p-1.5 px-4 rounded-xl transition-all flex items-center cursor-pointer uppercase tracking-wider"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  Burn Element Layer
                </button>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-4 text-center mt-12 transition-colors shrink-0">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            🔒{" "}
            <strong className="text-slate-700 dark:text-slate-300">
              Secure Environment:
            </strong>{" "}
            All processing is performed locally on your device.
          </p>
        </div>
      </footer>

      {/* Shape Customization Context Menu */}
      {shapeContextMenu && (() => {
        const activeShape = annotations.find(
          (a) => a.id === shapeContextMenu.annId,
        );
        if (!activeShape || activeShape.type !== "shape") return null;

        const shapeType = activeShape.shapeType || "rectangle";
        const hasFill =
          activeShape.hasFill !== false &&
          activeShape.shapeFillColor !== "transparent" &&
          activeShape.shapeFillColor !== "none";
        const fillColor = activeShape.shapeFillColor || "#ffffff";

        const hasStroke =
          activeShape.hasStroke !== false &&
          (activeShape.shapeStrokeWidth ?? 2) > 0;
        const strokeColor = activeShape.shapeStrokeColor || "#000000";
        const strokeWidth = activeShape.shapeStrokeWidth ?? 2;

        const updateShape = (updates: Partial<AnnotationItem>) => {
          dispatchAnnotationUpdate(
            (prev) =>
              prev.map((item) =>
                item.id === activeShape.id ? { ...item, ...updates } : item,
              ),
            "Updated shape properties",
          );
        };

        const menuWidth = 260;
        const menuHeight = 340;
        const posX = Math.min(
          Math.max(10, shapeContextMenu.x),
          window.innerWidth - menuWidth - 10,
        );
        const posY = Math.min(
          Math.max(10, shapeContextMenu.y),
          window.innerHeight - menuHeight - 10,
        );

        const fillPresets = [
          { name: "White", hex: "#ffffff" },
          { name: "Yellow", hex: "#fef08a" },
          { name: "Blue", hex: "#bfdbfe" },
          { name: "Green", hex: "#bbf7d0" },
          { name: "Red", hex: "#fecaca" },
          { name: "Gray", hex: "#e2e8f0" },
          { name: "Black", hex: "#000000" },
        ];

        const strokePresets = [
          { name: "Black", hex: "#000000" },
          { name: "Red", hex: "#ef4444" },
          { name: "Blue", hex: "#3b82f6" },
          { name: "Green", hex: "#22c55e" },
          { name: "Amber", hex: "#f59e0b" },
          { name: "Gray", hex: "#64748b" },
          { name: "White", hex: "#ffffff" },
        ];

        return (
          <div
            onClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.preventDefault()}
            className="fixed z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-4 w-64 text-slate-800 dark:text-slate-100 animate-in fade-in zoom-in-95 duration-150"
            style={{ left: posX, top: posY }}
          >
            {/* Title Header */}
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100 dark:border-slate-700">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5" /> Shape Options
              </span>
              <button
                onClick={() => setShapeContextMenu(null)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 rounded-md cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 1. Shape Type Selection */}
            <div className="mb-3 space-y-1">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Shape Type
              </label>
              <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
                <button
                  onClick={() => updateShape({ shapeType: "rectangle" })}
                  className={`flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    shapeType === "rectangle"
                      ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  <Square className="w-3.5 h-3.5" /> Rect
                </button>
                <button
                  onClick={() => updateShape({ shapeType: "circle" })}
                  className={`flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    shapeType === "circle"
                      ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  <Circle className="w-3.5 h-3.5" /> Circle
                </button>
                <button
                  onClick={() => updateShape({ shapeType: "line" })}
                  className={`flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    shapeType === "line"
                      ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  <Minus className="w-3.5 h-3.5" /> Line
                </button>
              </div>
            </div>

            {/* 2. Fill Control */}
            {shapeType !== "line" && (
              <div className="mb-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Fill Color
                  </span>
                  <button
                    onClick={() => updateShape({ hasFill: !hasFill })}
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md cursor-pointer transition-colors ${
                      hasFill
                        ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300"
                        : "bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-400"
                    }`}
                  >
                    {hasFill ? "ENABLED" : "NO FILL"}
                  </button>
                </div>

                {hasFill && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    {fillPresets.map((preset) => (
                      <button
                        key={preset.hex}
                        onClick={() =>
                          updateShape({
                            shapeFillColor: preset.hex,
                            hasFill: true,
                          })
                        }
                        className={`w-5 h-5 rounded-full border border-slate-300 dark:border-slate-600 cursor-pointer transition-transform ${
                          fillColor.toLowerCase() === preset.hex.toLowerCase()
                            ? "ring-2 ring-indigo-500 scale-110"
                            : "hover:scale-105"
                        }`}
                        style={{ backgroundColor: preset.hex }}
                        title={preset.name}
                      />
                    ))}
                    <input
                      type="color"
                      value={fillColor.startsWith("#") ? fillColor : "#ffffff"}
                      onChange={(e) =>
                        updateShape({
                          shapeFillColor: e.target.value,
                          hasFill: true,
                        })
                      }
                      className="w-5 h-5 rounded-full border-0 p-0 bg-transparent cursor-pointer"
                      title="Custom color"
                    />
                  </div>
                )}
              </div>
            )}

            {/* 3. Stroke Control */}
            <div className="mb-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Stroke Outline
                </span>
                <button
                  onClick={() => updateShape({ hasStroke: !hasStroke })}
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md cursor-pointer transition-colors ${
                    hasStroke
                      ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300"
                      : "bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-400"
                  }`}
                >
                  {hasStroke ? "ENABLED" : "NO STROKE"}
                </button>
              </div>

              {hasStroke && (
                <div className="space-y-2 pt-0.5">
                  {/* Stroke Width Selector */}
                  <div className="flex items-center justify-between gap-1">
                    {[1, 2, 4, 6].map((w) => (
                      <button
                        key={w}
                        onClick={() =>
                          updateShape({ shapeStrokeWidth: w, hasStroke: true })
                        }
                        className={`flex-1 py-1 text-[10px] font-bold rounded-md border transition-all cursor-pointer ${
                          strokeWidth === w
                            ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300"
                            : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                        }`}
                      >
                        {w}px
                      </button>
                    ))}
                  </div>

                  {/* Stroke Color presets */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {strokePresets.map((preset) => (
                      <button
                        key={preset.hex}
                        onClick={() =>
                          updateShape({
                            shapeStrokeColor: preset.hex,
                            hasStroke: true,
                          })
                        }
                        className={`w-5 h-5 rounded-full border border-slate-300 dark:border-slate-600 cursor-pointer transition-transform ${
                          strokeColor.toLowerCase() === preset.hex.toLowerCase()
                            ? "ring-2 ring-indigo-500 scale-110"
                            : "hover:scale-105"
                        }`}
                        style={{ backgroundColor: preset.hex }}
                        title={preset.name}
                      />
                    ))}
                    <input
                      type="color"
                      value={
                        strokeColor.startsWith("#") ? strokeColor : "#000000"
                      }
                      onChange={(e) =>
                        updateShape({
                          shapeStrokeColor: e.target.value,
                          hasStroke: true,
                        })
                      }
                      className="w-5 h-5 rounded-full border-0 p-0 bg-transparent cursor-pointer"
                      title="Custom stroke color"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 4. Delete Action */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
              <button
                onClick={() => {
                  handleDeleteAnnotation(activeShape.id);
                  setShapeContextMenu(null);
                }}
                className="w-full py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/30 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete Shape
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
