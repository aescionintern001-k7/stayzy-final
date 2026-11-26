"use client";

import React from "react";
import {
  CalendarCheck,
  Utensils,
  Wifi,
  House,
  BedDouble,
  Zap,
  CreditCard,
  Headset,
} from "lucide-react";
import { FaqSection, type FaqSectionData } from "@/components/ui/habit-faq-scroller";

/**
 * Editable Stayzy Frequently Asked Questions dataset arranged across three
 * alternating horizontal scroller rows. Update questions, answers, icons,
 * or scroll durations directly here.
 */
export const STAYZY_FAQ_DATA: FaqSectionData = {
  badge: "STAYZY SUPPORT",
  mainTitle: "Frequently Asked Questions",
  highlightedWord: "Questions",
  mainSubtitle:
    "Everything you need to know about finding your perfect Stayzy home. We're here to make your stay simple, comfortable, and stress-free.",
  rows: [
    {
      id: "row-1",
      speed: "50s",
      direction: "left",
      repeatSets: 1,
      faqItems: [
        {
          id: "faq-booking",
          question: "How do I book a room at Stayzy?",
          answer:
            "Browse available properties, select your preferred room or bed, choose your stay dates, and complete the booking process through our website.",
          icon: CalendarCheck,
        },
        {
          id: "faq-meals",
          question: "Are meals included in the accommodation?",
          answer:
            "Yes. Stayzy provides nutritious daily meals, including breakfast, lunch, and dinner, according to the selected accommodation package.",
          icon: Utensils,
        },
        {
          id: "faq-wifi",
          question: "Is high-speed Wi-Fi available?",
          answer:
            "Yes. Stayzy provides high-speed 300 Mbps Wi-Fi to support working, studying, streaming, and everyday online activities.",
          icon: Wifi,
        },
      ],
    },
    {
      id: "row-2",
      speed: "56s",
      direction: "right",
      repeatSets: 1,
      faqItems: [
        {
          id: "faq-visit",
          question: "Can I visit the property before booking?",
          answer:
            "Absolutely! You can schedule a complimentary property walkthrough to explore the rooms, facilities, and shared spaces before making your decision.",
          icon: House,
        },
        {
          id: "faq-furnished",
          question: "Are the rooms fully furnished?",
          answer:
            "Yes. Our rooms are thoughtfully furnished with comfortable beds, storage, essential furniture, and other amenities for convenient everyday living.",
          icon: BedDouble,
        },
        {
          id: "faq-power-backup",
          question: "Is electricity backup available?",
          answer:
            "Yes. Stayzy provides power backup to help residents enjoy uninterrupted daily living.",
          icon: Zap,
        },
      ],
    },
    {
      id: "row-3",
      speed: "60s",
      direction: "left",
      repeatSets: 2,
      faqItems: [
        {
          id: "faq-payments",
          question: "What payment and rental options are available?",
          answer:
            "Stayzy offers flexible stay durations and transparent pricing. Available payment and rental options depend on the selected property.",
          icon: CreditCard,
        },
        {
          id: "faq-cancellation",
          question: "How can I cancel or modify my booking?",
          answer:
            "Please contact the Stayzy support team to discuss available cancellation or modification options based on your booking terms.",
          icon: Headset,
        },
      ],
    },
  ],
};

/**
 * Homepage & `/faq` route FAQ section wrapper rendering Stayzy's
 * luxury three-row horizontal FAQ scroller.
 */
export function FaqAccordion() {
  return <FaqSection data={STAYZY_FAQ_DATA} sectionId="faq" />;
}
