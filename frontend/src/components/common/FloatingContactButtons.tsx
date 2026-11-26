"use client";

import React, { useState } from "react";
import { Phone, MessageCircle } from "lucide-react";

/**
 * Fixed bottom-right emerald contact actions wired to Stayzy's support hotline
 * and WhatsApp concierge chat.
 */
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
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 flex flex-col items-center gap-3"
    >
      {/* Phone Call Floating Button */}
      <a
        href="tel:+918045678900"
        title="Call Stayzy Support: +91 80 4567 8900"
        aria-label="Call Stayzy Support"
        className="w-11 h-11 sm:w-12 sm:h-12 rounded-[9999px] bg-[#009B70] hover:bg-[#00825D] text-white flex items-center justify-center shadow-[0_8px_22px_rgba(0,61,43,0.34)] hover:-translate-y-0.5 active:scale-95 transition-all duration-200 border border-white/25 motion-reduce:transform-none"
      >
        <Phone className="w-5 h-5 text-white" strokeWidth={2.1} />
      </a>

      {/* WhatsApp / Live Chat Floating Button */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        title="Chat on WhatsApp (+91 80 4567 8900)"
        aria-label="Chat with Stayzy on WhatsApp"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
        className="relative w-12 h-12 sm:w-[52px] sm:h-[52px] rounded-[9999px] bg-[#00A876] hover:bg-[#008F63] text-white flex items-center justify-center shadow-[0_10px_26px_rgba(0,61,43,0.38)] hover:-translate-y-0.5 active:scale-95 transition-all duration-200 border border-white/30 motion-reduce:transform-none"
      >
        <MessageCircle className="w-[22px] h-[22px] text-white" strokeWidth={2.1} />

        {showTooltip && (
          <div className="hidden sm:block absolute right-16 top-1/2 -translate-y-1/2 bg-[#003D2B] text-white text-xs font-semibold px-3 py-1.5 rounded-[8px] shadow-lg whitespace-nowrap border border-[#00D6A0]/35 pointer-events-none">
            Chat on WhatsApp
          </div>
        )}
      </a>
    </aside>
  );
}
