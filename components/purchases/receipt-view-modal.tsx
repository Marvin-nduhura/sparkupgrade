"use client";

import { motion } from "framer-motion";
import { X, Download, ZoomIn, ZoomOut } from "lucide-react";
import { useState } from "react";

export function ReceiptViewModal({ url, onClose }: { url: string; onClose: () => void }) {
  const [zoom, setZoom] = useState(1);
  const isPdf = url.toLowerCase().endsWith(".pdf");

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = url;
    a.download = url.split("/").pop() || "receipt";
    a.click();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="relative bg-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
          <h3 className="font-semibold text-sm">Receipt / Invoice</h3>
          <div className="flex items-center gap-2">
            {!isPdf && (
              <>
                <button onClick={() => setZoom(z => Math.max(0.5, z - 0.25))} className="p-2 hover:bg-muted rounded-lg transition-colors"><ZoomOut className="w-4 h-4" /></button>
                <span className="text-xs text-muted-foreground w-10 text-center">{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom(z => Math.min(3, z + 0.25))} className="p-2 hover:bg-muted rounded-lg transition-colors"><ZoomIn className="w-4 h-4" /></button>
              </>
            )}
            <button onClick={handleDownload} className="p-2 hover:bg-muted rounded-lg transition-colors text-primary"><Download className="w-4 h-4" /></button>
            <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors"><X className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="flex-1 overflow-auto flex items-center justify-center p-4 bg-muted/20">
          {isPdf ? (
            <iframe src={url} className="w-full h-full min-h-[500px] rounded-lg" title="Receipt PDF" />
          ) : (
            <img src={url} alt="Receipt" className="rounded-lg shadow-lg transition-transform duration-200" style={{ transform: `scale(${zoom})`, transformOrigin: "center", maxWidth: "100%" }} />
          )}
        </div>
      </motion.div>
    </div>
  );
}
