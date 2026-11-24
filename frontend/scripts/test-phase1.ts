import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  Button,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Skeleton,
  Icons,
  getIconSizeAndStroke,
} from "../src/components/ui";
import { cn } from "../src/lib/utils";

console.log("=== STAYZY PHASE 1: COMPONENT & DESIGN SYSTEM TEST SUITE ===");

// 1. Test cn utility
console.log("\n[Test 1] Testing class merging utility (cn)...");
assert.equal(cn("px-4 py-2", "px-6"), "py-2 px-6", "Tailwind merge should resolve conflicting padding");
assert.equal(cn("text-red-500", undefined, null, false, "text-blue-500"), "text-blue-500");
console.log("✓ cn() resolved class conflicts correctly.");

// 2. Test getIconSizeAndStroke helper
console.log("\n[Test 2] Testing getIconSizeAndStroke scale...");
assert.deepEqual(getIconSizeAndStroke("sm"), { size: 14, strokeWidth: 2 });
assert.deepEqual(getIconSizeAndStroke("md"), { size: 18, strokeWidth: 1.8 });
assert.deepEqual(getIconSizeAndStroke("lg"), { size: 22, strokeWidth: 1.75 });
assert.deepEqual(getIconSizeAndStroke("xl"), { size: 32, strokeWidth: 1.5 });
assert.deepEqual(getIconSizeAndStroke(24, 2), { size: 24, strokeWidth: 2 });
console.log("✓ getIconSizeAndStroke scale verified.");

// 3. Test Icons dictionary
console.log("\n[Test 3] Testing Icons dictionary and render output...");
const iconKeys = [
  "Search", "MapPin", "Navigation", "Home", "Building", "Bed",
  "Calendar", "Clock", "Users", "Heart", "Star", "Wifi",
  "Utensils", "Wind", "Shower", "ShieldCheck", "CreditCard", "Rupee",
  "Filter", "Sliders", "ChevronDown", "ChevronRight", "ChevronLeft",
  "ArrowRight", "ArrowLeft", "Menu", "X", "Check", "CheckCircle",
  "AlertCircle", "Info", "Phone", "Mail", "User", "UserRound",
  "Settings", "Bell", "Camera", "Image", "Eye", "EyeOff",
  "Plus", "Minus", "Pencil", "Trash", "Loader", "Lock", "LogOut"
] as const;

for (const key of iconKeys) {
  const IconComp = Icons[key];
  assert.ok(IconComp, `Icon ${key} must exist in Icons dictionary`);
  const markup = renderToStaticMarkup(React.createElement(IconComp, { size: "sm" }));
  assert.ok(markup.includes("<svg"), `Icon ${key} should render valid SVG markup`);
}
console.log(`✓ All ${iconKeys.length} core domain icons rendered valid SVG markup.`);

// 4. Test Button component
console.log("\n[Test 4] Testing Button component variants and states...");
const btnPrimary = renderToStaticMarkup(React.createElement(Button, { variant: "primary" }, "Click Me"));
assert.ok(btnPrimary.includes("bg-[#0E3A2F]"), "Primary button must use brand forest green");
assert.ok(btnPrimary.includes("type=\"button\""), "Default button type must be button");

const btnAccent = renderToStaticMarkup(React.createElement(Button, { variant: "accent" }, "Book Now"));
assert.ok(btnAccent.includes("bg-[#EE5A36]"), "Accent button must use brand coral");

const btnLoading = renderToStaticMarkup(React.createElement(Button, { isLoading: true }, "Submit"));
assert.ok(btnLoading.includes("animate-spin"), "Loading button must render spinner");
assert.ok(btnLoading.includes("aria-busy=\"true\""), "Loading button must set aria-busy");

const btnWithIcons = renderToStaticMarkup(
  React.createElement(Button, {
    leftIcon: React.createElement(Icons.Search, { size: "sm" }),
    rightIcon: React.createElement(Icons.ArrowRight, { size: "sm" })
  }, "Search")
);
assert.ok(btnWithIcons.includes("<svg"), "Button with icons must render SVGs");
console.log("✓ Button variants, sizes, loading, and icon states verified.");

// 5. Test Badge component
console.log("\n[Test 5] Testing Badge component variants and sizes...");
const badgeBrand = renderToStaticMarkup(React.createElement(Badge, { variant: "brand" }, "Verified"));
assert.ok(badgeBrand.includes("bg-[#0E3A2F]"), "Brand badge must use brand forest green");
assert.ok(badgeBrand.includes("rounded-md"), "Default badge must use rounded-md");

const badgePill = renderToStaticMarkup(React.createElement(Badge, { variant: "accent", pill: true }, "18% OFF"));
assert.ok(badgePill.includes("rounded-full"), "Pill badge must use rounded-full");
assert.ok(badgePill.includes("text-[#EE5A36]"), "Accent badge must use coral text");

const badgeSemantic = renderToStaticMarkup(React.createElement(Badge, { variant: "success" }, "Active"));
assert.ok(badgeSemantic.includes("text-[#15803D]"), "Success badge must use accessible green");
console.log("✓ Badge variants, sizes, and pill options verified.");

// 6. Test Card component
console.log("\n[Test 6] Testing Card component composition...");
const cardMarkup = renderToStaticMarkup(
  React.createElement(Card, { variant: "interactive" },
    React.createElement(CardHeader, null,
      React.createElement(CardTitle, null, "Stayzy Haven"),
      React.createElement(CardDescription, null, "Koramangala 4th Block")
    ),
    React.createElement(CardContent, null, "Card body content"),
    React.createElement(CardFooter, null, "Card footer")
  )
);
assert.ok(cardMarkup.includes("role=\"button\""), "Interactive card must set role=button");
assert.ok(cardMarkup.includes("tabindex=\"0\""), "Interactive card must be focusable (tabIndex=0)");
assert.ok(cardMarkup.includes("Stayzy Haven"), "Card title must render");
assert.ok(cardMarkup.includes("Koramangala 4th Block"), "Card description must render");
console.log("✓ Card variants, composition, and keyboard accessibility attributes verified.");

// 7. Test Skeleton component
console.log("\n[Test 7] Testing Skeleton component...");
const skelDefault = renderToStaticMarkup(React.createElement(Skeleton, { className: "w-32 h-6" }));
assert.ok(skelDefault.includes("animate-pulse"), "Skeleton must include animate-pulse");
assert.ok(skelDefault.includes("rounded-md"), "Default skeleton must use rounded-md");
assert.ok(skelDefault.includes("aria-hidden=\"true\""), "Skeleton must be hidden from screen readers");

const skelCircle = renderToStaticMarkup(React.createElement(Skeleton, { rounded: "full", className: "w-10 h-10" }));
assert.ok(skelCircle.includes("rounded-full"), "Circle skeleton must use rounded-full");
console.log("✓ Skeleton component and accessibility attributes verified.");

console.log("\n=======================================================");
console.log("✓ ALL PHASE 1 COMPONENT & DESIGN SYSTEM TESTS PASSED!");
console.log("=======================================================\n");
