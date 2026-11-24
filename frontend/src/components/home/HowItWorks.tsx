import React from "react";
import { Compass, CalendarCheck, CheckCircle2, ShieldCheck } from "lucide-react";

const STEPS = [
  {
    step: "01",
    title: "Choose your stay",
    desc: "Browse curated private suites or shared PG beds with genuine photographs, amenities, and room configurations.",
    icon: Compass,
  },
  {
    step: "02",
    title: "Select your dates",
    desc: "Pick hourly, daily, weekly, monthly, or yearly schedules with transparent rates and live bed-level availability.",
    icon: CalendarCheck,
  },
  {
    step: "03",
    title: "Review and book",
    desc: "Lock your space with an instant 15-minute hold, zero brokerage, and receive your digital keyless access instructions.",
    icon: CheckCircle2,
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 bg-white border-y border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-block px-3.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold uppercase tracking-wider border border-emerald-200/80 shadow-2xs">
            Straightforward Process
          </div>
          <h2 className="text-4xl sm:text-5xl font-black text-[#0F172A] tracking-tight mt-3">
            How booking works
          </h2>
          <p className="text-base text-gray-600 font-medium mt-2">
            No broker negotiations, no confusing hidden charges, and no rigid traditional lease agreements.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={idx}
                className="bg-white p-8 rounded-xl border border-gray-200 relative overflow-hidden group hover:border-emerald-400 hover:shadow-md transition-all duration-300"
              >
                <div className="text-4xl font-black text-gray-200 mb-4 group-hover:text-emerald-200 transition-colors">
                  {step.step}
                </div>
                <div className="w-12 h-12 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mb-5 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-[#0F172A] mb-2">{step.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{step.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
