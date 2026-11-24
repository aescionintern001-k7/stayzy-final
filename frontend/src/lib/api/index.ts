/**
 * Stayzy Centralized API Layer
 * Direct, typed HTTP client integration with Stayzy Express Backend (/api/v1)
 */

export * from './types';
export * from './client';
export * from './adapters';
export * from './auth';
export * from './users';
export * from './properties';
export * from './bookings';
export * from './payments';
export * from './reviews';
export * from './admin';

import { authApi } from './auth';
import { usersApi } from './users';
import { propertiesApi } from './properties';
import { bookingsApi } from './bookings';
import { paymentsApi } from './payments';
import { reviewsApi } from './reviews';
import { adminApi } from './admin';

export const stayzyApi = {
  auth: authApi,
  users: usersApi,
  properties: propertiesApi,
  bookings: bookingsApi,
  payments: paymentsApi,
  reviews: reviewsApi,
  admin: adminApi,
};

export default stayzyApi;

