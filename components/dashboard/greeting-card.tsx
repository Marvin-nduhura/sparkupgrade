"use client";

import { motion } from "framer-motion";
import { HardHat, Sun, Sunset, Moon } from "lucide-react";
import type { Session } from "next-auth";
import { getRoleLabel } from "@/lib/utils";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return { text: "Good Morning", icon: Sun };
  if (hour < 17) return { text: "Good Afternoon", icon: Sun };
  if (hour < 20) return { text: "Good Evening", icon: Sunset };
  return { text: "Good Night", icon: Moon };
}

export function GreetingCard({ session }: { session: Session }) {
  const { text, icon: Icon } = getGreeting();
  const firstName = session.user.name.split(" ")[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative overflow-hidden bg-gradient-brand rounded-2xl p-5 sm:p-6 shadow-brand"
    >
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-12 translate-x-12" />
      <div className="absolute bottom-0 right-16 w-24 h-24 bg-white/5 rounded-full translate-y-8" />

      <div className="relative flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Icon className="w-4 h-4 text-white/70" />
            <span className="text-white/70 text-sm">{text}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-white">
            {firstName}! 👋
          </h1>
          <p className="text-white/80 text-sm mt-1">
            {getRoleLabel(session.user.role)} — BuildSpark
          </p>
        </div>
        <motion.div
          animate={{ rotate: [0, -5, 5, 0] }}
          transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
          className="w-14 h-14 sm:w-16 sm:h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center"
        >
          <HardHat className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
        </motion.div>
      </div>

      {/* Quick tip */}
      <div className="mt-4 bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2">
        <p className="text-white/90 text-xs">
          💡 <span className="font-medium">Tip:</span>{" "}
          {session.user.role === "SITE_MANAGER"
            ? "Remember to upload receipts within 24 hours of purchases."
            : session.user.role === "ACCOUNTANT"
            ? "Review pending payment requests and verify site expenditures."
            : "Check audit logs regularly and review pending requests from site managers."}
        </p>
      </div>
    </motion.div>
  );
}
