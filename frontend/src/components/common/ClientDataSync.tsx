"use client";

import { useEffect } from "react";
import {
  INITIAL_BOOKINGS,
  INITIAL_PAYMENTS,
  INITIAL_SCHEDULES,
  INITIAL_REFUNDS,
  INITIAL_VISITS,
  INITIAL_TICKETS,
  INITIAL_PROPERTIES,
  INITIAL_USERS,
  DEMO_USERS,
} from "@/lib/mock-data";

export function ClientDataSync() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Initialize LocalStorage if not already set
    if (!localStorage.getItem("stayzy_initialized")) {
      localStorage.setItem("stayzy_payments", JSON.stringify(INITIAL_PAYMENTS));
      localStorage.setItem("stayzy_bookings", JSON.stringify(INITIAL_BOOKINGS));
      localStorage.setItem("stayzy_schedules", JSON.stringify(INITIAL_SCHEDULES));
      localStorage.setItem("stayzy_refunds", JSON.stringify(INITIAL_REFUNDS));
      localStorage.setItem("stayzy_visits", JSON.stringify(INITIAL_VISITS));
      localStorage.setItem("stayzy_tickets", JSON.stringify(INITIAL_TICKETS));
      localStorage.setItem("stayzy_properties", JSON.stringify(INITIAL_PROPERTIES));
      localStorage.setItem("stayzy_users", JSON.stringify(INITIAL_USERS));
      localStorage.setItem("stayzy_initialized", "true");
    }

    if (!localStorage.getItem("stayzy_users")) {
      localStorage.setItem("stayzy_users", JSON.stringify(INITIAL_USERS));
    }
    if (!localStorage.getItem("stayzy_properties")) {
      localStorage.setItem("stayzy_properties", JSON.stringify(INITIAL_PROPERTIES));
    }

    // Helper functions to read/write storage
    const getStore = (key: string, fallback: any) => {
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : fallback;
      } catch {
        return fallback;
      }
    };

    const setStore = (key: string, data: any) => {
      try {
        localStorage.setItem(key, JSON.stringify(data));
      } catch (err) {
        console.warn("LocalStorage write error:", err);
      }
    };

    // 2. Intercept window.fetch to provide bulletproof fallback for static hosts (Firebase Hosting)
    const originalFetch = window.fetch;

    window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      const urlString = typeof input === "string" ? input : input instanceof URL ? input.toString() : (input as Request).url;
      const parsedUrl = new URL(urlString, window.location.origin);
      const pathname = parsedUrl.pathname;
      const method = (init?.method || "GET").toUpperCase();

      // Only intercept /api/ routes
      if (!pathname.startsWith("/api/")) {
        return originalFetch(input, init);
      }

      // Try actual network request first
      try {
        const res = await originalFetch(input, init);
        const contentType = res.headers.get("content-type") || "";

        // Never swallow real API JSON responses or /api/auth/* errors
        if (pathname.startsWith("/api/auth/")) {
          return res;
        }
        if (contentType.includes("application/json")) {
          return res;
        }
        if (!contentType.includes("text/html") && res.status !== 404) {
          return res;
        }
      } catch {
        // Network error (offline or server down), fallback below
      }

      // --- CLIENT STORE ROUTER (Simulates catalog on static hosting, NEVER fakes auth) ---
      const createJsonResponse = (data: any, status = 200) => {
        return new Response(JSON.stringify(data), {
          status,
          headers: { "Content-Type": "application/json" },
        });
      };

      // AUTH ROUTES (fail closed — never auto-login as Admin)
      if (pathname === "/api/auth/me") {
        return createJsonResponse({ success: true, user: null });
      }

      if (pathname === "/api/auth/login" || pathname === "/api/auth/register") {
        return createJsonResponse(
          {
            success: false,
            error: "Authentication service is unavailable. Please ensure the backend server is running.",
          },
          503
        );
      }

      if (pathname === "/api/auth/logout") {
        localStorage.removeItem("stayzy_user");
        localStorage.removeItem("stayzy_jwt_token");
        localStorage.removeItem("stayzy_token");
        return createJsonResponse({ success: true, message: "Logged out" });
      }

      if (pathname === "/api/auth/switch") {
        return createJsonResponse(
          { success: false, error: "Role switching is disabled. Please sign in with your account." },
          403
        );
      }

      // ADMIN USERS (3-Role Management)
      if (pathname === "/api/admin/users") {
        const users = getStore("stayzy_users", INITIAL_USERS);
        if (method === "GET") {
          return createJsonResponse({ success: true, users });
        }
        if (method === "POST" || method === "PATCH") {
          let body: any = {};
          if (init?.body) {
            try {
              body = JSON.parse(init.body as string);
            } catch {}
          }
          if (body.action === "updateRole") {
            const updated = users.map((u: any) =>
              u.id === body.userId ? { ...u, role: body.newRole } : u
            );
            setStore("stayzy_users", updated);
            return createJsonResponse({ success: true, users: updated });
          }
          if (body.action === "toggleStatus") {
            const updated = users.map((u: any) =>
              u.id === body.userId
                ? { ...u, status: u.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE" }
                : u
            );
            setStore("stayzy_users", updated);
            return createJsonResponse({ success: true, users: updated });
          }
          if (body.action === "createUser") {
            const newUser = {
              id: `usr-${Date.now()}`,
              name: body.name || "New User",
              email: body.email,
              phone: body.phone || "+91 98000 00000",
              role: body.role || "CUSTOMER",
              status: "ACTIVE",
              propertiesCount: body.role === "OWNER" ? 1 : 0,
              bookingsCount: 0,
              joinedDate: "Today",
            };
            const updated = [newUser, ...users];
            setStore("stayzy_users", updated);
            return createJsonResponse({ success: true, user: newUser, users: updated });
          }
        }
        return createJsonResponse({ success: true, users });
      }

      // PROPERTY OWNER APIS
      if (pathname === "/api/owner/properties") {
        const props = getStore("stayzy_properties", INITIAL_PROPERTIES);
        if (method === "GET") {
          return createJsonResponse({ success: true, properties: props });
        }
        if (method === "POST") {
          let body: any = {};
          if (init?.body) {
            try {
              body = JSON.parse(init.body as string);
            } catch {}
          }
          const newProperty = {
            id: `prop-${Date.now()}`,
            name: body.name || "New PG Property",
            slug: (body.name || "new-pg")
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-"),
            tagline: body.tagline || "Brand new verified Stayzy PG accommodation",
            description: body.description || "",
            address: body.address || "",
            city: body.city || "Bengaluru",
            state: body.state || "Karnataka",
            pincode: body.pincode || "560001",
            contactPhone: body.contactPhone || "+91 98450 88990",
            contactEmail: body.contactEmail || "owner@stayzy.in",
            checkInTime: body.checkInTime || "12:00 PM",
            checkOutTime: body.checkOutTime || "11:00 AM",
            timezone: "Asia/Kolkata",
            coverImage: body.coverImage || "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80",
            images: body.images?.length
              ? body.images
              : ["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80"],
            ownerName: body.ownerName || "Rajesh Kumar",
            status: "APPROVED",
            isApproved: true,
            roomTypesCount: body.roomTypes?.length || 2,
            totalBeds: body.totalBeds || 16,
            monthlyRentStart: body.monthlyRentStart || 11000,
            gender: body.gender || "COLIVING",
            amenities: body.amenities || ["Wi-Fi", "Daily Food", "Housekeeping", "AC"],
            createdAt: new Date().toISOString(),
          };

          const updated = [newProperty, ...props];
          setStore("stayzy_properties", updated);
          return createJsonResponse({ success: true, property: newProperty, properties: updated });
        }
      }

      if (pathname === "/api/owner/visits") {
        const visits = getStore("stayzy_visits", INITIAL_VISITS);
        return createJsonResponse({ success: true, visits });
      }

      if (pathname === "/api/owner/bookings") {
        const bookings = getStore("stayzy_bookings", INITIAL_BOOKINGS);
        return createJsonResponse({ success: true, bookings });
      }

      // ADMIN PAYMENTS
      if (pathname === "/api/admin/payments") {
        if (method === "GET") {
          const payments = getStore("stayzy_payments", INITIAL_PAYMENTS);
          const schedules = getStore("stayzy_schedules", INITIAL_SCHEDULES);
          const refunds = getStore("stayzy_refunds", INITIAL_REFUNDS);
          const totalCollected = payments
            .filter((p: any) => p.status === "SUCCESS")
            .reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
          const pendingRent = schedules
            .filter((s: any) => s.status === "PENDING")
            .reduce((sum: number, s: any) => sum + (Number(s.amount) || 0), 0);

          return createJsonResponse({
            success: true,
            payments,
            schedules,
            refunds,
            totalCollected,
            pendingRent,
          });
        }

        if (method === "POST") {
          let body: any = {};
          if (init?.body) {
            try {
              body = JSON.parse(init.body as string);
            } catch {}
          }
          const payments = getStore("stayzy_payments", INITIAL_PAYMENTS);
          const bookings = getStore("stayzy_bookings", INITIAL_BOOKINGS);
          const targetBooking = bookings.find((b: any) => b.id === body.bookingId) || bookings[0];

          const newPayment = {
            id: `pay-${Date.now()}`,
            bookingId: targetBooking?.id || body.bookingId,
            amount: Number(body.amount) || 15000,
            currency: "INR",
            status: "SUCCESS",
            provider: body.provider || "MANUAL_OFFLINE",
            transactionRef: body.transactionRef || `OFFLINE_${Date.now().toString().slice(-6)}`,
            isDemo: true,
            createdAt: new Date().toISOString(),
            booking: {
              bookingReference: targetBooking?.bookingReference || "STY-OFFLINE",
              guestName: targetBooking?.guestName || "Walk-In Resident",
              guestEmail: targetBooking?.guestEmail || "resident@stayzy.in",
            },
          };

          payments.unshift(newPayment);
          setStore("stayzy_payments", payments);

          return createJsonResponse({
            success: true,
            payment: newPayment,
            message: "Payment recorded successfully in ledger.",
          });
        }
      }

      // ADMIN BOOKINGS
      if (pathname === "/api/admin/bookings" || pathname.startsWith("/api/admin/bookings/")) {
        const bookings = getStore("stayzy_bookings", INITIAL_BOOKINGS);

        if (pathname === "/api/admin/bookings" && method === "GET") {
          return createJsonResponse({ success: true, bookings });
        }

        const idMatch = pathname.match(/\/api\/admin\/bookings\/([^/]+)/);
        if (idMatch) {
          const bookingId = idMatch[1];
          const found = bookings.find((b: any) => b.id === bookingId || b.bookingReference === bookingId);

          if (method === "GET") {
            return createJsonResponse({ success: true, booking: found || bookings[0] });
          }

          if (method === "PATCH") {
            let body: any = {};
            if (init?.body) {
              try {
                body = JSON.parse(init.body as string);
              } catch {}
            }
            if (found) {
              if (body.status) found.status = body.status;
              if (body.notes !== undefined) found.notes = body.notes;
              if (body.processRefund && body.refundAmount) {
                const refunds = getStore("stayzy_refunds", INITIAL_REFUNDS);
                refunds.unshift({
                  id: `ref-${Date.now()}`,
                  bookingId: found.id,
                  amount: body.refundAmount,
                  reason: body.cancellationReason || "Admin processed refund",
                  status: "COMPLETED",
                  requestedAt: new Date().toISOString(),
                  processedAt: new Date().toISOString(),
                  booking: { bookingReference: found.bookingReference },
                });
                setStore("stayzy_refunds", refunds);
              }
              setStore("stayzy_bookings", bookings);
            }
            return createJsonResponse({ success: true, booking: found || bookings[0] });
          }
        }
      }

      // RESIDENT USER BOOKINGS
      if (pathname === "/api/bookings/my") {
        const bookings = getStore("stayzy_bookings", INITIAL_BOOKINGS);
        return createJsonResponse({ success: true, bookings });
      }

      if (pathname === "/api/payments/my") {
        const payments = getStore("stayzy_payments", INITIAL_PAYMENTS);
        const schedules = getStore("stayzy_schedules", INITIAL_SCHEDULES);
        return createJsonResponse({ success: true, payments, schedules });
      }

      // VISITS
      if (pathname === "/api/visits/my" || pathname === "/api/admin/visits") {
        const visits = getStore("stayzy_visits", INITIAL_VISITS);
        return createJsonResponse({ success: true, visits });
      }

      if (pathname === "/api/visits/schedule") {
        let body: any = {};
        if (init?.body) {
          try {
            body = JSON.parse(init.body as string);
          } catch {}
        }
        const visits = getStore("stayzy_visits", INITIAL_VISITS);
        const newVisit = {
          id: `visit-${Date.now()}`,
          fullName: body.fullName || "Scheduled Guest",
          email: body.email || "guest@example.com",
          phone: body.phone || "+91 99887 76655",
          visitDate: body.visitDate || new Date().toISOString().split("T")[0],
          visitTime: body.visitTime || "11:00 AM",
          preferredDuration: body.preferredDuration || "MONTHLY",
          propertyId: body.propertyId || "prop-koramangala",
          status: "CONFIRMED",
          notes: body.notes || "",
          createdAt: new Date().toISOString(),
          property: { name: "Stayzy Haven — Koramangala", address: "Koramangala, Bengaluru" },
        };
        visits.unshift(newVisit);
        setStore("stayzy_visits", visits);
        return createJsonResponse({ success: true, message: "Visit scheduled successfully!", visit: newVisit });
      }

      // SUPPORT TICKETS
      if (pathname === "/api/support" || pathname === "/api/admin/support") {
        const tickets = getStore("stayzy_tickets", INITIAL_TICKETS);
        if (method === "GET") {
          return createJsonResponse({ success: true, tickets });
        }
        if (method === "POST") {
          let body: any = {};
          if (init?.body) {
            try {
              body = JSON.parse(init.body as string);
            } catch {}
          }
          if (body.ticketId && body.hostReply) {
            // Admin replying
            const target = tickets.find((t: any) => t.id === body.ticketId);
            if (target) {
              target.hostReply = body.hostReply;
              target.status = body.status || "RESOLVED";
            }
          } else {
            // Customer creating ticket
            tickets.unshift({
              id: `tick-${Date.now()}`,
              bookingId: body.bookingId || "booking-demo-001",
              category: body.category || "GENERAL",
              subject: body.subject || "Support Query",
              description: body.description || "",
              status: "OPEN",
              createdAt: new Date().toISOString(),
              booking: {
                bookingReference: "STY-892101",
                guestName: "Aarav Sharma",
                inventoryUnit: { identifier: "Studio 302-A" },
              },
            });
          }
          setStore("stayzy_tickets", tickets);
          return createJsonResponse({ success: true, message: "Support ticket updated." });
        }
      }

      // PRICING CALCULATE
      if (pathname === "/api/pricing/calculate") {
        let body: any = {};
        if (init?.body) {
          try {
            body = JSON.parse(init.body as string);
          } catch {}
        }
        const count = Number(body.durationCount) || 1;
        const durationType = body.durationType || "MONTHLY";
        let baseRate = 28000;
        if (durationType === "HOURLY") baseRate = 180;
        else if (durationType === "DAILY") baseRate = 750;
        else if (durationType === "WEEKLY") baseRate = 4200;
        else if (durationType === "YEARLY") baseRate = 320000;

        const basePrice = baseRate * count;
        const foodCharges = body.includeFood ? (durationType === "MONTHLY" ? 3500 * count : 250 * count) : 0;
        const taxes = Math.round((basePrice + foodCharges) * 0.12);
        const depositAmount = durationType === "MONTHLY" ? 30000 : durationType === "YEARLY" ? 35000 : 2000;
        const totalAmount = basePrice + foodCharges + taxes + depositAmount;

        const breakdown = {
          durationType,
          durationCount: count,
          unitPrice: baseRate,
          baseAmount: basePrice,
          foodCharge: foodCharges,
          taxes,
          depositAmount,
          totalAmount,
          payableNow: totalAmount,
          balanceRemaining: 0,
          hasGst: true,
          isDepositRefundable: true,
        };

        return createJsonResponse({
          success: true,
          breakdown,
          pricing: breakdown,
        });
      }

      // CHECKOUT HOLD & BOOKING
      if (pathname === "/api/checkout/hold") {
        const token = `HOLD_${Date.now()}`;
        return createJsonResponse({
          success: true,
          token,
          holdToken: token,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        });
      }

      if (pathname === "/api/checkout/create-booking") {
        let body: any = {};
        if (init?.body) {
          try {
            body = JSON.parse(init.body as string);
          } catch {}
        }
        const bookingId = `book-${Date.now()}`;
        const ref = `STY-${Date.now().toString().slice(-6)}`;
        const bookings = getStore("stayzy_bookings", INITIAL_BOOKINGS);

        const newBooking = {
          id: bookingId,
          bookingReference: ref,
          userId: "usr-customer-001",
          propertyId: "prop-koramangala",
          guestName: body.guestName || "Aarav Sharma",
          guestEmail: body.guestEmail || "aarav.sharma@example.com",
          guestPhone: body.guestPhone || "+91 98765 12345",
          guestCount: Number(body.guestCount) || 1,
          durationType: body.durationType || "MONTHLY",
          durationCount: Number(body.durationCount) || 1,
          startTime: body.startTime || new Date().toISOString(),
          endTime: new Date(Date.now() + 30 * 86400000).toISOString(),
          status: "CONFIRMED",
          paymentStatus: "PAID",
          basePrice: 28000,
          foodCharges: 3500,
          taxes: 3780,
          depositAmount: 30000,
          totalAmount: 65280,
          payableNow: 65280,
          balanceRemaining: 0,
          createdAt: new Date().toISOString(),
          property: {
            name: "Stayzy Haven — Koramangala",
            address: "84, 4th Cross, 5th Block, Koramangala",
            city: "Bengaluru",
            checkInTime: "12:00 PM",
            checkOutTime: "11:00 AM",
          },
          roomType: {
            name: "Deluxe Studio Suite",
            slug: "deluxe-private-studio-suite",
            images: '["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80"]',
          },
          inventoryUnit: {
            identifier: "Room 201-A",
            room: { roomNumber: "201", floor: 2 },
          },
        };

        bookings.unshift(newBooking);
        setStore("stayzy_bookings", bookings);

        // Also add payment
        const payments = getStore("stayzy_payments", INITIAL_PAYMENTS);
        payments.unshift({
          id: `pay-${Date.now()}`,
          bookingId,
          amount: 65280,
          currency: "INR",
          status: "SUCCESS",
          provider: "DEMO_ADAPTER",
          transactionRef: `TXN_${Date.now().toString().slice(-8)}`,
          isDemo: true,
          createdAt: new Date().toISOString(),
          booking: {
            bookingReference: ref,
            guestName: newBooking.guestName,
            guestEmail: newBooking.guestEmail,
          },
        });
        setStore("stayzy_payments", payments);

        return createJsonResponse({
          success: true,
          bookingId,
          bookingReference: ref,
          paymentSession: {
            bookingId,
            payableNow: 65280,
            paymentDetails: {
              transactionRef: `TXN_${Date.now().toString().slice(-8)}`,
              signature: "demo_sig_verified",
            },
          },
        });
      }

      // ADMIN STATS
      if (pathname === "/api/admin/stats") {
        const bookings = getStore("stayzy_bookings", INITIAL_BOOKINGS);
        const payments = getStore("stayzy_payments", INITIAL_PAYMENTS);
        const visits = getStore("stayzy_visits", INITIAL_VISITS);
        const properties = getStore("stayzy_properties", INITIAL_PROPERTIES);

        const totalRevenue = payments
          .filter((p: any) => p.status === "SUCCESS")
          .reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);

        return createJsonResponse({
          success: true,
          stats: {
            totalRevenue,
            totalBookingsCount: bookings.length,
            checkedInCount: bookings.filter((b: any) => b.status === "CHECKED_IN").length,
            confirmedCount: bookings.filter((b: any) => b.status === "CONFIRMED").length,
            totalUnitsCount: 48,
            activeHoldsCount: 2,
            pendingVisitsCount: visits.length,
          },
          recentBookings: bookings.slice(0, 8),
          recentVisits: visits.slice(0, 10),
          properties,
        });
      }

      // ADMIN PROPERTIES
      if (pathname === "/api/admin/properties") {
        const properties = getStore("stayzy_properties", INITIAL_PROPERTIES);
        return createJsonResponse({ success: true, properties });
      }

      // ADMIN RATES
      if (pathname === "/api/admin/rates") {
        return createJsonResponse({
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
            {
              id: "room-executive-twin",
              name: "Executive Twin Sharing Suite",
              category: "TWIN_SHARING",
              property: INITIAL_PROPERTIES[1],
              ratePlans: [
                { id: "rp-6", durationType: "HOURLY", price: 120, isEnabled: true, depositAmount: 500 },
                { id: "rp-7", durationType: "DAILY", price: 500, isEnabled: true, depositAmount: 1000 },
                { id: "rp-8", durationType: "WEEKLY", price: 2800, isEnabled: true, depositAmount: 3000 },
                { id: "rp-9", durationType: "MONTHLY", price: 17500, isEnabled: true, depositAmount: 15000 },
                { id: "rp-10", durationType: "YEARLY", price: 195000, isEnabled: true, depositAmount: 20000 },
              ],
            },
          ],
        });
      }

      // ADMIN CUSTOMERS
      if (pathname === "/api/admin/customers") {
        return createJsonResponse({
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
      }

      // Fallback for any other /api route: return empty JSON success instead of crashing with HTML
      return createJsonResponse({ success: true, message: "OK" });
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  return null;
}
