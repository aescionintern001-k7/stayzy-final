import fs from "fs";
import path from "path";
import { execSync } from "child_process";

async function main() {
  console.log("=== STEP 1: Pre-caching dynamic API data ===");
  let roomsJson = "";
  let contentJson = "";

  try {
    const res = await fetch("http://localhost:3000/api/rooms");
    if (res.ok) {
      roomsJson = await res.text();
      console.log(`Fetched /api/rooms from local server (${roomsJson.length} bytes)`);
    }
  } catch {
    console.log("Dev server not responding, falling back to direct database query");
  }

  if (!roomsJson) {
    try {
      const { prisma } = await import("../src/lib/prisma");
      const roomTypes = await prisma.roomType.findMany({
        include: {
          property: true,
          ratePlans: { where: { isEnabled: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      const enriched = roomTypes.map((rt: { images: any; keyAmenities: any; ratePlans: any[]; }) => ({
        ...rt,
        images: JSON.parse(rt.images || "[]"),
        keyAmenities: JSON.parse(rt.keyAmenities || "[]"),
        currentRatePlan: rt.ratePlans.find((r) => r.durationType === "MONTHLY") || rt.ratePlans[0],
        allRatePlans: rt.ratePlans,
        isAvailable: true,
        availableCount: 3,
      }));
      roomsJson = JSON.stringify({ success: true, rooms: enriched });
      console.log(`Generated rooms JSON from Prisma (${roomTypes.length} room types)`);
    } catch (e: any) {
      console.warn("Could not query room types from DB, using fallback empty array:", e.message);
      roomsJson = JSON.stringify({ success: true, rooms: [] });
    }
  }

  try {
    const { prisma } = await import("../src/lib/prisma");
    const contents = await prisma.siteContent.findMany();
    const map: Record<string, any> = {};
    for (const c of contents) {
      try {
        map[c.key] = JSON.parse(c.value);
      } catch {
        map[c.key] = c.value;
      }
    }
    contentJson = JSON.stringify({ success: true, content: map });
  } catch {
    contentJson = JSON.stringify({ success: true, content: {} });
  }

  const projectDir = process.cwd();
  const apiDir = path.join(projectDir, "src", "app", "api");
  const tempApiDir = path.join(projectDir, "src", "api-backup-temp");
  const nextConfigPath = path.join(projectDir, "next.config.ts");
  const originalNextConfig = fs.readFileSync(nextConfigPath, "utf8");

  try {
    console.log("=== STEP 2: Preparing Next.js static export ===");
    // Temporarily move API routes so static export does not fail
    if (fs.existsSync(apiDir)) {
      if (fs.existsSync(tempApiDir)) {
        fs.rmSync(tempApiDir, { recursive: true, force: true });
      }
      try {
        fs.renameSync(apiDir, tempApiDir);
      } catch (err: any) {
        if (err.code === "EPERM") {
          console.log("File lock detected on Windows, terminating locking process on port 3000...");
          try {
            execSync('powershell.exe -Command "Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"', { stdio: "ignore" });
          } catch {}
          const start = Date.now();
          while (Date.now() - start < 1200) {}
          fs.renameSync(apiDir, tempApiDir);
        } else {
          throw err;
        }
      }
      console.log("Temporarily moved src/app/api -> src/api-backup-temp");
    }

    // Set output: "export" in next.config.ts
    const exportConfig = originalNextConfig.replace(
      /output:\s*["']standalone["']/,
      'output: "export"'
    );
    fs.writeFileSync(nextConfigPath, exportConfig, "utf8");
    console.log("Configured next.config.ts with output: 'export'");

    // Clean .next cache to prevent stale dev validator types
    const dotNextDir = path.join(projectDir, ".next");
    if (fs.existsSync(dotNextDir)) {
      fs.rmSync(dotNextDir, { recursive: true, force: true });
    }

    console.log("=== STEP 3: Running production build (next build) ===");
    execSync("npx next build", { stdio: "inherit", cwd: projectDir });

    console.log("=== STEP 4: Creating static JSON endpoints in out/ ===");
    const outDir = path.join(projectDir, "out");
    const outApiDir = path.join(outDir, "api");
    const outAdminApiDir = path.join(outApiDir, "admin");
    const outBookingsApiDir = path.join(outApiDir, "bookings");
    const outPaymentsApiDir = path.join(outApiDir, "payments");
    const outVisitsApiDir = path.join(outApiDir, "visits");
    const outAuthApiDir = path.join(outApiDir, "auth");
    const outOwnerApiDir = path.join(outApiDir, "owner");

    [outApiDir, outAdminApiDir, outBookingsApiDir, outPaymentsApiDir, outVisitsApiDir, outAuthApiDir, outOwnerApiDir].forEach((dir) => {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });

    // Write out/api/rooms.json and out/api/content.json
    fs.writeFileSync(path.join(outApiDir, "rooms.json"), roomsJson, "utf8");
    fs.writeFileSync(path.join(outApiDir, "content.json"), contentJson, "utf8");

    // Static Admin Data payloads
    const {
      INITIAL_PAYMENTS,
      INITIAL_BOOKINGS,
      INITIAL_SCHEDULES,
      INITIAL_REFUNDS,
      INITIAL_PROPERTIES,
      INITIAL_VISITS,
      INITIAL_TICKETS,
      INITIAL_USERS,
      DEMO_USERS,
    } = await import("../src/lib/mock-data");

    // Pre-cache Users & Owner endpoints
    fs.writeFileSync(
      path.join(outAdminApiDir, "users.json"),
      JSON.stringify({ success: true, users: INITIAL_USERS }),
      "utf8"
    );
    fs.writeFileSync(
      path.join(outOwnerApiDir, "properties.json"),
      JSON.stringify({ success: true, properties: INITIAL_PROPERTIES }),
      "utf8"
    );
    fs.writeFileSync(
      path.join(outOwnerApiDir, "visits.json"),
      JSON.stringify({ success: true, visits: INITIAL_VISITS }),
      "utf8"
    );
    fs.writeFileSync(
      path.join(outOwnerApiDir, "bookings.json"),
      JSON.stringify({ success: true, bookings: INITIAL_BOOKINGS }),
      "utf8"
    );

    const totalCollected = INITIAL_PAYMENTS.reduce((sum: number, p: any) => sum + p.amount, 0);
    const pendingRent = INITIAL_SCHEDULES.reduce((sum: number, s: any) => sum + s.amount, 0);

    const paymentsData = JSON.stringify({
      success: true,
      payments: INITIAL_PAYMENTS,
      schedules: INITIAL_SCHEDULES,
      refunds: INITIAL_REFUNDS,
      totalCollected,
      pendingRent,
    });
    fs.writeFileSync(path.join(outAdminApiDir, "payments.json"), paymentsData, "utf8");

    const bookingsData = JSON.stringify({ success: true, bookings: INITIAL_BOOKINGS });
    fs.writeFileSync(path.join(outAdminApiDir, "bookings.json"), bookingsData, "utf8");
    fs.writeFileSync(path.join(outBookingsApiDir, "my.json"), bookingsData, "utf8");

    const paymentsMyData = JSON.stringify({ success: true, payments: INITIAL_PAYMENTS, schedules: INITIAL_SCHEDULES });
    fs.writeFileSync(path.join(outPaymentsApiDir, "my.json"), paymentsMyData, "utf8");

    const propertiesData = JSON.stringify({ success: true, properties: INITIAL_PROPERTIES });
    fs.writeFileSync(path.join(outAdminApiDir, "properties.json"), propertiesData, "utf8");

    const visitsData = JSON.stringify({ success: true, visits: INITIAL_VISITS });
    fs.writeFileSync(path.join(outAdminApiDir, "visits.json"), visitsData, "utf8");
    fs.writeFileSync(path.join(outVisitsApiDir, "my.json"), visitsData, "utf8");

    const supportData = JSON.stringify({ success: true, tickets: INITIAL_TICKETS });
    fs.writeFileSync(path.join(outAdminApiDir, "support.json"), supportData, "utf8");

    const statsData = JSON.stringify({
      success: true,
      stats: {
        totalRevenue: totalCollected,
        totalBookingsCount: INITIAL_BOOKINGS.length,
        checkedInCount: 1,
        confirmedCount: 1,
        totalUnitsCount: 48,
        activeHoldsCount: 2,
        pendingVisitsCount: INITIAL_VISITS.length,
      },
      recentBookings: INITIAL_BOOKINGS.slice(0, 8),
      recentVisits: INITIAL_VISITS.slice(0, 10),
      properties: INITIAL_PROPERTIES,
    });
    fs.writeFileSync(path.join(outAdminApiDir, "stats.json"), statsData, "utf8");

    const ratesData = JSON.stringify({
      success: true,
      roomTypes: [
        {
          id: "room-deluxe-studio",
          name: "Deluxe Private Studio Suite",
          category: "PRIVATE",
          property: INITIAL_PROPERTIES[0],
          ratePlans: [
            { id: "rp-1", durationType: "HOURLY", price: 180, isEnabled: true, depositAmount: 500 },
            { id: "rp-2", durationType: "DAILY", price: 750, isEnabled: true, depositAmount: 1000 },
            { id: "rp-3", durationType: "WEEKLY", price: 4200, isEnabled: true, depositAmount: 5000 },
            { id: "rp-4", durationType: "MONTHLY", price: 28000, isEnabled: true, depositAmount: 30000 },
            { id: "rp-5", durationType: "YEARLY", price: 320000, isEnabled: true, depositAmount: 35000 },
          ],
        },
      ],
    });
    fs.writeFileSync(path.join(outAdminApiDir, "rates.json"), ratesData, "utf8");

    const customersData = JSON.stringify({
      success: true,
      customers: [
        DEMO_USERS.customer,
        {
          id: "usr-customer-002",
          name: "Priya Patel",
          email: "priya.patel@example.com",
          phone: "+91 98450 67890",
          role: "CUSTOMER",
          activeBookings: 1,
        },
      ],
    });
    fs.writeFileSync(path.join(outAdminApiDir, "customers.json"), customersData, "utf8");

    const authMeData = JSON.stringify({ success: true, user: DEMO_USERS.admin });
    fs.writeFileSync(path.join(outAuthApiDir, "me.json"), authMeData, "utf8");

    console.log("Pre-cached all Admin and User JSON endpoints in out/api/");

    // Ensure static assets exist in out/
    const fallbackSrc = path.join(projectDir, "public", "fallback-room.jpg");
    if (fs.existsSync(fallbackSrc)) {
      fs.copyFileSync(fallbackSrc, path.join(outDir, "fallback-room.jpg"));
    }
    const logoSrc = path.join(projectDir, "public", "stayzy-logo.png");
    if (fs.existsSync(logoSrc)) {
      fs.copyFileSync(logoSrc, path.join(outDir, "stayzy-logo.png"));
    }
    const logoTransSrc = path.join(projectDir, "public", "stayzy-logo-transparent.png");
    if (fs.existsSync(logoTransSrc)) {
      fs.copyFileSync(logoTransSrc, path.join(outDir, "stayzy-logo-transparent.png"));
    }

    // Check index.html exists
    const indexHtmlPath = path.join(outDir, "index.html");
    if (fs.existsSync(indexHtmlPath)) {
      const stat = fs.statSync(indexHtmlPath);
      console.log(`Verified out/index.html generated (${stat.size} bytes)`);
    } else {
      throw new Error("out/index.html was not generated!");
    }

    console.log("=== STEP 5: Updating firebase.json to point to out ===");
    const firebaseJson = {
      hosting: {
        public: "out",
        ignore: ["firebase.json", "**/.*", "**/node_modules/**"],
        cleanUrls: true,
        trailingSlash: false,
        headers: [
          {
            source: "/api/**",
            headers: [
              {
                key: "Content-Type",
                value: "application/json",
              },
              {
                key: "Access-Control-Allow-Origin",
                value: "*",
              },
            ],
          },
        ],
        rewrites: [
          { source: "/api/rooms", destination: "/api/rooms.json" },
          { source: "/api/content", destination: "/api/content.json" },
          { source: "/api/admin/payments", destination: "/api/admin/payments.json" },
          { source: "/api/admin/bookings", destination: "/api/admin/bookings.json" },
          { source: "/api/admin/properties", destination: "/api/admin/properties.json" },
          { source: "/api/admin/visits", destination: "/api/admin/visits.json" },
          { source: "/api/admin/support", destination: "/api/admin/support.json" },
          { source: "/api/admin/stats", destination: "/api/admin/stats.json" },
          { source: "/api/admin/users", destination: "/api/admin/users.json" },
          { source: "/api/owner/properties", destination: "/api/owner/properties.json" },
          { source: "/api/owner/visits", destination: "/api/owner/visits.json" },
          { source: "/api/owner/bookings", destination: "/api/owner/bookings.json" },
          { source: "/api/admin/rates", destination: "/api/admin/rates.json" },
          { source: "/api/admin/customers", destination: "/api/admin/customers.json" },
          { source: "/api/bookings/my", destination: "/api/bookings/my.json" },
          { source: "/api/payments/my", destination: "/api/payments/my.json" },
          { source: "/api/visits/my", destination: "/api/visits/my.json" },
          { source: "/api/auth/me", destination: "/api/auth/me.json" },
          { source: "**", destination: "/index.html" },
        ],
      },
    };
    fs.writeFileSync(
      path.join(projectDir, "firebase.json"),
      JSON.stringify(firebaseJson, null, 2),
      "utf8"
    );

    const rootFirebase = path.join(projectDir, "..", "firebase.json");
    if (fs.existsSync(rootFirebase)) {
      const rootConfig = {
        ...firebaseJson,
        hosting: {
          ...firebaseJson.hosting,
          public: "frontend/out",
        },
      };
      fs.writeFileSync(rootFirebase, JSON.stringify(rootConfig, null, 2), "utf8");
    }
    console.log("Updated firebase.json with clean SPA rewrites");
    console.log("=== STATIC EXPORT BUILD COMPLETED SUCCESSFULLY ===");
  } finally {
    // ALWAYS restore original files
    console.log("=== Restoring source files ===");
    if (fs.existsSync(tempApiDir)) {
      if (fs.existsSync(apiDir)) {
        fs.rmSync(apiDir, { recursive: true, force: true });
      }
      fs.renameSync(tempApiDir, apiDir);
      console.log("Restored src/app/api");
    }
    fs.writeFileSync(nextConfigPath, originalNextConfig, "utf8");
    console.log("Restored next.config.ts");
  }
}

main().catch((err) => {
  console.error("FATAL ERROR in build-export:", err);
  process.exit(1);
});
