"use client";

import ArrowFillButton from "@/components/ui/arrow-fill-button";

export default function ArrowFillButtonDemo() {
  return (
    <div className="flex flex-col gap-6 min-h-64 w-full items-center justify-center p-12 bg-gray-50 rounded-2xl">
      <h3 className="text-lg font-bold text-gray-800">Stayzy ArrowFillButton Component</h3>
      
      {/* Primary Brand Green Button */}
      <ArrowFillButton
        btnText="List Your Property"
        href="/owner/properties/new"
        variant="primary"
        size="md"
      />

      {/* Emerald Variant for Search CTA */}
      <ArrowFillButton
        btnText="Search Stays"
        href="/rooms"
        variant="emerald"
        size="lg"
      />

      {/* Outline Variant for Explore all cities */}
      <ArrowFillButton
        btnText="Explore all cities"
        href="/cities"
        variant="outline"
        size="md"
      />
    </div>
  );
}
