"use client";

import React, { useState } from "react";
import { Phone, MessageCircle, X } from "lucide-react";

export function FloatingContactButtons() {
  const [showTooltip, setShowTooltip] = useState(false);

  const whatsappUrl =
    "https://wa.me/918045678900?text=" +
    encodeURIComponent(
      "Hi Stayzy Team! I'm interested in booking a room/bed. Can you help me find availability?"
    );

  return (
    <aside
      aria-label="Quick Connect Support"
      className="fixed bottom-6 right-6 z-40 flex flex-col items-center gap-3"
    >
      {/* Phone Call Floating Button */}
      <a
        href="tel:+918045678900"
        title="Call Stayzy Support: +91 80 4567 8900"
        className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg hover:bg-emerald-700 hover:scale-105 active:scale-95 transition-all duration-200 border border-white/20"
      >
        <Phone className="w-5 h-5 text-white" />
      </a>

      {/* WhatsApp Floating Button with Brand Color #25D366 */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        title="Chat on WhatsApp (+91 80 4567 8900)"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="relative group w-13 h-13 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-xl hover:bg-[#20ba5a] hover:scale-105 active:scale-95 transition-all duration-200 border border-white/30"
      >
        {/* WhatsApp Icon */}
        <svg
          viewBox="0 0 24 24"
          width="28"
          height="28"
          fill="currentColor"
          className="text-white drop-shadow-xs"
        >
          <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.634.075-1.026-.051-.83-.267-1.748-.99-2.529-1.771-.781-.781-1.504-1.699-1.771-2.529-.126-.392-.096-.714-.051-1.026.05-.333.419-1.026.824-1.17.144-.051.297-.021.411.054.126.081.246.222.339.387.234.417.48 1.05.516 1.134.039.09.045.195-.015.3-.06.105-.12.21-.24.33-.12.12-.228.216-.327.318-.108.111-.129.213-.069.345.18.396.642.999 1.251 1.608.609.609 1.212 1.071 1.608 1.251.132.06.234.039.345-.069.102-.099.198-.207.318-.327.12-.12.225-.18.33-.24.105-.06.21-.054.3-.015.084.036.717.282 1.134.516.165.093.306.213.387.339.075.114.105.267.054.411z" />
          <path d="M12 2C6.477 2 2 6.477 2 12c0 1.891.524 3.66 1.436 5.176L2 22l4.981-1.398A9.954 9.954 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.25c-1.635 0-3.15-.49-4.418-1.328l-.316-.21-2.964.832.835-2.894-.216-.328A8.204 8.204 0 0 1 3.75 12c0-4.549 3.701-8.25 8.25-8.25 4.549 0 8.25 3.701 8.25 8.25 0 4.549-3.701 8.25-8.25 8.25z" />
        </svg>

        {/* Pulse ring animation */}
        <span className="absolute -inset-1 rounded-full bg-[#25D366] opacity-30 animate-ping -z-10 pointer-events-none" />

        {/* Desktop Tooltip */}
        {showTooltip && (
          <div className="absolute right-16 top-1/2 -translate-y-1/2 bg-slate-900 text-white text-xs font-semibold px-3 py-1.5 rounded-md shadow-lg whitespace-nowrap border border-white/20 animate-fade-in pointer-events-none">
            Chat on WhatsApp
          </div>
        )}
      </a>
    </aside>
  );
}
