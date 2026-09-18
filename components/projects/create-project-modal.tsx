"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  X, Building2, MapPin, Navigation, Upload, Loader2, Map
} from "lucide-react";
import { toast } from "sonner";

const schema = z.object({
  name: z.string().min(3, "Project name must be at least 3 characters"),
  location: z.string().min(3, "Location is required"),
  description: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  budget: z.number().min(0).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function CreateProjectModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const lat = watch("latitude");
  const lng = watch("longitude");

  const handleGPS = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported on this device");
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setValue("latitude", pos.coords.latitude);
        setValue("longitude", pos.coords.longitude);
        setGpsLoading(false);
        toast.success("Location captured!");
      },
      (err) => {
        toast.error("Could not get location. Please enter manually.");
        setGpsLoading(false);
      },
      { timeout: 10000 }
    );
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== "") {
          formData.append(key, String(value));
        }
      });
      if (imageFile) formData.append("image", imageFile);

      const res = await fetch("/api/projects", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create project");
      }

      reset();
      setImageFile(null);
      setImagePreview("");
      onSuccess();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.95 }}
          className="relative bg-card rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto scrollbar-thin"
        >
          {/* Header */}
          <div className="sticky top-0 bg-card/95 backdrop-blur-sm px-6 pt-6 pb-4 border-b border-border flex items-center justify-between z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-brand rounded-xl flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-display font-bold">New Project</h2>
                <p className="text-xs text-muted-foreground">Add a construction site</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-muted rounded-xl transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
            {/* Project Image */}
            <div>
              <label className="text-sm font-medium mb-2 block">Project Image</label>
              <div
                onClick={() => fileRef.current?.click()}
                className={`relative h-32 rounded-xl border-2 border-dashed ${imagePreview ? "border-primary" : "border-border"} flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors overflow-hidden`}
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-muted-foreground mb-1" />
                    <p className="text-xs text-muted-foreground">Click to upload project photo</p>
                  </>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
            </div>

            {/* Project Name */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Project Name *</label>
              <input
                {...register("name")}
                placeholder="e.g., Nakawa Residential Complex"
                className="input-styled"
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>

            {/* Location */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Location *</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  {...register("location")}
                  placeholder="e.g., Nakawa, Kampala"
                  className="input-styled pl-10"
                />
              </div>
              {errors.location && <p className="text-red-500 text-xs mt-1">{errors.location.message}</p>}
            </div>

            {/* GPS Coordinates */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">GPS Coordinates</label>
              <div className="flex gap-2">
                <input
                  {...register("latitude", { valueAsNumber: true })}
                  placeholder="Latitude"
                  type="number"
                  step="any"
                  className="input-styled flex-1"
                />
                <input
                  {...register("longitude", { valueAsNumber: true })}
                  placeholder="Longitude"
                  type="number"
                  step="any"
                  className="input-styled flex-1"
                />
                <button
                  type="button"
                  onClick={handleGPS}
                  disabled={gpsLoading}
                  className="px-3 py-2.5 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-colors flex-shrink-0"
                  title="Get my location"
                >
                  {gpsLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Navigation className="w-4 h-4" />
                  )}
                </button>
              </div>
              {lat && lng && (
                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                  <Map className="w-3 h-3" /> Location set: {lat.toFixed(6)}, {lng.toFixed(6)}
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Description</label>
              <textarea
                {...register("description")}
                placeholder="Brief description of the project..."
                rows={3}
                className="input-styled resize-none"
              />
            </div>

            {/* Budget */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Budget (UGX)</label>
              <input
                {...register("budget", { valueAsNumber: true })}
                type="number"
                placeholder="e.g., 50000000"
                className="input-styled"
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Start Date</label>
                <input {...register("startDate")} type="date" className="input-styled" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">End Date</label>
                <input {...register("endDate")} type="date" className="input-styled" />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1 btn-brand py-3 text-sm flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Building2 className="w-4 h-4" />}
                {loading ? "Creating..." : "Create Project"}
              </motion.button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
