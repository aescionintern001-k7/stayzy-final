import React from "react";
import { Navbar } from "@/components/common/Navbar";
import { Hero } from "@/components/home/Hero";
import { HotelServices } from "@/components/home/HotelServices";
import { CitySelectorStrip } from "@/components/home/CitySelectorStrip";
import { ColivingCategoriesSection } from "@/components/home/ColivingCategoriesSection";
import { FeaturedRooms } from "@/components/home/FeaturedRooms";
import { AmenitiesStrip } from "@/components/home/AmenitiesStrip";
import { HowItWorks } from "@/components/home/HowItWorks";
import { ScheduleVisitSection } from "@/components/home/ScheduleVisitSection";
import { FaqAccordion } from "@/components/home/FaqAccordion";
import { Footer } from "@/components/common/Footer";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-white text-[#111827]">
      {/* 1. Clean Navigation Bar (Zolo Screenshots 2 & 5 style) */}
      <Navbar />

      <main className="flex-1">
        {/* 2. Bright Hero Section (Zolo Screenshot 5 style) */}
        <Hero />

        {/* 3. Premium Hotel Services Section (Matching Reference Exactly) */}
        <HotelServices />

        {/* 4. Popular Destination Cities with Hover-only Accent (Zolo Screenshot 5) */}
        <CitySelectorStrip />

        {/* 4. Choose Your Room Type (Private, 2 Sharing, 3 Sharing - No generic buzzwords) */}
        <ColivingCategoriesSection />

        {/* 5. Featured PG Accommodations with Multi-Image Cards (Zolo Screenshots 3 & 4) */}
        <FeaturedRooms />

        {/* 6. Essential Living Amenities */}
        <AmenitiesStrip />

        {/* 7. Easy 3-Step Move In */}
        <HowItWorks />

        {/* 8. Schedule Free Property Visit */}
        <ScheduleVisitSection />

        {/* 9. Frequently Asked Questions */}
        <FaqAccordion />
      </main>

      {/* 10. Clean Footer */}
      <Footer />
    </div>
  );
}
