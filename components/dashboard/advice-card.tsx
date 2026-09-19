"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Lightbulb, X, Loader2, Sparkles } from "lucide-react";

export function AdviceCard() {
  const [dismissed, setDismissed] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["advice"],
    queryFn: async () => {
      const r = await fetch("/api/advice");
      if (!r.ok) return { advice: "" };
      return r.json();
    },
    staleTime: 1000 * 60 * 30,
  });

  if (dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="bg-card border border-border rounded-2xl p-4 relative overflow-hidden"
      >
        <div className="absolute -right-6 -top-6 w-24 h-24 bg-primary/10 rounded-full" />
        <div className="flex items-start gap-3 relative">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Lightbulb className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" /> Suggested advice
            </p>
            {isLoading ? (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Preparing insights…
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed whitespace-pre-wrap">
                {data?.advice || "Keep receipts, stock levels, and site cash-flow updated daily."}
              </p>
            )}
            <p className="text-[10px] text-muted-foreground mt-2">You can take this advice or ignore it.</p>
          </div>
          <button onClick={() => setDismissed(true)} className="p-1 rounded-lg hover:bg-muted text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
