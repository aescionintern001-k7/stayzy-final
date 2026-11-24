import {
  BackendRole,
  FrontendRole,
  BackendUser,
  BackendProperty,
  BackendBooking,
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
export function backendBookingToFrontend(booking: BackendBooking) {
  return {
    id: booking.id,
    status: booking.status.toUpperCase(),
    paymentStatus: booking.payment_status.toUpperCase(),
    startDate: booking.check_in_date,
    endDate: booking.check_out_date,
    totalNights: booking.total_nights,
    totalPrice: Number(booking.total_price),
    pricePerNight: Number(booking.price_per_night),
    currency: booking.currency,
    guestsCount: booking.guests_count,
    specialRequests: booking.special_requests,
    cancellationReason: booking.cancellation_reason,
    cancelledAt: booking.cancelled_at,
    createdAt: booking.created_at,
    updatedAt: booking.updated_at,
    roomType: booking.property ? backendPropertyToFrontendRoom(booking.property) : null,
    property: booking.property ? backendPropertyToFrontendRoom(booking.property) : null,
    guest: booking.guest ? backendUserToFrontend(booking.guest) : null,
    payments: booking.payments || [],
    _backendBooking: booking,
  };
}
