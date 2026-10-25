"use client";

import { create } from "zustand";
import type { ActivityEntry, Severity } from "./types";

interface PhoneConnStore {
  ethicsAccepted: boolean;
  acceptEthics: () => void;

  activity: ActivityEntry[];
  logActivity: (section: string, action: string, severity: Severity) => void;
  clearActivity: () => void;
}

function nowStamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export const usePhoneConn = create<PhoneConnStore>((set) => ({
  ethicsAccepted: false,
  acceptEthics: () => set({ ethicsAccepted: true }),

  activity: [],
  logActivity: (section, action, severity) =>
    set((s) => ({
      activity: [
        {
          id:
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : `${Date.now()}-${Math.random()}`,
          time: nowStamp(),
          section,
          action,
          severity,
        },
        ...s.activity,
      ].slice(0, 120),
    })),
  clearActivity: () => set({ activity: [] }),
}));
