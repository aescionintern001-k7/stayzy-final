# Stayzy Security Audit & Architecture Assessment

**Author**: Senior Full-Stack Security & Integration Engineer  
**Date**: November 2026  
**Status**: APPROVED & COMPLIANT  
**Target Systems**: Next.js 16 Frontend (`D:\Stayzy-Backend\frontend`) & Express 5 Backend (`D:\Stayzy-Backend\backend`)

---

## 1. Executive Summary

This security audit reviews the security posture, authentication flows, authorization controls, data integrity mechanisms, and payment processing security across the integrated Stayzy platform.

Following the integration and migration to PostgreSQL 17 as the authoritative source of truth, all critical business vulnerabilities identified during the audit (such as client-side price spoofing, unverified payment completion, duplicate local databases, and unauthenticated administrative routes) have been eliminated.

---

## 2. Authentication & Session Management

### 2.1 Password Hashing
- **Algorithm**: `bcrypt` with adaptive salt rounds (minimum work factor = 10).
- **Implementation**: Handled exclusively on the backend in `backend/src/modules/auth/auth.service.js`. Passwords are never logged or stored in plain text.
- **Verification**: Constant-time comparison via `bcrypt.compare()` prevents timing attacks during authentication.

### 2.2 Token Architecture
- **Format**: JSON Web Tokens (JWT) signed with HMAC-SHA256 (`HS256`).
- **Signature Security**: Protected by `JWT_SECRET` stored strictly in server-side environment variables.
- **Dual Transport**:
  1. **HTTP-Only Cookies**: JWTs are issued via `Set-Cookie` with `httpOnly: true`, `sameSite: 'lax'` (or `'strict'` in production), and `secure: true` (in production). This eliminates XSS-based token theft.
  2. **Bearer Token Authorization**: Supported for API clients and server-to-server calls via the `Authorization: Bearer <token>` header.
- **Expiry**: Default expiration set to 7 days (`JWT_EXPIRES_IN`), with immediate session revocation on logout via cookie clearance.

---

## 3. Role-Based Access Control (RBAC)

The application implements a zero-trust, defense-in-depth role enforcement layer via `backend/src/middleware/rbac.js`.

### 3.1 Role Hierarchy & Permissions

| Role | Permitted Actions | Restricted Actions |
| :--- | :--- | :--- |
| **resident** (User) | Search properties, create bookings, process payments for own bookings, write reviews for completed stays, manage own profile | Access other users' bookings, modify property details, view admin analytics |
| **host** | All resident capabilities + create/update own properties, manage room types & rate plans, view bookings for own properties | Modify other hosts' listings, approve host verification, manage platform fees |
| **admin** | Full platform access: view system dashboard, audit logs, verify hosts, dispute resolution, refund overrides | N/A |

### 3.2 Authorization Middleware Verification
- Every protected route is guarded by both `authenticate` (validates JWT and attaches `req.user`) and `authorize(...roles)`.
- Resource ownership validation is enforced in controllers/services: users cannot view or modify bookings or payments belonging to other user accounts.

---

## 4. Financial & Payment Lifecycle Security

### 4.1 Authoritative Pricing Calculation
- **Elimination of Client-Side Price Spoofing**: The frontend client **never** passes the booking price or total amount to the booking creation API.
- The backend independently calculates total pricing based on authoritative rate plans stored in PostgreSQL:
  $$\text{Total Price} = (\text{Rate Plan Price} \times \text{Nights}) + \text{Taxes} + \text{Cleaning Fee}$$
- The calculated total is stored immutably in PostgreSQL before a payment order is initiated.

### 4.2 Razorpay Order & Webhook / Signature Verification
- **Order Generation**: Razorpay orders are generated server-side using authenticated API keys (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`).
- **HMAC-SHA256 Signature Verification**:
  ```javascript
  const expectedSignature = crypto
    .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');
  ```
- **Constant-Time Verification**: Verification uses `crypto.timingSafeEqual()` to mitigate timing side-channel attacks.
- **Payment State Machine**: Bookings transition from `unpaid` $\rightarrow$ `paid` exclusively upon verified cryptographic signature confirmation.

---

## 5. Input Validation & Data Sanitization

- **Zod Schema Validation**: All request bodies, query parameters, and URL path variables are validated against strict Zod schemas before reaching business services.
- **SQL Injection Prevention**: All database interactions in `pg` use parameterized queries ($1, $2, etc.). Dynamic string concatenation in SQL queries is strictly prohibited.
- **CORS Configuration**: Restricted to authorized origins (`http://localhost:3000` in dev, verified domain in production) with explicit methods (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`) and headers.
- **Rate Limiting**: Configured using `express-rate-limit` to mitigate brute-force authentication attacks and API denial of service.

---

## 6. Security Checklist & Compliance Summary

- [x] Passwords hashed with `bcrypt` (work factor 10)
- [x] Secrets stored exclusively in `.env`, not committed to Git
- [x] `.gitignore` verified to exclude `.env`, `.env.local`, and sensitive credential dumps
- [x] JWT tokens transported via `HttpOnly` cookies and Bearer headers
- [x] Role-Based Access Control verified across resident, host, and admin endpoints
- [x] SQL queries 100% parameterized with zero concatenation
- [x] Financial amounts calculated server-side from PostgreSQL single source of truth
- [x] Cryptographic payment signature verification with timing-safe comparison
- [x] Error messages sanitize internal stack traces in production mode (`NODE_ENV=production`)
- [x] Security headers enabled via `helmet` middleware
