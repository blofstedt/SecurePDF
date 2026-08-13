import React from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  MousePointer,
  Type,
  PenTool,
  Award,
  Palette,
  Type as FontIcon,
  Signature,
  Eraser,
  Square,
  FileMinus,
  ShieldAlert,
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
  onOpenFindAndRedactModal?: () => void;
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
  onOpenFindAndRedactModal,
  savedSignaturesCount,
  onDeletePage,
}: ToolbarProps) {
  const tools: {
    id: ToolMode;
    title: string;
    icon: React.ReactNode;
    activeBgClass: string;
    inactiveClass: string;
  }[] = [
    {
      id: "select",
      title: "Pointer: Select & Edit",
      icon: <MousePointer className="w-4 h-4" />,
      activeBgClass: "bg-blue-600 shadow-blue-500/30",
      inactiveClass: "text-blue-600 bg-blue-50 dark:bg-blue-900/40 hover:bg-blue-100 dark:hover:bg-blue-800/60",
    },
    {
      id: "text",
      title: "Insert Text Box",
      icon: <Type className="w-4 h-4" />,
      activeBgClass: "bg-emerald-600 shadow-emerald-500/30",
      inactiveClass: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/40 hover:bg-emerald-100 dark:hover:bg-emerald-800/60",
    },
    {
      id: "draw",
      title: "Freehand Ink Drawing",
      icon: <PenTool className="w-4 h-4" />,
      activeBgClass: "bg-purple-600 shadow-purple-500/30",
      inactiveClass: "text-purple-600 bg-purple-50 dark:bg-purple-900/40 hover:bg-purple-100 dark:hover:bg-purple-800/60",
    },
    {
      id: "stamp",
      title: "Verification Stamps",
      icon: <Award className="w-4 h-4" />,
      activeBgClass: "bg-amber-600 shadow-amber-500/30",
      inactiveClass: "text-amber-600 bg-amber-50 dark:bg-amber-900/40 hover:bg-amber-100 dark:hover:bg-amber-800/60",
    },
    {
      id: "redact",
      title: "Secure Redaction",
      icon: <Eraser className="w-4 h-4" />,
      activeBgClass: "bg-rose-600 shadow-rose-500/30",
      inactiveClass: "text-rose-600 bg-rose-50 dark:bg-rose-900/40 hover:bg-rose-100 dark:hover:bg-rose-800/60",
    },
    {
      id: "shape",
      title: "Shapes",
      icon: <Square className="w-4 h-4" />,
      activeBgClass: "bg-emerald-600 shadow-emerald-500/30",
      inactiveClass: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/40 hover:bg-emerald-100 dark:hover:bg-emerald-800/60",
    },
  ];

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
      color: "text-purple-700 bg-purple-50 border-purple-100",
    },
    {
      type: "DATE",
      label: "DATE PLACE",
      color: "text-sky-700 bg-sky-50 border-sky-100",
    },
    {
      type: "CHECKMARK",
      label: "✓ CHECK",
      color: "text-emerald-800 bg-emerald-50 border-emerald-100",
    },
    {
      type: "CROSS",
      label: "✗ CROSS",
      color: "text-rose-800 bg-rose-50 border-rose-100",
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
      className="flex flex-col-reverse md:flex-row-reverse items-center gap-3 pointer-events-none max-w-full"
    >
      {/* 1. Core Tool Selectors */}
      <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-md p-2 rounded-full shadow-2xl border border-slate-200/80 dark:border-slate-700/80 flex flex-row md:flex-col items-center space-x-2 md:space-x-0 space-y-0 md:space-y-2 transition-colors pointer-events-auto overflow-x-auto max-w-full no-scrollbar">
        {tools.map((tool) => {
          const isActive = activeMode === tool.id;
          return (
            <motion.button
              key={tool.id}
              id={`tool-${tool.id}-btn`}
              title={tool.title}
              onClick={() => setMode(tool.id)}
              whileTap={{ scale: 0.92 }}
              className="relative flex items-center justify-center min-w-[40px] min-h-[40px] w-10 h-10 md:w-9 md:h-9 rounded-full cursor-pointer select-none"
            >
              {isActive && (
                <motion.div
                  layoutId="activeToolPill"
                  className={`absolute inset-0 rounded-full ${tool.activeBgClass} shadow-md`}
                  transition={{
                    type: "spring",
                    stiffness: 450,
                    damping: 30,
                  }}
                />
              )}
              <span
                className={`relative z-10 flex items-center justify-center w-full h-full rounded-full transition-colors ${
                  isActive
                    ? "text-white"
                    : tool.inactiveClass
                }`}
              >
                {tool.icon}
              </span>
            </motion.button>
          );
        })}

        <motion.button
          id="tool-signature-btn"
          title="Signatures"
          onClick={onSignatureToolClick}
          whileTap={{ scale: 0.92 }}
          whileHover={{ scale: 1.05 }}
          className="flex items-center justify-center min-w-[40px] min-h-[40px] w-10 h-10 md:w-9 md:h-9 rounded-full cursor-pointer text-cyan-600 bg-cyan-50 dark:bg-cyan-900/40 hover:bg-cyan-100 dark:hover:bg-cyan-800/60"
        >
          <Signature className="w-4 h-4 md:w-4 md:h-4" />
        </motion.button>

        <div className="w-px h-6 mx-0.5 md:w-6 md:h-px md:mx-0 md:my-0.5 bg-slate-200 dark:bg-slate-700 shrink-0" />

        <motion.button
          id="tool-delete-page-btn"
          title="Delete Current Page"
          onClick={onDeletePage}
          whileTap={{ scale: 0.92 }}
          whileHover={{ scale: 1.05 }}
          className="flex items-center justify-center min-w-[40px] min-h-[40px] w-10 h-10 md:w-9 md:h-9 rounded-full cursor-pointer text-rose-600 bg-rose-100 dark:bg-rose-900/50 hover:bg-rose-200 dark:hover:bg-rose-800/60"
        >
          <FileMinus className="w-4 h-4 md:w-4 md:h-4" />
        </motion.button>
      </div>

      {/* 2. Sub-configuration (Dynamic with smooth spring transition) */}
      <div
        id="tool-sub-configuration"
        className="pointer-events-auto flex items-center justify-center md:justify-end max-w-full"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeMode}
            initial={{ opacity: 0, scale: 0.94, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: -6 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          >
            {activeMode === "shape" && (
              <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300 select-none bg-white/95 dark:bg-slate-800/95 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 transition-colors">
                <div className="flex items-center mb-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-2 animate-pulse shrink-0" />
                  <span className="text-emerald-600 dark:text-emerald-400 font-extrabold uppercase tracking-wider text-[10px]">
                    Shape Mode
                  </span>
                </div>
                Tap document to place shape. Right-click / tap to customize.
              </div>
            )}

            {activeMode === "text" && (
              <div className="flex flex-col gap-2.5 text-xs bg-white/95 dark:bg-slate-800/95 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 transition-colors min-w-[220px]">
                {/* Color Select */}
                <div className="flex items-center justify-between space-x-1.5 pb-2 border-b border-slate-100 dark:border-slate-700">
                  <Palette className="w-4 h-4 text-slate-400 dark:text-slate-500 mr-1" />
                  <div className="flex gap-2">
                    {colors.map((c) => (
                      <button
                        key={c.hex}
                        id={`text-color-${c.hex}`}
                        title={c.name}
                        onClick={() => setTextFontColor(c.hex)}
                        className={`w-6 h-6 rounded-full cursor-pointer transition-transform border border-slate-300 dark:border-slate-600 ${
                          textFontColor === c.hex
                            ? "ring-2 ring-indigo-600 dark:ring-indigo-400 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 border border-white dark:border-slate-800 scale-110"
                            : "hover:scale-105"
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
                    className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 text-xs text-slate-800 dark:text-slate-200 font-sans font-bold focus:outline-hidden cursor-pointer"
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
                    className="w-28 accent-emerald-500 cursor-pointer h-2"
                  />
                  <span className="font-sans font-bold text-xs text-slate-800 dark:text-slate-200 w-5 text-right">
                    {textFontSize}
                  </span>
                </div>
              </div>
            )}

            {activeMode === "stamp" && (
              <div className="flex flex-col gap-1.5 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 transition-colors max-h-[180px] overflow-y-auto">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-0.5 select-none uppercase tracking-wider">
                  SELECT STAMP:
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {stamps.map((st) => (
                    <button
                      key={st.type}
                      id={`stamp-choice-${st.type}`}
                      onClick={() => setActiveStampType(st.type)}
                      className={`p-2 rounded-xl border text-[11px] font-sans font-extrabold transition-all cursor-pointer text-center ${
                        activeStampType === st.type
                          ? "bg-amber-500 text-white border-amber-500 shadow-md scale-105"
                          : `hover:bg-white dark:hover:bg-slate-700 ${st.color}`
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeMode === "redact" && (
              <div className="flex flex-col gap-2 text-[11px] font-bold text-slate-600 dark:text-slate-300 select-none bg-white/95 dark:bg-slate-800/95 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 transition-colors">
                <div className="flex items-center">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 mr-2 animate-pulse shrink-0" />
                  <span className="text-rose-600 dark:text-rose-400 font-extrabold uppercase tracking-wider text-[10px]">
                    Redaction Mode
                  </span>
                </div>
                {onOpenFindAndRedactModal && (
                  <button
                    onClick={onOpenFindAndRedactModal}
                    className="w-full py-1.5 px-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Find & Auto-Redact...</span>
                  </button>
                )}
              </div>
            )}

            {activeMode === "draw" && (
              <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300 select-none bg-white/95 dark:bg-slate-800/95 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 transition-colors">
                <div className="flex items-center mb-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500 mr-2 animate-pulse shrink-0" />
                  <span className="text-purple-600 dark:text-purple-400 font-extrabold uppercase tracking-wider text-[10px]">
                    Freehand Ink
                  </span>
                </div>
                Touch and draw anywhere on document.
              </div>
            )}

            {activeMode === "select" && (
              <div className="hidden md:block text-[11px] font-bold text-slate-500 dark:text-slate-400 select-none bg-white/95 dark:bg-slate-800/95 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 transition-colors">
                <div className="flex items-center mb-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 mr-2 animate-pulse shrink-0" />
                  <span className="text-blue-600 dark:text-blue-400 font-extrabold uppercase tracking-wider text-[10px]">
                    Pointer Mode
                  </span>
                </div>
                Tap elements to drag, resize or edit.
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

