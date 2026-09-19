"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Map, Navigation, MapPin, Building2, Users, Loader2, ExternalLink } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import dynamic from "next/dynamic";

// Dynamic import to avoid SSR issues with Leaflet
const ProjectMap = dynamic(() => import("@/components/map/project-map"), { ssr: false, loading: () => <div className="h-[500px] bg-muted rounded-2xl flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div> });

export default function MapPage() {
  const [selectedProject, setSelectedProject] = useState<string>("");

  const { data } = useQuery({
    queryKey: ["projects-map"],
    queryFn: async () => {
      const res = await fetch("/api/projects?limit=100");
      if (!res.ok) throw new Error("Failed to load projects");
      return res.json();
    },
  });

  const { data: locationData } = useQuery({
    queryKey: ["manager-locations"],
    queryFn: async () => {
      const res = await fetch("/api/location");
      if (!res.ok) return { managers: [] };
      return res.json();
    },
  });

  const projects = data?.projects || [];
  const projectsWithCoords = projects.filter((p: any) => p.latitude && p.longitude);
  const managers = locationData?.managers || [];

  return (
    <div className="page-container pb-24 md:pb-8">
      <div className="section-header">
        <div>
          <h1 className="text-2xl font-display font-bold">Site Map</h1>
          <p className="text-sm text-muted-foreground">
            {projectsWithCoords.length} projects with GPS
            {managers.length > 0 ? ` • ${managers.length} managers sharing location` : ""}
          </p>
        </div>
      </div>

      {/* Map */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-card mb-4">
        <ProjectMap projects={projectsWithCoords} selectedId={selectedProject} onSelect={setSelectedProject} managers={managers} />
      </div>

      {/* Project list with location */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {projects.map((project: any) => (
          <motion.div key={project.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            onClick={() => setSelectedProject(project.id)}
            className={cn("bg-card border rounded-2xl p-4 cursor-pointer transition-all hover:shadow-card-hover", selectedProject === project.id ? "border-primary ring-2 ring-primary/20" : "border-border")}>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 bg-gradient-brand rounded-xl flex items-center justify-center flex-shrink-0">
                <Building2 className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{project.name}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3" />{project.location}
                </p>
                {project.latitude && project.longitude ? (
                  <p className="text-[10px] text-green-600 mt-1 flex items-center gap-1">
                    <Navigation className="w-3 h-3" />GPS: {Number(project.latitude).toFixed(4)}, {Number(project.longitude).toFixed(4)}
                  </p>
                ) : (
                  <p className="text-[10px] text-muted-foreground mt-1">No GPS coordinates set</p>
                )}
              </div>
              {project.latitude && project.longitude && (
                <a href={`https://www.openstreetmap.org/directions?to=${project.latitude}%2C${project.longitude}`} target="_blank" rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="p-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors flex-shrink-0">
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {projectsWithCoords.length === 0 && (
        <div className="py-16 text-center">
          <Map className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-20" />
          <h3 className="font-semibold mb-2">No GPS data yet</h3>
          <p className="text-sm text-muted-foreground">Projects will appear on the map once coordinates are added.</p>
        </div>
      )}
    </div>
  );
}
