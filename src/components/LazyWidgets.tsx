"use client";

import dynamic from "next/dynamic";

const AdminShortcut = dynamic(() => import("@/components/AdminShortcut"), { ssr: false });
const PomodoroTimer = dynamic(() => import("@/components/PomodoroTimer"), { ssr: false });
const BinauralPlayer = dynamic(() => import("@/components/BinauralPlayer"), { ssr: false });

export default function LazyWidgets() {
  return (
    <>
      <AdminShortcut />
      <PomodoroTimer />
      <BinauralPlayer />
    </>
  );
}
