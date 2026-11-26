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
import { calculateBookingPricing } from "@/lib/pricing";
import { DurationType } from "@/lib/types";

function installStaticDataSync() {
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

  if ((window as any).__stayzyFetchPatched) return;
  (window as any).__stayzyFetchPatched = true;

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
  const originalFetch = window.fetch.bind(window);
  (window as any).__stayzyOriginalFetch = originalFetch;

  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const urlString =
      typeof input === "string"
        ? input
        : input instanceof URL
        ? input.toString()
        : (input as Request).url;
    const parsedUrl = new URL(urlString, window.location.origin);
    const pathname = parsedUrl.pathname;
    const method = (init?.method || "GET").toUpperCase();

    if (!pathname.startsWith("/api/")) {
      return originalFetch(input, init);
    }

    // Try actual network request first (with safe /api/auth/me check so static HTML never bypasses interceptor)
    try {
      const res = await originalFetch(input, init);
      const contentType = res.headers.get("content-type") || "";

      if (contentType.includes("application/json")) {
        return res;
      }
      if (!contentType.includes("text/html") && res.status !== 404) {
        return res;
      }
    } catch {
      // Network error (offline or static host), fallback below
    }

    const createJsonResponse = (data: any, status = 200) => {
      return new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    };

    const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

    // AUTH ROUTES (never auto-login without explicit user action)
    if (pathname === "/api/auth/me") {
      const storedUser = getStore("stayzy_user", null);
      return createJsonResponse({ success: true, user: storedUser });
    }

    if (pathname === "/api/auth/login") {
      let body: any = {};
      if (init?.body) {
        try {
          body = JSON.parse(init.body as string);
        } catch {}
      }

      if (!isDemoMode) {
        return createJsonResponse(
          {
            success: false,
            error: "Authentication service is unavailable in static preview mode.",
          },
          503
        );
      }

      if (body.demoType === "admin") {
        setStore("stayzy_user", DEMO_USERS.admin);
        return createJsonResponse({ success: true, user: DEMO_USERS.admin });
      }
      if (body.demoType === "owner") {
        setStore("stayzy_user", DEMO_USERS.owner);
        return createJsonResponse({ success: true, user: DEMO_USERS.owner });
      }
      if (body.demoType === "customer") {
        setStore("stayzy_user", DEMO_USERS.customer);
        return createJsonResponse({ success: true, user: DEMO_USERS.customer });
      }

      const email = String(body.email || "").trim().toLowerCase();
      const phone = String(body.phone || "").replace(/\D/g, "");
      const password = String(body.password || "");

      const demoPasswords: Record<string, { user: any; pass: string }> = {
        "admin@stayzy.com": { user: DEMO_USERS.admin, pass: "AdminPassword123!" },
        "aarav.sharma@example.com": { user: DEMO_USERS.customer, pass: "password123" },
        "rajesh.pg@stayzy.com": { user: DEMO_USERS.owner, pass: "password123" },
        "host@stayzy.com": { user: DEMO_USERS.owner, pass: "password123" },
      };

      let matchedUser: any = null;
      if (email && demoPasswords[email] && demoPasswords[email].pass === password) {
        matchedUser = demoPasswords[email].user;
      } else {
        const users = getStore("stayzy_users", INITIAL_USERS);
        const found = users.find((u: any) => {
          const emailMatch = email && String(u.email || "").toLowerCase() === email;
          const phoneDigits = String(u.phone || "").replace(/\D/g, "");
          const phoneMatch = phone && phoneDigits && phoneDigits.endsWith(phone.slice(-10));
          return (emailMatch || phoneMatch) && (!u.demoPassword || u.demoPassword === password);
        });
        if (found) {
          matchedUser = {
            id: found.id,
            name: found.name,
            email: found.email,
            phone: found.phone || null,
            role: found.role || "CUSTOMER",
          };
        }
      }

      if (!matchedUser) {
        return createJsonResponse({ success: false, error: "Invalid email or password." }, 401);
      }

      if (body.requiredRole === "ADMIN" && matchedUser.role !== "ADMIN") {
        return createJsonResponse(
          { success: false, error: "Access denied. This account does not possess administrator credentials." },
          403
        );
      }

      setStore("stayzy_user", matchedUser);
      return createJsonResponse({ success: true, user: matchedUser });
    }

    if (pathname === "/api/auth/register") {
      if (!isDemoMode) {
        return createJsonResponse(
          { success: false, error: "Registration service is unavailable in static preview mode." },
          503
        );
      }
      let body: any = {};
      if (init?.body) {
        try {
          body = JSON.parse(init.body as string);
        } catch {}
      }
      const cleanEmail = String(body.email || "").trim().toLowerCase();
      if (!cleanEmail || !body.name || !body.password) {
        return createJsonResponse(
          { success: false, error: "Please provide your full name, email, and password." },
          400
        );
      }
      const users = getStore("stayzy_users", INITIAL_USERS);
      if (users.some((u: any) => String(u.email || "").toLowerCase() === cleanEmail)) {
        return createJsonResponse(
          { success: false, error: "An account with this email already exists. Please log in instead." },
          409
        );
      }
      const newUser = {
        id: `usr-${Date.now()}`,
        name: String(body.name).trim(),
        email: cleanEmail,
        phone: body.phone || null,
        role: "CUSTOMER",
        status: "ACTIVE",
        demoPassword: String(body.password),
        joinedDate: "Today",
      };
      setStore("stayzy_users", [newUser, ...users]);
      const sessionUser = {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
      };
      setStore("stayzy_user", sessionUser);
      return createJsonResponse({ success: true, user: sessionUser }, 201);
    }

    if (pathname === "/api/auth/google") {
      return createJsonResponse(
        { success: false, error: "Google backend session verification unavailable in static mode." },
        503
      );
    }

    if (pathname === "/api/auth/profile" && method === "PATCH") {
      let body: any = {};
      if (init?.body) {
        try {
          body = JSON.parse(init.body as string);
        } catch {}
      }
      const current = getStore("stayzy_user", null);
      if (!current) {
        return createJsonResponse({ success: false, error: "Unauthorized" }, 401);
      }
      const updated = {
        ...current,
        name: body.name || current.name,
        phone: body.phone !== undefined ? body.phone : current.phone,
      };
      setStore("stayzy_user", updated);
      return createJsonResponse({ success: true, user: updated });
    }

    if (pathname === "/api/auth/logout") {
      localStorage.removeItem("stayzy_user");
      localStorage.removeItem("stayzy_jwt_token");
      localStorage.removeItem("stayzy_token");
      return createJsonResponse({ success: true, message: "Logged out" });
    }

    if (pathname === "/api/auth/switch") {
      if (!isDemoMode) {
        return createJsonResponse(
          { success: false, error: "Role switching is disabled. Please sign in with your account." },
          403
        );
      }
      let body: any = {};
      if (init?.body) {
        try {
          body = JSON.parse(init.body as string);
        } catch {}
      }
      const role = String(body.role || "").toUpperCase();
      const target =
        role === "ADMIN" ? DEMO_USERS.admin : role === "OWNER" ? DEMO_USERS.owner : DEMO_USERS.customer;
      setStore("stayzy_user", target);
      return createJsonResponse({ success: true, user: target });
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

      // RESIDENT BOOKING EXTEND & CANCEL
      if (pathname.startsWith("/api/bookings/") && pathname.endsWith("/extend")) {
        const bookingId = pathname.split("/")[3];
        let body: any = {};
        if (init?.body) {
          try {
            body = JSON.parse(init.body as string);
          } catch {}
        }
        const addCount = Number(body.additionalCount) || 1;
        const bookings = getStore("stayzy_bookings", INITIAL_BOOKINGS);
        const target = bookings.find((b: any) => b.id === bookingId);
        if (target) {
          target.durationCount = (Number(target.durationCount) || 1) + addCount;
          const endMs = new Date(target.endTime).getTime();
          const dayMs =
            target.durationType === "HOURLY"
              ? 3600000
              : target.durationType === "WEEKLY"
              ? 7 * 86400000
              : target.durationType === "MONTHLY"
              ? 30 * 86400000
              : 86400000;
          target.endTime = new Date((Number.isNaN(endMs) ? Date.now() : endMs) + addCount * dayMs).toISOString();
          setStore("stayzy_bookings", bookings);
        }
        return createJsonResponse({ success: true, message: `Stay extended by ${addCount} unit(s).` });
      }

      if (pathname.startsWith("/api/bookings/") && pathname.endsWith("/cancel")) {
        const bookingId = pathname.split("/")[3];
        let body: any = {};
        if (init?.body) {
          try {
            body = JSON.parse(init.body as string);
          } catch {}
        }
        const bookings = getStore("stayzy_bookings", INITIAL_BOOKINGS);
        const target = bookings.find((b: any) => b.id === bookingId);
        if (target) {
          target.status = "CANCELLED";
          target.cancellationReason = body.reason || "Cancelled by resident";
          setStore("stayzy_bookings", bookings);
        }
        return createJsonResponse({ success: true, message: "Booking cancelled successfully." });
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
          fullName: body.customerName || body.fullName || "Scheduled Guest",
          email: body.customerEmail || body.email || "guest@example.com",
          phone: body.customerPhone || body.phone || "+91 99887 76655",
          visitDate: body.preferredDate || body.visitDate || new Date().toISOString().split("T")[0],
          visitTime: body.timeSlot || body.visitTime || "11:00 AM",
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
        const durationType = (body.durationType || "MONTHLY") as DurationType;
        const defaultRates: Record<string, { price: number; deposit: number; food: number }> = {
          HOURLY: { price: 180, deposit: 500, food: 0 },
          DAILY: { price: 750, deposit: 1000, food: 250 },
          WEEKLY: { price: 4200, deposit: 5000, food: 1200 },
          MONTHLY: { price: 28000, deposit: 20000, food: 3500 },
          YEARLY: { price: 320000, deposit: 35000, food: 3500 },
        };
        const cfg = defaultRates[durationType] || defaultRates.MONTHLY;
        const calc = calculateBookingPricing({
          ratePlan: {
            durationType,
            price: cfg.price,
            depositAmount: cfg.deposit,
            foodMonthlyCharge: cfg.food,
            minDuration: 1,
            maxDuration: null,
            allowedHoursStart: "08:00",
            allowedHoursEnd: "22:00",
            electricityRule: "Included in rent",
            notes: null,
            isEnabled: true,
          },
          durationType,
          durationCount: count,
          startDateStr: body.startDate || new Date().toISOString().split("T")[0],
          startTimeStr: body.startTime || "10:00",
          includeFood: Boolean(body.includeFood),
        });

        if (calc.success) {
          return createJsonResponse({
            success: true,
            breakdown: calc.breakdown,
            pricing: calc.breakdown,
          });
        }
        return createJsonResponse({ success: false, error: calc.error }, 400);
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
        const currentUser = getStore("stayzy_user", null);
        const basePrice = Number(body.basePrice) || 28000;
        const foodCharges = Number(body.foodCharges) || 0;
        const taxes = Number(body.taxes) || Math.round((basePrice + foodCharges) * 0.12);
        const depositAmount = body.depositAmount !== undefined ? Number(body.depositAmount) : 20000;
        const totalAmount = Number(body.totalAmount) || basePrice + foodCharges + taxes + depositAmount;
        const payableNow = Number(body.payableNow) || totalAmount;
        const paymentId = `pay-${Date.now()}`;
        const transactionRef = `TXN_DEMO_${Date.now()}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

        const newBooking = {
          id: bookingId,
          bookingReference: ref,
          userId: currentUser?.id || "usr-customer-001",
          propertyId: body.propertyId || "prop-koramangala",
          guestName: body.guestName || currentUser?.name || "Aarav Sharma",
          guestEmail: body.guestEmail || currentUser?.email || "aarav.sharma@example.com",
          guestPhone: body.guestPhone || currentUser?.phone || "+91 98765 12345",
          guestCount: Number(body.guestCount) || 1,
          durationType: body.durationType || "MONTHLY",
          durationCount: Number(body.durationCount) || 1,
          startTime: body.startDateTime || body.startDate || new Date().toISOString(),
          endTime: body.endDateTime || new Date(Date.now() + 30 * 86400000).toISOString(),
          status: "PENDING",
          paymentStatus: "UNPAID",
          basePrice,
          foodCharges,
          taxes,
          depositAmount,
          totalAmount,
          payableNow,
          balanceRemaining: Math.max(0, totalAmount - payableNow),
          createdAt: new Date().toISOString(),
          property: {
            name: body.propertyName || "Stayzy Haven — Koramangala",
            address: body.propertyAddress || "84, 4th Cross, 5th Block, Koramangala",
            city: body.propertyCity || "Bengaluru",
            checkInTime: "12:00 PM",
            checkOutTime: "11:00 AM",
          },
          roomType: {
            name: body.roomName || "Deluxe Studio Suite",
            slug: body.roomSlug || "deluxe-private-studio-suite",
            images: JSON.stringify([
              body.roomImage || "/images/rooms/private-room-main.webp",
            ]),
          },
          inventoryUnit: {
            identifier: "Room 201-A",
            room: { roomNumber: "201", floor: 2 },
          },
        };

        bookings.unshift(newBooking);
        setStore("stayzy_bookings", bookings);

        const payments = getStore("stayzy_payments", INITIAL_PAYMENTS);
        payments.unshift({
          id: paymentId,
          bookingId,
          amount: payableNow,
          currency: "INR",
          status: "PENDING",
          provider: "DEMO_ADAPTER",
          transactionRef,
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
          payableNow,
          currency: "INR",
          paymentDetails: {
            paymentId,
            transactionRef,
            amount: payableNow,
            currency: "INR",
            provider: "DEMO_ADAPTER",
            isDemo: true,
            signature: "demo_sig_verified",
            failedSignature: "demo_sig_failed",
          },
        });
      }

      if (pathname === "/api/payments/webhook") {
        let body: any = {};
        if (init?.body) {
          try {
            body = JSON.parse(init.body as string);
          } catch {}
        }
        const status = body.status === "FAILED" ? "FAILED" : "SUCCESS";
        const bookings = getStore("stayzy_bookings", INITIAL_BOOKINGS);
        const booking = bookings.find((b: any) => b.id === body.bookingId);
        if (booking) {
          if (status === "SUCCESS") {
            booking.status = "CONFIRMED";
            booking.paymentStatus = "PAID";
          } else {
            booking.status = "PENDING";
            booking.paymentStatus = "UNPAID";
          }
          setStore("stayzy_bookings", bookings);
        }

        const payments = getStore("stayzy_payments", INITIAL_PAYMENTS);
        const payment = payments.find(
          (p: any) => p.id === body.paymentId || p.transactionRef === body.transactionRef
        );
        if (payment) {
          payment.status = status;
          setStore("stayzy_payments", payments);
        }

        return createJsonResponse({
          success: true,
          status: status === "SUCCESS" ? "CONFIRMED" : "FAILED",
          bookingReference: booking?.bookingReference || "STY-DEMO",
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

      // PUBLIC PROPERTIES
      if (pathname === "/api/properties") {
        return createJsonResponse({
          success: true,
          properties: getStore("stayzy_properties", INITIAL_PROPERTIES),
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
}

export function ClientDataSync() {
  if (typeof window !== "undefined") {
    installStaticDataSync();
  }

  useEffect(() => {
    installStaticDataSync();
  }, []);

  return null;
}
