export interface CheckoutValidationInput {
  isAuthenticated: boolean;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  guestsCount: string | number;
  termsAccepted: boolean;
  hasHoldToken: boolean;
  secondsLeft: number;
  hasActiveBooking: boolean;
}

export function validateCheckoutDetails(
  input: CheckoutValidationInput
): string | null {
  if (!input.isAuthenticated) {
    return "Please sign in to complete your booking.";
  }
  if (input.guestName.trim().length < 2 || input.guestName.trim().length > 120) {
    return "Full Legal Name must be between 2 and 120 characters.";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.guestEmail.trim())) {
    return "Please enter a valid email address for your receipt and PIN.";
  }
  if (!/^\+?[0-9\s-]{7,20}$/.test(input.guestPhone.trim())) {
    return "Please enter a valid mobile phone number (7–20 digits).";
  }
  const parsedGuests = Number(input.guestsCount);
  if (!Number.isInteger(parsedGuests) || parsedGuests < 1) {
    return "Guests count must be at least 1.";
  }
  if (!input.termsAccepted) {
    return "Please review and accept the Stayzy Booking Guidelines & Cancellation Terms.";
  }
  if (input.hasHoldToken && input.secondsLeft <= 0 && !input.hasActiveBooking) {
    return "Your 15-minute hold expired. Please go back and re-select your room.";
  }
  return null;
}
