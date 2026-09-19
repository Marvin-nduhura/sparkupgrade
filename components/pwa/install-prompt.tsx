"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HardHat, Download, X, Share, Plus } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Don't show if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // Don't show if dismissed recently
    const dismissedAt = localStorage.getItem("pwa-prompt-dismissed");
    if (dismissedAt) {
      const diff = Date.now() - parseInt(dismissedAt);
      if (diff < 7 * 24 * 60 * 60 * 1000) return; // 7 days
    }

    // Detect iOS
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream;
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    if (ios && isSafari) {
      setIsIOS(true);
      // Show iOS instructions after a delay
      const timer = setTimeout(() => setShow(true), 3000);
      return () => clearTimeout(timer);
    }

    // Android/Desktop: wait for beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show prompt after a small delay
      setTimeout(() => setShow(true), 2000);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setShow(false);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShow(false);
    setDismissed(true);
    localStorage.setItem("pwa-prompt-dismissed", String(Date.now()));
  };

  if (isInstalled || dismissed || !show) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-80 z-50"
        >
          <div className="bg-card border border-border rounded-2xl shadow-2xl p-4 relative overflow-hidden">
            {/* Decorative gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none rounded-2xl" />

            <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 p-1.5 hover:bg-muted rounded-lg transition-colors z-10"
            >
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>

            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-700 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
                <HardHat className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0 pr-6">
                <p className="font-bold text-sm">Install BuildSpark</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  {isIOS
                    ? "Tap the Share button below, then tap \"Add to Home Screen\""
                    : "Install as an app for faster access, offline support, and notifications"}
                </p>
              </div>
            </div>

            {isIOS ? (
              <div className="mt-3 p-3 bg-muted/50 rounded-xl">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Share className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>Tap <strong>Share</strong></span>
                  <span>→</span>
                  <Plus className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>Tap <strong>Add to Home Screen</strong></span>
                </div>
              </div>
            ) : (
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleDismiss}
                  className="flex-1 py-2 rounded-xl border border-border text-xs font-medium hover:bg-muted transition-colors"
                >
                  Not now
                </button>
                <motion.button
                  onClick={handleInstall}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md"
                >
                  <Download className="w-3.5 h-3.5" /> Install App
                </motion.button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
