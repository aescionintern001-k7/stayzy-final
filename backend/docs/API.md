# Stayzy Backend API Documentation

Welcome to the Stayzy Backend developer documentation. Stayzy is a modern vacation rental and homestay booking platform built with high security, performance, and maintainability standards.

---

## 1. Technology Stack

- **Runtime**: Node.js 22 (LTS)
- **Framework**: Express 5 (Native ES Modules)
- **Database**: PostgreSQL 17
- **Database Client**: `pg` (node-postgres with connection pooling)
- **Validation**: Zod schema validation
- **Authentication**: JWT (`jsonwebtoken`) with standard Authorization Bearer header
- **Password Security**: `bcrypt` (salted password hashing)
- **Payment Processing**: Razorpay SDK (`razorpay`) with HMAC-SHA256 signature verification
- **API Documentation**: OpenAPI 3.0.3 (`docs/openapi.yaml`) rendered via `swagger-ui-express`
- **Testing Runner**: Node.js built-in test runner (`node --test`) and assertion library (`node:assert/strict`)

---

## 2. Project Architecture

The backend follows a modular domain-driven architecture under `backend/src/`:

```
backend/
├── docs/
│   ├── openapi.yaml                     # OpenAPI 3.0.3 specification
│   ├── stayzy-api.postman_collection.json # Postman collection
│   └── API.md                           # This developer guide
├── src/
│   ├── config/                          # Centralized environment and security config
│   │   ├── cors.js
│   │   ├── env.js
│   │   ├── razorpay.js
│   │   └── security.js
│   ├── database/                        # PostgreSQL connection pool and migrations
│   │   ├── pool.js
│   │   ├── connection.js
│   │   └── migrations/
│   │       ├── 001_create_users.sql
│   │       ├── 002_add_profile_fields_to_users.sql
│   │       ├── 003_create_properties.sql
│   │       ├── 004_add_search_indexes.sql
│   │       ├── 005_create_bookings.sql
│   │       ├── 006_create_payments.sql
│   │       ├── 007_create_reviews.sql
│   │       └── 008_add_admin_moderation.sql
│   ├── middlewares/                     # Express global & route middlewares
│   │   ├── auth.middleware.js           # JWT authentication
│   │   ├── authorize.middleware.js      # Role-based access control (guest/host/admin)
│   │   ├── errorHandler.js              # Centralized error handler & 404 handler
│   │   ├── requestLogger.js             # HTTP request logger
│   │   └── validateRequest.js           # Zod schema validation middleware
│   ├── modules/                         # Domain modules (routes, controllers, services, validators)
│   │   ├── admin/
│   │   ├── auth/
│   │   ├── bookings/
│   │   ├── payments/
│   │   ├── properties/
│   │   ├── reviews/
│   │   └── users/
│   ├── routes/
│   │   └── health.routes.js             # Health check route
│   ├── app.js                           # Express application setup & middleware mounting
│   └── server.js                        # HTTP server listener & graceful shutdown
├── tests/                               # Comprehensive integration & unit tests
│   ├── admin.test.js
│   ├── auth.test.js
│   ├── bookings.test.js
│   ├── integration.test.js
│   ├── payments.test.js
│   ├── properties.test.js
│   ├── reviews.test.js
│   ├── search.test.js
│   └── users.test.js
├── .env.example                         # Environment configuration template
├── package.json
└── README.md
```

---

## 3. Getting Started

### 3.1 Prerequisites
- Node.js >= 22.0.0
- PostgreSQL >= 17.0
- npm >= 10.0.0

### 3.2 Environment Setup
Copy the environment template file:
```bash
cp .env.example .env
```

Configure your `.env` variables:
```env
PORT=5000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_NAME=stayzy_dev
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=super_secure_jwt_secret_key_minimum_32_characters_long
JWT_EXPIRES_IN=1d
RAZORPAY_KEY_ID=rzp_test_stayzykey123
RAZORPAY_KEY_SECRET=rzp_test_secret_stayzy456
RAZORPAY_WEBHOOK_SECRET=rzp_webhook_secret_stayzy789
```

### 3.3 Database Setup and Migrations
Ensure the PostgreSQL database `stayzy_dev` exists, then execute migrations:
```bash
npm run migrate
```

This runs all SQL migrations in `backend/src/database/migrations/` sequentially up to `008_add_admin_moderation.sql`.

### 3.4 Running the Application
To run in development mode with auto-reload:
```bash
npm run dev
```

To run in production mode:
```bash
npm start
```
The server will bind to `http://localhost:5000` by default.

---

## 4. API Documentation

### 4.1 Interactive Swagger UI
The backend serves an interactive OpenAPI 3.0 documentation interface:
- **Swagger UI URL**: [http://localhost:5000/api/docs](http://localhost:5000/api/docs)
- **Raw OpenAPI Spec (JSON)**: [http://localhost:5000/api/docs/spec.json](http://localhost:5000/api/docs/spec.json)
- **OpenAPI Specification File**: `backend/docs/openapi.yaml`

In the Swagger UI, click **Authorize** at the top right, enter your JWT token formatted as `Bearer <token>`, and you can execute authenticated requests directly against the live server.

### 4.2 Postman Collection
A complete Postman collection is available at:
`backend/docs/stayzy-api.postman_collection.json`

**How to use:**
1. Open Postman -> Click **Import** -> Select `backend/docs/stayzy-api.postman_collection.json`.
2. The collection defines two variables:
   - `baseUrl`: default is `http://localhost:5000/api/v1`
   - `token`: set to your JWT token after registering/logging in.
3. Requests automatically include `Authorization: Bearer {{token}}` where required.

---

## 5. Authentication & Role-Based Access Control

Stayzy uses stateless JWT authentication.

### Token Format
Include the token in the `Authorization` HTTP header:
```
Authorization: Bearer <jwt_token>
```

### Roles and Hierarchy
Stayzy supports 3 user roles:
1. `guest`: Standard user who can search properties, create bookings, make payments, and leave reviews for completed stays.
2. `host`: Can create and manage properties, view booking requests for their properties, and perform guest actions.
3. `admin`: Has platform-wide administrative authority. Can inspect all bookings, cancel bookings with refunds, suspend/activate users, moderate property status, manage reviews, and view administrative analytics dashboards.

---

## 6. Standard API Responses

All API endpoints follow a predictable JSON response structure.

### Success Response (`200 OK`, `201 Created`)
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... }
}
```

### Error Response (`400`, `401`, `403`, `404`, `409`, `500`)
```json
{
  "success": false,
  "message": "Human-readable error explanation",
  "errors": [ ... ] // Optional Zod validation error details
}
```

---

## 7. Endpoint Directory

The API base prefix is `/api/v1`.

### 7.1 Authentication (`/api/v1/auth`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/auth/register` | Public | Register a new user (`guest` or `host`) |
| `POST` | `/auth/login` | Public | Authenticate user with email and password |
| `GET` | `/auth/me` | Authenticated | Retrieve profile of the currently logged-in user |

### 7.2 User Management (`/api/v1/users`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/users/me` | Authenticated | Get current authenticated user profile |
| `PATCH` | `/users/me` | Authenticated | Update user profile fields (name, phone, bio, avatar) |
| `GET` | `/users` | Admin | List all registered users with pagination and search |
| `GET` | `/users/:id` | Admin | Get user details by UUID |
| `PATCH` | `/users/:id/status` | Admin | Change user account status (`active` or `suspended`) |

### 7.3 Properties (`/api/v1/properties`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/properties` | Public | List active properties with search and filters |
| `GET` | `/properties/search` | Public | Search properties with filters (`city`, `min_price`, `max_price`, `property_type`, etc.) |
| `POST` | `/properties` | Host / Admin | Create a new property listing |
| `GET` | `/properties/:id` | Public | Get property details by ID (with host profile) |
| `PATCH` | `/properties/:id` | Host (Owner) / Admin | Update property listing details |
| `DELETE` | `/properties/:id` | Host (Owner) / Admin | Archive or delete property listing |
| `GET` | `/properties/my-listings` | Host / Admin | List all listings owned by current host |
| `POST` | `/properties/:id/images` | Host (Owner) / Admin | Add image URLs to a property listing |
| `DELETE` | `/properties/:id/images` | Host (Owner) / Admin | Remove an image from a property listing |
| `PATCH` | `/properties/:id/amenities` | Host (Owner) / Admin | Update property amenities array |
| `PATCH` | `/properties/:id/availability` | Host (Owner) / Admin | Toggle property booking availability |
| `GET` | `/properties/:propertyId/reviews` | Public | Get paginated reviews for a property |

### 7.4 Bookings (`/api/v1/bookings`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/bookings/availability` | Public | Check date availability and calculate pricing |
| `POST` | `/bookings` | Guest | Create a new booking reservation with conflict check |
| `GET` | `/bookings` | Authenticated | List user bookings (Guests view own, Hosts view owned properties) |
| `GET` | `/bookings/property/:propertyId` | Host / Admin | View reservations for a specific property |
| `GET` | `/bookings/:id` | Authenticated | Get booking details (Authorized for guest, host, or admin) |
| `PATCH` | `/bookings/:id/cancel` | Authenticated | Cancel a booking (enforces status and cancellation rules) |
| `PATCH` | `/bookings/:id/status` | Host / Admin | Update booking status (`confirmed`, `completed`, `cancelled`) |

### 7.5 Payments (`/api/v1/payments`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/payments/create-order` | Guest | Initiate Razorpay order for confirmed/pending booking |
| `POST` | `/payments/verify` | Guest | Verify Razorpay payment signature and capture payment |
| `POST` | `/payments/fail` | Guest | Record payment failure safely |
| `POST` | `/payments/:id/refund` | Host / Admin | Initiate a full or partial refund for a captured payment |
| `GET` | `/payments/my` | Guest | View paginated payment transactions for current user |
| `GET` | `/payments/booking/:bookingId` | Authenticated | Get payment records associated with a booking |
| `GET` | `/payments/:id` | Authenticated | Get single payment details by UUID |
| `POST` | `/payments/webhook` | Public | Razorpay webhook endpoint for async event handling |

### 7.6 Reviews & Ratings (`/api/v1/reviews`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/reviews` | Guest | Submit review for a completed stay (recalculates property rating) |
| `GET` | `/reviews/property/:propertyId` | Public | List all reviews for a property with rating distribution |
| `GET` | `/reviews/my` | Guest | Get reviews written by the current user |
| `GET` | `/reviews/:id` | Public | Get single review by ID |
| `PATCH` | `/reviews/:id` | Guest (Author) | Update an existing review and recalibrate rating |
| `DELETE` | `/reviews/:id` | Guest (Author) / Admin | Delete review and recalibrate property rating |

### 7.7 Admin & Management (`/api/v1/admin`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/admin/dashboard` | Admin | Aggregate dashboard metrics (users, bookings, GMV, ratings) |
| `GET` | `/admin/properties` | Admin | List all properties including inactive/suspended listings |
| `PATCH` | `/admin/properties/:id/status` | Admin | Update property moderation status |
| `GET` | `/admin/bookings` | Admin | List platform bookings with date and status filters |
| `PATCH` | `/admin/bookings/:id/status` | Admin | Update booking status with moderation |
| `PATCH` | `/admin/bookings/:id/cancel` | Admin | Force cancel a booking with optional refund |
| `GET` | `/admin/payments` | Admin | List platform transactions with filters |
| `GET` | `/admin/revenue` | Admin | Generate financial revenue and refund reports |
| `GET` | `/admin/reviews` | Admin | List platform reviews with moderation filters |
| `DELETE` | `/admin/reviews/:id` | Admin | Moderation deletion of review with recalculation |

### 7.8 Health & System
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/health` | Public | Service health status check and database connectivity |

---

## 8. Automated Testing

The Stayzy test suite uses the Node.js native test runner (`node --test`) without third-party test runners, ensuring fast, deterministic, and dependency-light testing.

### Running All Tests
```bash
npm test
```

### Running Specific Test Files
```bash
node --test tests/auth.test.js
node --test tests/properties.test.js
node --test tests/search.test.js
node --test tests/bookings.test.js
node --test tests/payments.test.js
node --test tests/reviews.test.js
node --test tests/admin.test.js
node --test tests/users.test.js
node --test tests/integration.test.js
```

### Test Standards
- **Zero Mocking of Database Queries**: All integration tests execute against the PostgreSQL database instance.
- **Deterministic Teardown**: Each test suite cleans up its created entities in `beforeEach` or `afterEach` hooks using foreign key safe deletion orders.
- **Role Verification**: Middleware tests verify `401 Unauthorized` on missing tokens and `403 Forbidden` on role mismatches.
- **Validation Verification**: Zod schema constraints (invalid emails, missing required fields, out-of-range ratings, negative prices) are tested against boundary conditions.
