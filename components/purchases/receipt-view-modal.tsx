"use client";

import { motion } from "framer-motion";
import { X, Download, ZoomIn, ZoomOut, ExternalLink, FileText, FileImage, File } from "lucide-react";
import { useState } from "react";

function getFileType(url: string): "image" | "pdf" | "word" | "excel" | "other" {
  const ext = url.split("?")[0].split(".").pop()?.toLowerCase() || "";
  if (["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(ext)) return "image";
  if (ext === "pdf") return "pdf";
  if (["doc", "docx"].includes(ext)) return "word";
  if (["xls", "xlsx", "csv"].includes(ext)) return "excel";
  return "other";
}

function FileIcon({ type }: { type: ReturnType<typeof getFileType> }) {
  if (type === "image") return <FileImage className="w-12 h-12 text-blue-400" />;
  if (type === "pdf") return <FileText className="w-12 h-12 text-red-400" />;
  return <File className="w-12 h-12 text-muted-foreground" />;
}

export function ReceiptViewModal({
  url, fileName, onClose,
}: {
  url: string;
  fileName?: string;
  onClose: () => void;
}) {
  const [zoom, setZoom] = useState(1);
  const fileType = getFileType(url);
  const displayName = fileName || url.split("/").pop() || "receipt";

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = url;
    a.download = displayName;
    a.target = "_blank";
    a.click();
  };

  const handleOpenExternal = () => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
        className="relative bg-card rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0 gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {fileType === "image" && <FileImage className="w-4 h-4 text-blue-500 flex-shrink-0" />}
            {fileType === "pdf" && <FileText className="w-4 h-4 text-red-500 flex-shrink-0" />}
            {(fileType === "word" || fileType === "excel" || fileType === "other") && <File className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
            <h3 className="font-semibold text-sm truncate">{displayName}</h3>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {fileType === "image" && (
              <>
                <button onClick={() => setZoom(z => Math.max(0.25, z - 0.25))}
                  className="p-2 hover:bg-muted rounded-lg transition-colors" title="Zoom out">
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-xs text-muted-foreground w-10 text-center">{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom(z => Math.min(4, z + 0.25))}
                  className="p-2 hover:bg-muted rounded-lg transition-colors" title="Zoom in">
                  <ZoomIn className="w-4 h-4" />
                </button>
              </>
            )}
            <button onClick={handleOpenExternal}
              className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground" title="Open in new tab">
              <ExternalLink className="w-4 h-4" />
            </button>
            <button onClick={handleDownload}
              className="p-2 hover:bg-muted rounded-lg transition-colors text-primary" title="Download">
              <Download className="w-4 h-4" />
            </button>
            <button onClick={onClose}
              className="p-2 hover:bg-muted rounded-lg transition-colors" title="Close">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto flex items-center justify-center bg-muted/20" style={{ minHeight: 300 }}>
          {fileType === "image" && (
            <div className="p-4 overflow-auto w-full h-full flex items-center justify-center">
              <img
                src={url}
                alt={displayName}
                className="rounded-lg shadow-lg transition-transform duration-200 max-w-none"
                style={{ transform: `scale(${zoom})`, transformOrigin: "center" }}
              />
            </div>
          )}

          {fileType === "pdf" && (
            <iframe
              src={url}
              className="w-full h-full"
              style={{ minHeight: 500 }}
              title={displayName}
            />
          )}

          {(fileType === "word" || fileType === "excel") && (
            <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
              <FileIcon type={fileType} />
              <p className="mt-4 font-semibold text-sm">{displayName}</p>
              <p className="text-xs text-muted-foreground mt-1 mb-6">
                {fileType === "word" ? "Word document" : "Excel spreadsheet"} — cannot be previewed directly.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors">
                  <Download className="w-4 h-4" /> Download
                </button>
                <button
                  onClick={handleOpenExternal}
                  className="flex items-center gap-2 px-4 py-2.5 bg-muted text-foreground rounded-xl text-sm font-semibold hover:bg-muted/80 transition-colors">
                  <ExternalLink className="w-4 h-4" /> Open in Browser
                </button>
              </div>
            </div>
          )}

          {fileType === "other" && (
            <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
              <File className="w-12 h-12 text-muted-foreground" />
              <p className="mt-4 font-semibold text-sm">{displayName}</p>
              <p className="text-xs text-muted-foreground mt-1 mb-6">Preview not available for this file type.</p>
              <button onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors">
                <Download className="w-4 h-4" /> Download File
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
