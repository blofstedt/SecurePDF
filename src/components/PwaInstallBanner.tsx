import React, { useState, useEffect } from "react";
import { Download, X, Smartphone, Sparkles, ShieldCheck, WifiOff } from "lucide-react";
import { pwaManager } from "../lib/pwa";
import { triggerHaptic } from "../lib/haptics";

export default function PwaInstallBanner() {
  const [canInstall, setCanInstall] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showAndroidGuide, setShowAndroidGuide] = useState(false);

  useEffect(() => {
    setIsStandalone(pwaManager.isStandalone());
    const unsubscribe = pwaManager.onInstallStateChange((installable) => {
      setCanInstall(installable);
    });
    return unsubscribe;
  }, []);

  if (isStandalone || isDismissed) return null;

  const handleInstallClick = async () => {
    triggerHaptic("medium");
    const result = await pwaManager.promptInstall();
    if (result === "unsupported") {
      setShowAndroidGuide(true);
    }
  };

  return (
    <>
      <div
        id="pwa-install-banner"
        className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white px-4 py-2.5 flex items-center justify-between border-b border-indigo-500/30 text-xs shadow-md z-50 relative"
      >
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-indigo-600/60 border border-indigo-400/30 text-indigo-200">
            <Smartphone className="w-4 h-4" />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
            <span className="font-bold text-white flex items-center gap-1.5">
              Install Secure PDF Pro App
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <WifiOff className="w-2.5 h-2.5 mr-1" /> 100% Offline Ready
              </span>
            </span>
            <span className="text-slate-300 text-[11px] hidden md:inline">
              Zero-install native feel on Android & desktop with instant offline document editing.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleInstallClick}
            className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-400 active:bg-indigo-600 text-white rounded-lg font-bold text-xs shadow transition-transform active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Install App</span>
          </button>
          <button
            onClick={() => {
              triggerHaptic("light");
              setIsDismissed(true);
            }}
            title="Dismiss"
            className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-white/10 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Android Manual Install Modal Guide */}
      {showAndroidGuide && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-5 text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-sm">Install on Android</h3>
              </div>
              <button
                onClick={() => setShowAndroidGuide(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              To install Secure PDF directly into your Android app drawer:
            </p>

            <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside bg-slate-800/80 p-3 rounded-xl border border-slate-700">
              <li>Tap the <strong className="text-white">three dots (⋮)</strong> menu in Chrome or your browser.</li>
              <li>Select <strong className="text-indigo-300">"Install app"</strong> or <strong className="text-indigo-300">"Add to Home Screen"</strong>.</li>
              <li>Enjoy full-screen, offline-first PDF signing anytime!</li>
            </ol>

            <button
              onClick={() => setShowAndroidGuide(false)}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold text-xs text-white"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
