"use client";

import { create } from "zustand";
import type { ActivityEntry, Severity } from "./types";

interface PhoneConnStore {
  ethicsAccepted: boolean;
  acceptEthics: () => void;

  activity: ActivityEntry[];
  logActivity: (section: string, action: string, severity: Severity) => void;
  clearActivity: () => void;

  quizScore: number | null;
  quizTotal: number;
  setQuizScore: (score: number, total: number) => void;

  auditCompleted: boolean;
  auditExposedCount: number;
  setAuditResult: (exposedCount: number) => void;

  networksScanned: number;
  setNetworksScanned: (n: number) => void;
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
      ].slice(0, 200),
    })),
  clearActivity: () => set({ activity: [] }),

  quizScore: null,
  quizTotal: 0,
  setQuizScore: (score, total) => set({ quizScore: score, quizTotal: total }),

  auditCompleted: false,
  auditExposedCount: 0,
  setAuditResult: (exposedCount) =>
    set({ auditCompleted: true, auditExposedCount: exposedCount }),

  networksScanned: 0,
  setNetworksScanned: (n) => set({ networksScanned: n }),
}));
