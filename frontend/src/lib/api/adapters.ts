import {
  BackendRole,
  FrontendRole,
  BackendUser,
  BackendProperty,
  BackendBooking,
  BackendPayment,
} from "./types";
import { SessionUser } from "../auth";

/**
 * Maps Express backend role ("guest" | "host" | "admin")
 * to Stayzy frontend role ("CUSTOMER" | "OWNER" | "ADMIN").
 */
export function backendRoleToFrontend(role?: string | null): FrontendRole {
  if (!role) return "CUSTOMER";
  const normalized = role.toLowerCase().trim();
  if (normalized === "admin") return "ADMIN";
  if (normalized === "host" || normalized === "owner") return "OWNER";
  return "CUSTOMER";
}

/**
 * Maps Stayzy frontend role ("CUSTOMER" | "OWNER" | "ADMIN")
 * to Express backend role ("guest" | "host" | "admin").
 */
export function frontendRoleToBackend(role?: string | null): BackendRole {
  if (!role) return "guest";
  const normalized = role.toUpperCase().trim();
  if (normalized === "ADMIN") return "admin";
  if (normalized === "OWNER" || normalized === "HOST") return "host";
  return "guest";
}

/**
 * Adapts a backend user entity to the frontend SessionUser interface.
 */
export function backendUserToFrontend(user: BackendUser): SessionUser {
  return {
    id: user.id,
    email: user.email,
    name: user.full_name,
    phone: user.phone || null,
    role: backendRoleToFrontend(user.role),
  };
}

/**
 * Adapts an Express backend property listing into the frontend room representation
 * ensuring backward compatibility with RoomCard, RoomCatalog, and detail views.
 */
export function backendPropertyToFrontendRoom(property: BackendProperty) {
  const images: string[] = Array.isArray(property.images)
    ? property.images
    : typeof property.images === "string"
    ? JSON.parse(property.images || "[]")
    : [];

  const amenities: string[] = Array.isArray(property.amenities)
    ? property.amenities
    : typeof property.amenities === "string"
    ? JSON.parse(property.amenities || "[]")
    : [];

  const pricePerNight = Number(property.price_per_night) || 0;
  // Estimate monthly rate based on night price
  const monthlyPrice = pricePerNight > 1000 ? pricePerNight : pricePerNight * 30;

  const hasAc = amenities.some((a) => /ac|air condition|climate/i.test(a));
  const hasFood = amenities.some((a) => /food|meal|kitchen|breakfast/i.test(a));

  return {
    id: property.id,
    roomTypeId: property.room_types?.[0]?.id || property.id,
    name: property.title,
    title: property.title,
    slug: property.id,
    description: property.description,
    category:
      property.room_type === "shared_room"
        ? "TWIN_SHARING"
        : property.room_type === "private_room"
        ? "PRIVATE"
        : "PRIVATE",
    propertyType: property.property_type,
    genderEligibility: "COLIVING",
    displayLocality: property.city || "Bengaluru",
    hasAc,
    bathroomType: "ATTACHED",
    foodIncluded: hasFood,
    keyAmenities: amenities,
    amenities,
    images: images.length > 0 ? images : ["/fallback-room.jpg"],
    coverImage: images[0] || "/fallback-room.jpg",
    price: monthlyPrice,
    currentRatePlan: {
      durationType: "MONTHLY",
      price: monthlyPrice,
      deposit: Math.round(monthlyPrice * 0.5),
    },
    ratePlans: property.room_types?.[0]?.rate_plans?.length
      ? property.room_types[0].rate_plans.map((rp: any) => ({
          id: rp.id,
          durationType: rp.duration_type,
          price: Number(rp.price),
          isEnabled: rp.is_enabled ?? true,
          minDuration: rp.min_duration,
          maxDuration: rp.max_duration,
          depositAmount: Number(rp.deposit_amount || 0),
          foodMonthlyCharge: Number(rp.food_monthly_charge || 0),
        }))
      : [
          { durationType: "HOURLY", price: Math.max(100, Math.round(monthlyPrice / 150)), isEnabled: true, minDuration: 3, depositAmount: 0 },
          { durationType: "DAILY", price: pricePerNight || Math.max(500, Math.round(monthlyPrice / 25)), isEnabled: true, minDuration: 1, depositAmount: 500 },
          { durationType: "WEEKLY", price: Math.max(2500, Math.round(monthlyPrice * 0.28)), isEnabled: true, minDuration: 1, depositAmount: 2000 },
          { durationType: "MONTHLY", price: monthlyPrice, isEnabled: true, minDuration: 1, depositAmount: Math.round(monthlyPrice * 0.5) },
          { durationType: "YEARLY", price: monthlyPrice * 11, isEnabled: true, minDuration: 1, depositAmount: monthlyPrice },
        ],
    property: {
      id: property.id,
      name: property.title,
      city: property.city,
      address: property.address,
      locality: property.city,
      state: property.state || "",
      coverImage: images[0] || "/fallback-room.jpg",
    },
    averageRating: Number(property.average_rating) || 4.8,
    reviewsCount: property.reviews_count || 0,
    isAvailable: property.is_available,
    availableCount: 3,
    maxGuests: property.max_guests,
    bedrooms: property.bedrooms,
    beds: property.beds,
    bathrooms: Number(property.bathrooms),
    createdAt: property.created_at,
    updatedAt: property.updated_at,
    // Original backend reference
    _backendProperty: property,
  };
}

/**
 * Adapts an Express backend booking into the frontend booking interface.
 */
type BackendBookingWithDetails = BackendBooking & {
  booking_reference?: string;
  duration_type?: string;
  duration_count?: number;
  start_time?: string;
  end_time?: string;
  base_price?: number | string;
  food_charges?: number | string;
  taxes?: number | string;
  deposit_amount?: number | string;
  payable_now?: number | string;
  balance_remaining?: number | string;
  keyless_code?: string | null;
  room_type?: { id?: string; name?: string; slug?: string; category?: string } | null;
  unit?: { id?: string; identifier?: string; room_number?: string; floor?: number } | null;
};

export function backendBookingToFrontend(booking: BackendBookingWithDetails) {
  const adaptedProperty = booking.property ? backendPropertyToFrontendRoom(booking.property) : null;
  const adaptedRoomType = adaptedProperty
    ? {
        ...adaptedProperty,
        ...(booking.room_type?.id ? { id: booking.room_type.id } : {}),
        ...(booking.room_type?.name ? { name: booking.room_type.name, title: booking.room_type.name } : {}),
        ...(booking.room_type?.slug ? { slug: booking.room_type.slug } : {}),
        ...(booking.room_type?.category ? { category: booking.room_type.category } : {}),
      }
    : null;

  const totalAmount = Number(booking.total_price ?? 0);
  const depositAmount = Number(booking.deposit_amount ?? 0);
  const startTime = booking.start_time || booking.check_in_date;
  const endTime = booking.end_time || booking.check_out_date;

  return {
    id: booking.id,
    bookingReference: booking.booking_reference || booking.id,
    status: String(booking.status || "pending").toUpperCase(),
    paymentStatus: String(booking.payment_status || "unpaid").toUpperCase(),
    durationType: String(booking.duration_type || "MONTHLY").toUpperCase(),
    durationCount: Number(booking.duration_count ?? 1),
    startDate: booking.check_in_date,
    endDate: booking.check_out_date,
    startTime,
    endTime,
    totalNights: booking.total_nights,
    totalPrice: totalAmount,
    totalAmount,
    basePrice: Number(booking.base_price ?? totalAmount),
    foodCharges: Number(booking.food_charges ?? 0),
    taxes: Number(booking.taxes ?? 0),
    depositAmount,
    securityDeposit: depositAmount,
    payableNow: Number(booking.payable_now ?? totalAmount),
    balanceRemaining: Number(booking.balance_remaining ?? 0),
    pricePerNight: Number(booking.price_per_night ?? 0),
    currency: booking.currency || "INR",
    guestsCount: booking.guests_count ?? 1,
    keylessCode: booking.keyless_code || null,
    specialRequests: booking.special_requests,
    cancellationReason: booking.cancellation_reason,
    cancelledAt: booking.cancelled_at,
    createdAt: booking.created_at,
    updatedAt: booking.updated_at,
    roomType: adaptedRoomType,
    property: adaptedProperty,
    inventoryUnit: booking.unit
      ? {
          id: booking.unit.id || "",
          identifier: booking.unit.identifier || booking.unit.room_number || "Assigned Unit",
        }
      : null,
    guest: booking.guest ? backendUserToFrontend(booking.guest) : null,
    payments: booking.payments || [],
    _backendBooking: booking,
  };
}

type BackendPaymentWithBooking = BackendPayment & {
  provider?: string;
  booking?: {
    id?: string;
    booking_reference?: string;
    property_id?: string;
  } | null;
  razorpay_order_id?: string | null;
  razorpay_payment_id?: string | null;
  verified_at?: string | null;
};

export function backendPaymentToFrontend(payment: BackendPaymentWithBooking) {
  const rawStatus = String(payment.status || "created").toLowerCase();
  const normalizedStatus =
    rawStatus === "captured" || rawStatus === "success" || rawStatus === "paid"
      ? "SUCCESS"
      : rawStatus === "failed"
        ? "FAILED"
        : "PENDING";

  return {
    id: payment.id,
    bookingId: payment.booking_id,
    userId: payment.user_id,
    amount: Number(payment.amount ?? 0),
    currency: payment.currency || "INR",
    provider: payment.provider || "RAZORPAY",
    status: normalizedStatus,
    transactionRef:
      payment.razorpay_payment_id || payment.razorpay_order_id || payment.id,
    paidAt: payment.verified_at || null,
    createdAt: payment.created_at,
    booking: payment.booking
      ? {
          id: payment.booking.id || payment.booking_id,
          bookingReference: payment.booking.booking_reference || payment.booking_id,
        }
      : null,
    _backendPayment: payment,
  };
}
