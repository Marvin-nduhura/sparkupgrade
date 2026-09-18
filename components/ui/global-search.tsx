"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Building2, Package, FileText, Users, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useDebounce } from "@/hooks/use-debounce";

interface SearchResult {
  id: string;
  type: "project" | "inventory" | "purchase" | "user";
  title: string;
  subtitle: string;
  href: string;
}

interface GlobalSearchProps {
  open: boolean;
  onClose: () => void;
}

const typeIcons: Record<string, React.ElementType> = {
  project: Building2,
  inventory: Package,
  purchase: FileText,
  user: Users,
};

export function GlobalSearch({ open, onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debouncedQuery = useDebounce(query, 300);
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (open) onClose();
      }
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const search = useCallback(async (q: string) => {
    if (!q.trim() || q.length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { search(debouncedQuery); }, [debouncedQuery, search]);

  const handleSelect = (result: SearchResult) => {
    router.push(result.href);
    onClose();
    setQuery("");
    setResults([]);
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-xl bg-card rounded-2xl border border-border shadow-2xl overflow-hidden"
        >
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
            <Search className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search projects, inventory, reports..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
            <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Results */}
          <div className="max-h-80 overflow-y-auto scrollbar-thin">
            {results.length > 0 ? (
              <ul className="p-2">
                {results.map((result) => {
                  const Icon = typeIcons[result.type] || FileText;
                  return (
                    <li key={result.id}>
                      <button
                        onClick={() => handleSelect(result)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted transition-colors text-left"
                      >
                        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Icon className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{result.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                        </div>
                        <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full capitalize">
                          {result.type}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : query.length >= 2 && !loading ? (
              <div className="py-12 text-center">
                <Search className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-30" />
                <p className="text-sm text-muted-foreground">No results found for &quot;{query}&quot;</p>
              </div>
            ) : (
              <div className="p-4">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-3">Quick Links</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { href: "/dashboard/projects", label: "Projects", icon: Building2 },
                    { href: "/dashboard/inventory", label: "Inventory", icon: Package },
                    { href: "/dashboard/reports", label: "Reports", icon: FileText },
                    { href: "/dashboard/admin/users", label: "Users", icon: Users },
                  ].map((link) => (
                    <button
                      key={link.href}
                      onClick={() => { router.push(link.href); onClose(); }}
                      className="flex items-center gap-2 p-3 rounded-xl hover:bg-muted transition-colors text-sm"
                    >
                      <link.icon className="w-4 h-4 text-primary" />
                      {link.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-border flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>↑↓ navigate</span>
              <span>↵ select</span>
              <span>esc close</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
