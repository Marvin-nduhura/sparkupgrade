"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Building2, Download, Loader2, ChevronLeft, ChevronRight, MapPin, Users, Calendar } from "lucide-react";
import Link from "next/link";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";

export default function ProjectReportsPage() {
  const [selectedProject, setSelectedProject] = useState("");
  const [downloading, setDownloading] = useState("");

  const { data: projectsData, isLoading } = useQuery({
    queryKey: ["projects-report"],
    queryFn: async () => {
      const r = await fetch("/api/projects?limit=100");
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
  });

  const { data: detail } = useQuery({
    queryKey: ["project-detail-report", selectedProject],
    enabled: !!selectedProject,
    queryFn: async () => {
      const r = await fetch(`/api/projects/${selectedProject}`);
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
  });

  const handleDownload = async (projectId: string) => {
    setDownloading(projectId);
    try {
      const p = new URLSearchParams({ format: "pdf", period: "year", projectId });
      const res = await fetch(`/api/reports/download?${p}`);
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `project-report-${projectId}.html`; a.click();
      URL.revokeObjectURL(url);
      toast.success("Report downloaded!");
    } catch (e: any) { toast.error(e.message); }
    finally { setDownloading(""); }
  };

  const projects = projectsData?.projects || [];

  return (
    <div className="page-container pb-24 md:pb-8">
      <div className="section-header">
        <div>
          <h1 className="text-2xl font-display font-bold">Project Reports</h1>
          <p className="text-sm text-muted-foreground">Individual project performance reports</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? Array.from({length:6}).map((_,i)=><div key={i} className="skeleton h-44 rounded-2xl"/>) :
          projects.map((proj: any, i: number) => {
            const totalReceived = proj.moneyReceived?.reduce((s: number, m: any) => s+m.amount, 0) || 0;
            const totalSpent = proj.purchases?.reduce((s: number, p: any) => s+p.totalAmount, 0) || 0;
            const balance = totalReceived - totalSpent;
            const managers = proj.assignments?.filter((a: any) => a.isActive) || [];
            return (
              <motion.div key={proj.id} initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:i*0.06}}
                className={cn("bg-card border rounded-2xl p-4 hover:shadow-card-hover transition-all cursor-pointer", selectedProject===proj.id?"border-primary ring-2 ring-primary/20":"border-border")}
                onClick={() => setSelectedProject(proj.id === selectedProject ? "" : proj.id)}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 bg-gradient-brand rounded-xl flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-4 h-4 text-white"/>
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{proj.name}</p>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5"/>{proj.location}</p>
                    </div>
                  </div>
                  <span className={cn("text-[10px] font-bold", proj.status==="ACTIVE"?"badge-success":"badge-warning")}>{proj.status}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center mb-3">
                  <div className="p-1.5 bg-green-50 dark:bg-green-950/20 rounded-lg">
                    <p className="text-[10px] text-muted-foreground">Received</p>
                    <p className="text-xs font-bold text-green-600">{totalReceived>=1e6?`${(totalReceived/1e6).toFixed(1)}M`:`${(totalReceived/1e3).toFixed(0)}K`}</p>
                  </div>
                  <div className="p-1.5 bg-red-50 dark:bg-red-950/20 rounded-lg">
                    <p className="text-[10px] text-muted-foreground">Spent</p>
                    <p className="text-xs font-bold text-red-500">{totalSpent>=1e6?`${(totalSpent/1e6).toFixed(1)}M`:`${(totalSpent/1e3).toFixed(0)}K`}</p>
                  </div>
                  <div className={cn("p-1.5 rounded-lg", balance>=0?"bg-blue-50 dark:bg-blue-950/20":"bg-red-50 dark:bg-red-950/20")}>
                    <p className="text-[10px] text-muted-foreground">Balance</p>
                    <p className={cn("text-xs font-bold", balance>=0?"text-blue-600":"text-red-500")}>{Math.abs(balance)>=1e6?`${(Math.abs(balance)/1e6).toFixed(1)}M`:`${(Math.abs(balance)/1e3).toFixed(0)}K`}</p>
                  </div>
                </div>
                {managers.length > 0 && (
                  <p className="text-[10px] text-muted-foreground mb-2 flex items-center gap-1">
                    <Users className="w-3 h-3"/>{managers.map((a:any)=>a.user?.name).join(", ")}
                  </p>
                )}
                <div className="flex gap-2">
                  <Link href={`/dashboard/projects/${proj.id}`} onClick={e=>e.stopPropagation()}
                    className="flex-1 text-center text-xs py-1.5 bg-muted hover:bg-muted/80 rounded-lg transition-colors">
                    View Details
                  </Link>
                  <button onClick={e=>{e.stopPropagation();handleDownload(proj.id);}} disabled={downloading===proj.id}
                    className="flex-1 text-xs py-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition-colors flex items-center justify-center gap-1">
                    {downloading===proj.id?<Loader2 className="w-3 h-3 animate-spin"/>:<Download className="w-3 h-3"/>}
                    Report
                  </button>
                </div>
              </motion.div>
            );
          })
        }
      </div>
    </div>
  );
}
