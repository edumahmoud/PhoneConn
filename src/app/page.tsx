"use client";

import { useState } from "react";
import { TopBar, Sidebar, Footer, EthicsGate } from "@/components/phoneconn/chrome";
import { Dashboard } from "@/components/phoneconn/dashboard";
import { WifiLab } from "@/components/phoneconn/wifi-lab";
import { DeviceLab } from "@/components/phoneconn/device-lab";
import { SelfAudit } from "@/components/phoneconn/self-audit";
import { Academy } from "@/components/phoneconn/academy";
import { Reports } from "@/components/phoneconn/reports";
import type { SectionId } from "@/components/phoneconn/section-types";

export default function Home() {
  const [section, setSection] = useState<SectionId>("dashboard");

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <EthicsGate />
      <TopBar current={section} />
      <div className="flex flex-1 flex-col lg:flex-row">
        <Sidebar current={section} onNavigate={setSection} />
        <main className="flex-1 min-w-0 p-4 md:p-6 max-w-[1500px] mx-auto w-full">
          <div className={section === "dashboard" ? "" : "fadeup"}>
            {section === "dashboard" && <Dashboard onNavigate={setSection} />}
            {section === "wifi" && <WifiLab />}
            {section === "devices" && <DeviceLab />}
            {section === "audit" && <SelfAudit />}
            {section === "academy" && <Academy />}
            {section === "reports" && <Reports />}
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
}
