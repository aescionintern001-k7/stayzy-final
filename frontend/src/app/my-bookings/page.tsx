import React from "react";
import { Footer } from "@/components/common/Footer";
import { MyBookingsClient } from "./MyBookingsClient";

export default function MyBookingsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <main className="flex-1">
        <MyBookingsClient />
      </main>
      <Footer />
    </div>
  );
}
