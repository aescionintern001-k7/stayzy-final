import React from "react";
import { Footer } from "@/components/common/Footer";
import { FaqAccordion } from "@/components/home/FaqAccordion";

export default function FaqPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <main className="flex-1">
        <FaqAccordion />
      </main>
      <Footer />
    </div>
  );
}
