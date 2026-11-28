/**
 * Fail-closed demo eligibility helpers for checkout UI isolation.
 * Never infers demo status from property title, description, URL, or ID.
 */

export interface CheckoutRoomDemoShape {
  isDemo?: unknown;
  _backendProperty?: {
    is_demo?: unknown;
  } | null;
}

export function isDemoPropertyEligible(
  room: CheckoutRoomDemoShape | null | undefined,
  isLoading = false
): boolean {
  if (isLoading || !room) {
    return false;
  }
  return room.isDemo === true || room._backendProperty?.is_demo === true;
}

export function shouldOpenDemoSimulatorModal(
  room: CheckoutRoomDemoShape | null | undefined,
  isLoading = false
): boolean {
  return isDemoPropertyEligible(room, isLoading);
}
