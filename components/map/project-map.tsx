"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { cn, formatCurrency } from "@/lib/utils";
import Link from "next/link";

// Fix Leaflet default icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const activeIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const selectedIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [30, 49], iconAnchor: [15, 49], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const managerIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

function MapController({ projects, selectedId }: { projects: any[]; selectedId: string }) {
  const map = useMap();
  useEffect(() => {
    if (selectedId) {
      const p = projects.find(p => p.id === selectedId);
      if (p?.latitude && p?.longitude) {
        map.flyTo([p.latitude, p.longitude], 16, { duration: 1.2 });
      }
    } else if (projects.length > 0) {
      const bounds = L.latLngBounds(projects.map(p => [p.latitude, p.longitude]));
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [selectedId, projects, map]);
  return null;
}

interface ProjectMapProps {
  projects: any[];
  selectedId: string;
  onSelect: (id: string) => void;
  managers?: any[];
}

export default function ProjectMap({ projects, selectedId, onSelect, managers = [] }: ProjectMapProps) {
  const center: [number, number] = projects.length > 0
    ? [projects[0].latitude, projects[0].longitude]
    : managers[0]?.lastLatitude
      ? [managers[0].lastLatitude, managers[0].lastLongitude]
      : [0.3476, 32.5825]; // Kampala, Uganda

  return (
    <MapContainer center={center} zoom={projects.length === 1 ? 14 : 10} style={{ height: "500px", width: "100%" }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapController projects={projects} selectedId={selectedId} />
      {projects.map((project) => (
        <Marker
          key={project.id}
          position={[project.latitude, project.longitude]}
          icon={project.id === selectedId ? selectedIcon : activeIcon}
          eventHandlers={{ click: () => onSelect(project.id) }}
        >
          <Popup>
            <div className="min-w-[180px]">
              <p className="font-bold text-sm">{project.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">{project.location}</p>
              <span className={cn("text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full inline-block mt-1",
                project.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700")}>
                {project.status}
              </span>
              <div className="mt-2">
                <a href={`/dashboard/projects/${project.id}`}
                  className="text-xs text-orange-600 hover:underline font-medium">
                  View Project →
                </a>
              </div>
              <div className="mt-1">
                <a href={`https://www.openstreetmap.org/directions?to=${project.latitude}%2C${project.longitude}`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline">
                  Get Directions
                </a>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
      {managers.map((manager: any) => (
        manager.lastLatitude && manager.lastLongitude ? (
          <Marker
            key={manager.id}
            position={[manager.lastLatitude, manager.lastLongitude]}
            icon={managerIcon}
          >
            <Popup>
              <div className="min-w-[180px]">
                <p className="font-bold text-sm">{manager.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">Site manager location</p>
                {manager.lastLocationAt && (
                  <p className="text-[10px] text-gray-400 mt-1">Updated {new Date(manager.lastLocationAt).toLocaleString()}</p>
                )}
                {(manager.managedProjects || []).map((a: any) => (
                  <p key={a.id} className="text-xs mt-1">Assigned: {a.project?.name}</p>
                ))}
              </div>
            </Popup>
          </Marker>
        ) : null
      ))}
      {managers.flatMap((manager: any) =>
        (manager.managedProjects || [])
          .filter((a: any) => manager.lastLatitude && a.project?.latitude && a.project?.longitude)
          .map((a: any) => (
            <Polyline
              key={`${manager.id}-${a.project.id}`}
              positions={[
                [manager.lastLatitude, manager.lastLongitude],
                [a.project.latitude, a.project.longitude],
              ]}
              pathOptions={{ color: "#2563eb", weight: 2, dashArray: "6 6" }}
            />
          ))
      )}
    </MapContainer>
  );
}
