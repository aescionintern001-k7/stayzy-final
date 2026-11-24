# Stayzy API Integration Contract

**Specification Version**: 1.0.0  
**Backend Base URL**: `http://localhost:5000/api/v1`  
**Standard Response Shape**:
```json
{
  "success": true,
  "message": "Human readable message",
  "data": {}
}
```
**Standard Error Shape**:
```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "field_name",
      "message": "Specific validation failure message"
    }
  ]
}
```

---

## 1. Authentication & Session Endpoints

### 1.1 Register User
- **Method**: `POST`
- **Endpoint**: `/auth/register`
- **Auth Required**: No
- **Request Body**:
  ```json
  {
    "full_name": "John Doe",
    "email": "john@example.com",
    "password": "Password123!",
    "role": "guest" // "guest" | "host" (Frontend maps "CUSTOMER" -> "guest", "OWNER" -> "host")
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Registration successful",
    "data": {
      "user": {
        "id": "uuid",
        "full_name": "John Doe",
        "email": "john@example.com",
        "role": "guest",
        "account_status": "active"
      },
      "token": "jwt_token_string"
    }
  }
  ```
- **Frontend Consumer**: `/register`, `api.auth.register`

### 1.2 Login User
- **Method**: `POST`
- **Endpoint**: `/auth/login`
- **Auth Required**: No
- **Request Body**:
  ```json
  {
    "email": "john@example.com",
    "password": "Password123!"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Login successful",
    "data": {
      "user": {
        "id": "uuid",
        "full_name": "John Doe",
        "email": "john@example.com",
        "role": "guest",
        "account_status": "active"
      },
      "token": "jwt_token_string"
    }
  }
  ```
- **Frontend Consumer**: `/login`, `api.auth.login`

### 1.3 Current User Info
- **Method**: `GET`
- **Endpoint**: `/auth/me`
- **Auth Required**: Yes (`Bearer <token>`)
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "uuid",
        "full_name": "John Doe",
        "email": "john@example.com",
        "role": "guest",
        "account_status": "active",
        "phone": "+919876543210"
      }
    }
  }
  ```
- **Frontend Consumer**: `/api/auth/me`, navigation bar, authentication context

---

## 2. Properties & Room Catalog Endpoints

### 2.1 List / Search Properties
- **Method**: `GET`
- **Endpoint**: `/properties` & `/properties/search`
- **Auth Required**: No
- **Query Parameters**:
  - `city` (string)
  - `locality` (string)
  - `property_type` (string: apartment, house, villa, etc.)
  - `room_type` (string: entire_place, private_room, shared_room)
  - `min_price` (number)
  - `max_price` (number)
  - `page` (number, default: 1)
  - `limit` (number, default: 10)
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "properties": [
        {
          "id": "uuid",
          "title": "Stayzy Haven Koramangala",
          "description": "Cozy co-living space",
          "property_type": "apartment",
          "room_type": "private_room",
          "price_per_night": 1200.00,
          "city": "Bengaluru",
          "address": "5th Block, Koramangala",
          "amenities": ["WiFi", "AC", "Power Backup", "Housekeeping"],
          "images": ["/images/rooms/private-room-main.webp"],
          "average_rating": 4.8,
          "reviews_count": 12
        }
      ],
      "pagination": {
        "total": 1,
        "page": 1,
        "limit": 10,
        "total_pages": 1
      }
    }
  }
  ```
- **Frontend Consumer**: `/rooms`, `/explore`, `RoomCatalog.tsx`

### 2.2 Property Details
- **Method**: `GET`
- **Endpoint**: `/properties/:id`
- **Auth Required**: No
- **Response (200 OK)**: Returns complete property metadata and associated room types / rate plans.
- **Frontend Consumer**: `/rooms/[slug]`, `RoomDetailsClient.tsx`

---

## 3. Booking Lifecycle Endpoints

### 3.1 Create Booking
- **Method**: `POST`
- **Endpoint**: `/bookings`
- **Auth Required**: Yes (`Bearer <token>`)
- **Request Body**:
  ```json
  {
    "property_id": "uuid",
    "room_type_id": "uuid", // Optional if property booking
    "check_in_date": "2026-12-01",
    "check_out_date": "2026-12-05",
    "guests_count": 1,
    "special_requests": "Late check-in requested",
    "duration_type": "DAILY",
    "duration_count": 4
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Booking created successfully",
    "data": {
      "booking": {
        "id": "uuid",
        "property_id": "uuid",
        "guest_id": "uuid",
        "check_in_date": "2026-12-01",
        "check_out_date": "2026-12-05",
        "total_nights": 4,
        "price_per_night": 1200.00,
        "total_price": 4800.00,
        "status": "confirmed",
        "payment_status": "unpaid"
      }
    }
  }
  ```

### 3.2 Guest Booking History
- **Method**: `GET`
- **Endpoint**: `/bookings/guest/my-bookings`
- **Auth Required**: Yes
- **Frontend Consumer**: `/my-bookings`, `MyBookingsClient.tsx`

### 3.3 Cancel Booking
- **Method**: `PATCH`
- **Endpoint**: `/bookings/:id/cancel`
- **Auth Required**: Yes
- **Request Body**:
  ```json
  {
    "cancellation_reason": "Change of travel plans"
  }
  ```
- **Frontend Consumer**: `/my-bookings`, `/dashboard/bookings/[id]`

---

## 4. Payment Endpoints

### 4.1 Create Razorpay Order
- **Method**: `POST`
- **Endpoint**: `/payments/orders`
- **Auth Required**: Yes
- **Request Body**:
  ```json
  {
    "booking_id": "uuid"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "success": true,
    "data": {
      "order_id": "order_xyz123",
      "amount": 480000,
      "currency": "INR",
      "key_id": "rzp_test_stayzykey123"
    }
  }
  ```

### 4.2 Verify Razorpay Signature
- **Method**: `POST`
- **Endpoint**: `/payments/verify`
- **Auth Required**: Yes
- **Request Body**:
  ```json
  {
    "razorpay_order_id": "order_xyz123",
    "razorpay_payment_id": "pay_abc456",
    "razorpay_signature": "hmac_sha256_hash"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Payment verified and booking confirmed",
    "data": {
      "payment_id": "uuid",
      "booking_id": "uuid",
      "status": "captured"
    }
  }
  ```

---

## 5. Reviews Endpoints

### 5.1 Submit Review
- **Method**: `POST`
- **Endpoint**: `/reviews`
- **Auth Required**: Yes
- **Request Body**:
  ```json
  {
    "booking_id": "uuid",
    "rating": 5,
    "title": "Clean, calm and convenient stay",
    "comment": "Had a wonderful experience with great internet and comfortable workspace."
  }
  ```

### 5.2 Property Reviews
- **Method**: `GET`
- **Endpoint**: `/reviews/property/:propertyId`
- **Auth Required**: No

---

## 6. Admin Endpoints

- `GET /admin/dashboard`: Metrics, active counts, revenue aggregates.
- `GET /admin/properties`: Moderation queue with status filters.
- `PATCH /admin/properties/:id/status`: Approve or suspend property listing.
- `GET /admin/bookings`: System-wide booking records.
- `GET /admin/payments`: Transaction history and refund monitoring.
- `GET /admin/reviews`: Review moderation.
