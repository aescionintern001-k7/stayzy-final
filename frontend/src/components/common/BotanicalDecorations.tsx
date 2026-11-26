import React from "react";

/**
 * Subtle translucent botanical leaf illustrations positioned around page edges.
 * Always pointer-events-none and behind main content (z-0).
 */
export function BotanicalDecorations({
  variant = "details",
}: {
  variant?: "details" | "checkout";
}) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none"
    >
      {/* Top-Left Soft Ambient Wash & Leaf Cluster */}
      <svg
        viewBox="0 0 260 260"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="hidden lg:block absolute -top-6 -left-8 w-52 h-52 opacity-40"
      >
        <path
          d="M15 20C55 45 95 95 125 160"
          stroke="#79A86A"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M42 42C82 32 115 50 120 84C82 90 50 72 42 42Z"
          fill="#CFE4C2"
          fillOpacity="0.65"
        />
        <path
          d="M72 86C112 72 148 92 152 128C112 134 80 116 72 86Z"
          fill="#B7D7A8"
          fillOpacity="0.55"
        />
        <path
          d="M28 84C22 124 44 156 80 162C84 122 62 90 28 84Z"
          fill="#DCEBD1"
          fillOpacity="0.7"
        />
      </svg>

      {/* Top-Right Botanical Branch */}
      <svg
        viewBox="0 0 280 280"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="hidden md:block absolute -top-4 -right-6 w-56 h-56 opacity-60"
      >
        <path
          d="M270 15C215 40 165 82 128 140"
          stroke="#4F8A5B"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path
          d="M232 32C195 14 158 26 146 62C186 72 220 60 232 32Z"
          fill="#8BB87E"
          fillOpacity="0.75"
        />
        <path
          d="M192 68C152 52 116 68 106 104C146 112 180 96 192 68Z"
          fill="#6FA366"
          fillOpacity="0.65"
        />
        <path
          d="M242 66C248 106 226 142 190 152C182 114 204 78 242 66Z"
          fill="#A9CEA0"
          fillOpacity="0.7"
        />
        <path
          d="M202 106C204 142 182 172 148 178C144 144 166 114 202 106Z"
          fill="#CBE2C3"
          fillOpacity="0.65"
        />
      </svg>

      {/* Left-Middle Subtle Leaf */}
      <svg
        viewBox="0 0 180 240"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="hidden xl:block absolute top-[38%] -left-10 w-36 h-48 opacity-45"
      >
        <path
          d="M12 195C34 135 66 86 112 44"
          stroke="#6A9F64"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <path
          d="M44 132C18 112 16 78 40 58C64 76 66 110 44 132Z"
          fill="#BBD9AE"
          fillOpacity="0.65"
        />
        <path
          d="M62 108C96 96 122 112 126 144C92 150 68 134 62 108Z"
          fill="#CFE4C4"
          fillOpacity="0.65"
        />
      </svg>

      {/* Bottom-Left Leaf */}
      <svg
        viewBox="0 0 240 220"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="hidden md:block absolute -bottom-6 -left-6 w-48 h-44 opacity-50"
      >
        <path
          d="M14 204C58 158 104 128 164 108"
          stroke="#59915C"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <path
          d="M48 168C32 130 50 96 86 88C98 124 80 158 48 168Z"
          fill="#9EC593"
          fillOpacity="0.6"
        />
        <path
          d="M84 150C114 126 152 132 170 162C138 184 102 178 84 150Z"
          fill="#C7E0BC"
          fillOpacity="0.65"
        />
      </svg>

      {/* Bottom-Right Botanical Accent */}
      <svg
        viewBox="0 0 260 260"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="hidden md:block absolute -bottom-6 -right-6 w-52 h-52 opacity-60"
      >
        <path
          d="M248 242C202 184 168 124 148 56"
          stroke="#4F8A5B"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path
          d="M214 190C172 194 140 168 136 132C176 128 208 154 214 190Z"
          fill="#85B579"
          fillOpacity="0.7"
        />
        <path
          d="M188 136C148 134 120 106 120 70C158 72 186 100 188 136Z"
          fill="#A7CE9D"
          fillOpacity="0.65"
        />
        <path
          d="M222 152C242 122 238 82 212 62C190 92 194 132 222 152Z"
          fill="#6FA366"
          fillOpacity="0.6"
        />
      </svg>

      {/* Subtle Soft Radial Botanical Glow Behind Checkout Summary */}
      {variant === "checkout" && (
        <div className="hidden lg:block absolute right-[6%] bottom-[8%] w-80 h-80 rounded-full bg-[#EAF5E4]/65 blur-2xl" />
      )}
    </div>
  );
}
