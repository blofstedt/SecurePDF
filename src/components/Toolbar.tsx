import {
  MousePointer,
  Type,
  PenTool,
  Award,
  Palette,
  Type as FontIcon,
  CalendarDays,
  Signature,
  Eraser,
  Square,
  FileMinus,
} from "lucide-react";

export type ToolMode = "select" | "text" | "draw" | "stamp" | "redact" | "shape";
export type StampType =
  | "APPROVED"
  | "REJECTED"
  | "SIGN_HERE"
  | "INITIAL_HERE"
  | "DATE"
  | "CHECKMARK"
  | "CROSS";

interface ToolbarProps {
  activeMode: ToolMode;
  setMode: (mode: ToolMode) => void;
  textFontSize: number;
  setTextFontSize: (size: number) => void;
  textFontColor: string;
  setTextFontColor: (color: string) => void;
  textFontFamily: string;
  setTextFontFamily: (font: string) => void;
  activeStampType: StampType;
  setActiveStampType: (type: StampType) => void;
  onOpenSignatureModal: () => void;
  onSignatureToolClick: () => void;
  savedSignaturesCount: number;
  onDeletePage: () => void;
}

export default function Toolbar({
  activeMode,
  setMode,
  textFontSize,
  setTextFontSize,
  textFontColor,
  setTextFontColor,
  textFontFamily,
  setTextFontFamily,
  activeStampType,
  setActiveStampType,
  onOpenSignatureModal,
  onSignatureToolClick,
  savedSignaturesCount,
  onDeletePage,
}: ToolbarProps) {
  const stamps: { type: StampType; label: string; color: string }[] = [
    {
      type: "APPROVED",
      label: "APPROVED",
      color: "text-emerald-700 bg-emerald-50 border-emerald-100",
    },
    {
      type: "REJECTED",
      label: "REJECTED",
      color: "text-rose-700 bg-rose-50 border-rose-100",
    },
    {
      type: "SIGN_HERE",
      label: "SIGN HERE ➔",
      color: "text-amber-700 bg-amber-50 border-amber-100",
    },
    {
      type: "INITIAL_HERE",
      label: "INITIALS ➔",
      color: "text-purple-700 bg-purple-55 bg-purple-50 border-purple-100",
    },
    {
      type: "DATE",
      label: "DATE PLACE",
      color: "text-sky-700 bg-sky-50 border-sky-100",
    },
    {
      type: "CHECKMARK",
      label: "✓ CHECK",
      color:
        "text-emerald-750 text-emerald-800 bg-emerald-50 border-emerald-100",
    },
    {
      type: "CROSS",
      label: "✗ CROSS",
      color: "text-rose-750 text-rose-800 bg-rose-50 border-rose-100",
    },
  ];

  const colors = [
    { name: "Pitch Black", hex: "#0f172a" },
    { name: "Navy Private", hex: "#1d4ed8" },
    { name: "Crimson Secure", hex: "#be123c" },
    { name: "Emerald Signed", hex: "#047857" },
    { name: "Gold Check", hex: "#b45309" },
  ];

  return (
    <div
      id="editor-floating-toolbar"
      className="flex flex-col-reverse md:flex-row-reverse items-center gap-4 pointer-events-none"
    >
      {/* 1. Core Tool Selectors */}
      <div className="bg-white dark:bg-slate-800 p-1.5 rounded-full shadow-xl border border-slate-200 dark:border-slate-700 flex flex-row md:flex-col items-center space-x-1.5 md:space-x-0 space-y-0 md:space-y-1.5 transition-colors pointer-events-auto">
        <button
          id="tool-select-btn"
          title="Selector: Drag, Resize, Edit"
          onClick={() => setMode("select")}
          className={`flex items-center justify-center w-8 h-8 rounded-full transition-all cursor-pointer ${
            activeMode === "select"
              ? "bg-blue-500 text-white shadow-md scale-105"
              : "text-blue-500 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-800/50"
          }`}
        >
          <MousePointer className="w-4 h-4" />
        </button>

        <button
          id="tool-text-btn"
          title="Insert Text Box"
          onClick={() => setMode("text")}
          className={`flex items-center justify-center w-8 h-8 rounded-full transition-all cursor-pointer ${
            activeMode === "text"
              ? "bg-emerald-500 text-white shadow-md scale-105"
              : "text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-800/50"
          }`}
        >
          <Type className="w-4 h-4" />
        </button>

        <button
          id="tool-draw-btn"
          title="Freehand Ink Drawing"
          onClick={() => setMode("draw")}
          className={`flex items-center justify-center w-8 h-8 rounded-full transition-all cursor-pointer ${
            activeMode === "draw"
              ? "bg-purple-500 text-white shadow-md scale-105"
              : "text-purple-500 bg-purple-50 dark:bg-purple-900/30 hover:bg-purple-100 dark:hover:bg-purple-800/50"
          }`}
        >
          <PenTool className="w-4 h-4" />
        </button>

        <button
          id="tool-stamp-btn"
          title="Place Verification Stamps"
          onClick={() => setMode("stamp")}
          className={`flex items-center justify-center w-8 h-8 rounded-full transition-all cursor-pointer ${
            activeMode === "stamp"
              ? "bg-amber-500 text-white shadow-md scale-105"
              : "text-amber-500 bg-amber-50 dark:bg-amber-900/30 hover:bg-amber-100 dark:hover:bg-amber-800/50"
          }`}
        >
          <Award className="w-4 h-4" />
        </button>

        <button
          id="tool-redact-btn"
          title="Secure Redaction"
          onClick={() => setMode("redact")}
          className={`flex items-center justify-center w-8 h-8 rounded-full transition-all cursor-pointer ${
            activeMode === "redact"
              ? "bg-rose-500 text-white shadow-md scale-105"
              : "text-rose-500 bg-rose-50 dark:bg-rose-900/30 hover:bg-rose-100 dark:hover:bg-rose-800/50"
          }`}
        >
          <Eraser className="w-4 h-4" />
        </button>
        <button
          id="tool-shape-btn"
          title="Shapes"
          onClick={() => setMode("shape")}
          className={`flex items-center justify-center w-8 h-8 rounded-full transition-all cursor-pointer ${
            activeMode === "shape"
              ? "bg-emerald-500 text-white shadow-md scale-105"
              : "text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-800/50"
          }`}
        >
          <Square className="w-4 h-4" />
        </button>

        <button
          id="tool-signature-btn"
          title="Signatures"
          onClick={onSignatureToolClick}
          className={`flex items-center justify-center w-8 h-8 rounded-full transition-all cursor-pointer text-cyan-500 bg-cyan-50 dark:bg-cyan-900/30 hover:bg-cyan-100 dark:hover:bg-cyan-800/50`}
        >
          <Signature className="w-4 h-4" />
        </button>

        <div className="w-px h-6 mx-1 md:w-6 md:h-px md:mx-0 md:my-0.5 bg-slate-200 dark:bg-slate-700 shrink-0" />

        <button
          id="tool-delete-page-btn"
          title="Delete Current Page"
          onClick={onDeletePage}
          className={`flex items-center justify-center w-8 h-8 rounded-full transition-all cursor-pointer text-rose-600 bg-rose-100 dark:bg-rose-900/50 hover:bg-rose-200 dark:hover:bg-rose-800/50 hover:scale-105`}
        >
          <FileMinus className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Sub-controls (Dynamic based on selected mode) */}
      <div
        id="tool-sub-configuration"
        className="pointer-events-auto flex items-center justify-center md:justify-end"
      >
        {activeMode === "shape" && (
          <div className="text-[11px] max-w-[160px] font-bold text-slate-500 dark:text-slate-400 select-none bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 animate-in slide-in-from-bottom-4 md:slide-in-from-right-4 duration-200 transition-colors">
            <div className="flex items-center mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-2 animate-pulse shrink-0" />
              <span className="text-emerald-600 dark:text-emerald-400">
                Shape Tool Active
              </span>
            </div>
            Click on document to add a blank rectangle.
          </div>
        )}
        {activeMode === "text" && (
          <div className="flex flex-col gap-3 text-xs bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 animate-in slide-in-from-bottom-4 md:slide-in-from-right-4 duration-200 transition-colors">
            {/* Color Select */}
            <div className="flex items-center justify-between space-x-1.5 pb-2 border-b border-slate-100 dark:border-slate-700">
              <Palette className="w-4 h-4 text-slate-400 dark:text-slate-500 mr-1" />
              <div className="flex gap-1.5">
                {colors.map((c) => (
                  <button
                    key={c.hex}
                    id={`text-color-${c.hex}`}
                    title={c.name}
                    onClick={() => setTextFontColor(c.hex)}
                    className={`w-5 h-5 rounded-full cursor-pointer hover:scale-125 transition-transform border border-slate-300 dark:border-slate-600 ${
                      textFontColor === c.hex
                        ? "ring-2 ring-indigo-600 dark:ring-indigo-400 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 border border-white dark:border-slate-800"
                        : ""
                    }`}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
            </div>

            {/* Font Family */}
            <div className="flex items-center justify-between space-x-1.5 pb-2 border-b border-slate-100 dark:border-slate-700">
              <FontIcon className="w-4 h-4 text-slate-400 dark:text-slate-500 mr-1" />
              <select
                id="font-family-select"
                value={textFontFamily}
                onChange={(e) => setTextFontFamily(e.target.value)}
                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md p-1.5 text-xs text-slate-800 dark:text-slate-200 font-sans font-bold focus:outline-hidden cursor-pointer"
              >
                <option value="Helvetica">Helvetica (Standard)</option>
                <option value="Times-Roman">Times New Roman</option>
                <option value="Courier">Courier Mono</option>
              </select>
            </div>

            {/* Size */}
            <div className="flex items-center justify-between space-x-2">
              <span className="text-slate-400 dark:text-slate-500 font-bold text-[10px]">
                SIZE:
              </span>
              <input
                id="font-size-range"
                type="range"
                min="8"
                max="36"
                value={textFontSize}
                onChange={(e) => setTextFontSize(Number(e.target.value))}
                className="w-24 accent-emerald-500 cursor-pointer"
              />
              <span className="font-sans font-bold text-xs text-slate-800 dark:text-slate-200 w-5 text-right">
                {textFontSize}
              </span>
            </div>
          </div>
        )}

        {activeMode === "stamp" && (
          <div className="flex flex-col gap-2 bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 animate-in slide-in-from-bottom-4 md:slide-in-from-right-4 duration-200 transition-colors">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-1 select-none uppercase tracking-wider">
              STAMP CODES:
            </span>
            {stamps.map((st) => (
              <button
                key={st.type}
                id={`stamp-choice-${st.type}`}
                onClick={() => setActiveStampType(st.type)}
                className={`p-2 rounded-lg border text-xs font-sans font-bold transition-all cursor-pointer text-left ${
                  activeStampType === st.type
                    ? "bg-amber-500 text-white border-amber-500 shadow-md scale-105"
                    : `hover:bg-white dark:hover:bg-slate-700 ${st.color}`
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        )}

        {activeMode === "draw" && (
          <div className="text-[11px] max-w-[160px] font-bold text-slate-500 dark:text-slate-400 select-none bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 animate-in slide-in-from-bottom-4 md:slide-in-from-right-4 duration-200 transition-colors">
            <div className="flex items-center mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500 mr-2 animate-pulse shrink-0" />
              <span className="text-purple-600 dark:text-purple-400">
                Ink Sketch Active
              </span>
            </div>
            Press and drag on document to draw.
          </div>
        )}

        {activeMode === "select" && (
          <div className="text-[11px] max-w-[160px] font-bold text-slate-500 dark:text-slate-400 select-none bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 animate-in slide-in-from-bottom-4 md:slide-in-from-right-4 duration-200 transition-colors">
            <div className="flex items-center mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 mr-2 animate-pulse shrink-0" />
              <span className="text-blue-600 dark:text-blue-400">
                Pointer Active
              </span>
            </div>
            Click elements to drag, resize, edit, or delete layers.
          </div>
        )}
      </div>
    </div>
  );
}
