"use client";

import { Typewriter } from "@/components/ui/typewriter-text";

const DemoVariant1 = () => {
  return (
    <Typewriter
      text={[
        "Clean, fully-furnished PG rooms with high-speed Wi-Fi, home-cooked food, and daily housekeeping.",
        "Private suites, twin sharing, and triple sharing spaces built for comfort.",
        "Zero brokerage & verified residences across top Indian tech hubs.",
      ]}
      speed={40}
      deleteSpeed={22}
      delay={2200}
      loop={true}
      className="text-lg sm:text-xl font-medium text-[#475569]"
      cursorClassName="text-[#009B62]"
    />
  );
};

export { DemoVariant1 };

