import React, { Suspense } from "react";
import { DemoBanner } from "@/components/common/DemoBanner";
import { Navbar } from "@/components/common/Navbar";
import { Footer } from "@/components/common/Footer";
import { RoomCatalog } from "@/components/rooms/RoomCatalog";
import { RoomCardSkeleton } from "@/components/ui/Skeleton";

export default function ExplorePage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <DemoBanner />
      <Navbar />
      <main className="flex-1">
        <Suspense
          fallback={
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <RoomCardSkeleton key={n} />
                ))}
              </div>
            </div>
          }
        >
          <RoomCatalog />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
