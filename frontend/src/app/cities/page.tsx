import React, { Suspense } from "react";
import { Footer } from "@/components/common/Footer";
import { CitiesDirectory } from "@/components/cities/CitiesDirectory";

export const metadata = {
  title: "All Cities Directory — Worldwide Co-Living & PGs | Stayzy",
  description:
    "Explore 300+ worldwide cities and tech corridors for verified PG rooms, student hostels, and flexible co-living apartments with zero brokerage.",
};

export default function CitiesPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <main className="flex-1">
        <Suspense
          fallback={
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-500 border-t-transparent" />
              <p className="mt-4 text-sm text-gray-500 font-semibold">Loading Worldwide City Directory...</p>
            </div>
          }
        >
          <CitiesDirectory />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}

