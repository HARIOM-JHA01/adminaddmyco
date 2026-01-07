# Advertisement API Documentation (Updated)

Base URL: `/api/v1`

**Payment Flow Update**: Credits are now purchased via a 2-step process:

1. User submits transaction ID and wallet address
2. Admin approves or rejects the payment
3. Credits are added upon approval

---

## Table of Contents

1. [User Endpoints](#user-endpoints)
2. [Public Endpoints](#public-endpoints)
3. [Admin Endpoints](#admin-endpoints)

---

## User Endpoints

All user endpoints require authentication via `isUser` middleware.

### Get Active Packages

**GET** `/advertisement/packages`

Get all active advertisement packages, optionally filtered by position.

**Query Parameters:**

- `position` (optional): Filter packages by position (e.g., `HOME_BANNER`, `BOTTOM_CIRCLE`)

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "_id": "package_id",
      "name": "Premium Package",
      "description": "Description text",
      "displayCredits": 1000,
      "priceUSDT": 50,
      "positions": ["HOME_BANNER"],
      "duration": null,
      "isActive": true,
      "createdAt": "2026-01-06T10:00:00Z"
    }
  ]
}
```

---

### Buy Credits (Submit Payment Request)

**POST** `/advertisement/buy-credits`

Submit a credit purchase request with transaction ID and wallet address. Admin must approve before credits are added.

**Headers:**

- `Authorization`: Required (User token)
- `Content-Type`: application/json

**Request Body:**

```json
{
  "packageId": "package_id",
  "transactionId": "tx_abc123def456",
  "walletAddress": "0x1234567890abcdef"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Payment submitted successfully. Waiting for admin approval.",
  "data": {
    "paymentId": "payment_id",
    "transactionId": "tx_abc123def456",
    "amount": 50,
    "credits": 1000,
    "status": "PENDING",
    "walletAddress": "0x1234567890abcdef"
  }
}
```

**Status Codes:**

- `201`: Payment request submitted
- `400`: Invalid request or duplicate transaction
- `401`: Unauthorized
- `404`: Package not found
- `500`: Server error

---

### Get Payment History

**GET** `/advertisement/payment-history`

Get user's credit payment history and status.

**Headers:**

- `Authorization`: Required (User token)

**Query Parameters:**

- `status` (optional): Filter by status (0: pending, 1: approved, 2: rejected)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 10)

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "_id": "payment_id",
      "user": "user_id",
      "package": {
        "_id": "package_id",
        "name": "Premium Package",
        "displayCredits": 1000,
        "priceUSDT": 50
      },
      "transactionId": "tx_abc123def456",
      "walletAddress": "0x1234567890abcdef",
      "amount": 50,
      "credits": 1000,
      "status": 0,
      "approvalNotes": null,
      "rejectionReason": null,
      "createdAt": "2026-01-06T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 5,
    "pages": 1
  }
}
```

**Status Codes:**

- `200`: Success
- `401`: Unauthorized
- `500`: Server error

---

### Get User's Credit Balance

**GET** `/advertisement/my-credits`

Get the current user's advertisement credit balance.

**Headers:**

- `Authorization`: Required (User token)

**Response:**

```json
{
  "success": true,
  "data": {
    "_id": "credits_id",
    "userId": "user_id",
    "totalCredits": 5000,
    "usedCredits": 1200,
    "availableCredits": 3800,
    "createdAt": "2026-01-06T10:00:00Z"
  }
}
```

**Status Codes:**

- `200`: Success
- `401`: Unauthorized
- `500`: Server error

---

### Create New Advertisement

**POST** `/advertisement/create`

Create a new advertisement.

**Headers:**

- `Authorization`: Required (User token)
- `Content-Type`: application/json

**Request Body:**

```json
{
  "title": "Product Advertisement",
  "description": "Long description of the ad",
  "position": "HOME_BANNER",
  "country": "US",
  "credits": 100,
  "targetUrl": "https://example.com",
  "imageUrl": "https://cdn.example.com/image.jpg",
  "startDate": "2026-01-07T00:00:00Z",
  "endDate": "2026-02-07T00:00:00Z"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "_id": "ad_id",
    "sponsorId": "user_id",
    "title": "Product Advertisement",
    "status": "pending",
    "approvalStatus": "pending",
    "createdAt": "2026-01-06T10:00:00Z"
  }
}
```

---

### Get User's Advertisements

**GET** `/advertisement/my-ads`

Get all advertisements created by the current user.

**Headers:**

- `Authorization`: Required (User token)

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "_id": "ad_id",
      "title": "Product Advertisement",
      "status": "active",
      "approvalStatus": "approved",
      "credits": 100,
      "impressions": 1234,
      "clicks": 45,
      "createdAt": "2026-01-06T10:00:00Z"
    }
  ]
}
```

---

### Pause Advertisement

**PATCH** `/advertisement/:id/pause`

Pause an active advertisement.

**Headers:**

- `Authorization`: Required (User token)

---

### Resume Advertisement

**PATCH** `/advertisement/:id/resume`

Resume a paused advertisement.

**Headers:**

- `Authorization`: Required (User token)

---

### Delete Advertisement

**DELETE** `/advertisement/:id`

Delete an advertisement.

**Headers:**

- `Authorization`: Required (User token)

---

## Public Endpoints

No authentication required for these endpoints.

### Get Active Advertisements

**GET** `/advertisement/active`

Get all active advertisements for display on the platform.

**Query Parameters:**

- `position` (optional): Filter by position
- `country` (optional): Filter by country
- `limit` (optional): Number of ads to return (default: 10)

---

### Track Advertisement Display/Impression

**POST** `/advertisement/:id/track-display`

Track when an advertisement is displayed to a user.

**URL Parameters:**

- `id` (required): Advertisement ID

---

### Track Advertisement Click

**POST** `/advertisement/:id/track-click`

Track when a user clicks on an advertisement.

**URL Parameters:**

- `id` (required): Advertisement ID

---

## Admin Endpoints

All admin endpoints require authentication via `isAdmin` middleware.

### Get All Packages

**GET** `/admin/advertisement/packages`

Get all advertisement packages (active and inactive).

**Headers:**

- `Authorization`: Required (Admin token)

---

### Get Single Package

**GET** `/admin/advertisement/packages/:id`

Get details of a specific advertisement package.

**Headers:**

- `Authorization`: Required (Admin token)

---

### Create Package

**POST** `/admin/advertisement/packages`

Create a new advertisement package.

**Headers:**

- `Authorization`: Required (Admin token)
- `Content-Type`: application/json

**Request Body:**

```json
{
  "name": "Premium Package",
  "description": "Premium advertisement package",
  "displayCredits": 1000,
  "priceUSDT": 50,
  "positions": ["HOME_BANNER"],
  "duration": null,
  "isActive": true
}
```

---

### Update Package

**PATCH** `/admin/advertisement/packages/:id`

Update an existing advertisement package.

**Headers:**

- `Authorization`: Required (Admin token)
- `Content-Type`: application/json

---

### Toggle Package Active Status

**PATCH** `/admin/advertisement/packages/:id/toggle`

Toggle the active/inactive status of a package.

**Headers:**

- `Authorization`: Required (Admin token)

---

### Delete Package

**DELETE** `/admin/advertisement/packages/:id`

Delete an advertisement package.

**Headers:**

- `Authorization`: Required (Admin token)

---

### Get All Advertisements

**GET** `/admin/advertisement/all`

Get all advertisements with optional filters.

**Headers:**

- `Authorization`: Required (Admin token)

**Query Parameters:**

- `status` (optional): Filter by status
- `approvalStatus` (optional): Filter by approval status
- `position` (optional): Filter by position
- `country` (optional): Filter by country
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 10)

---

### Approve Advertisement

**PATCH** `/admin/advertisement/:id/approve`

Approve a pending advertisement.

**Headers:**

- `Authorization`: Required (Admin token)
- `Content-Type`: application/json

**Request Body:**

```json
{
  "notes": "Approved - meets all requirements"
}
```

---

### Reject Advertisement

**PATCH** `/admin/advertisement/:id/reject`

Reject a pending advertisement.

**Headers:**

- `Authorization`: Required (Admin token)
- `Content-Type`: application/json

**Request Body:**

```json
{
  "reason": "Does not meet platform guidelines",
  "notes": "Contains inappropriate content"
}
```

---

### Get Analytics

**GET** `/admin/advertisement/analytics`

Get advertisement analytics and statistics.

**Headers:**

- `Authorization`: Required (Admin token)

---

### Get All Credit Payment Requests ⭐ NEW

**GET** `/admin/advertisement/credit-payments`

Get all pending, approved, and rejected credit payment requests from users.

**Headers:**

- `Authorization`: Required (Admin token)
- `Content-Type`: application/json

**Query Parameters:**

- `status` (optional): Filter by status (0: pending, 1: approved, 2: rejected)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 10)

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "_id": "payment_id",
      "user": {
        "_id": "user_id",
        "firstname": "John",
        "lastname": "Doe",
        "email": "john@example.com",
        "tgid": "telegram_id"
      },
      "package": {
        "_id": "package_id",
        "name": "Premium Package",
        "displayCredits": 1000,
        "priceUSDT": 50
      },
      "transactionId": "tx_abc123def456",
      "walletAddress": "0x1234567890abcdef",
      "amount": 50,
      "credits": 1000,
      "status": 0,
      "statusLabel": "Pending",
      "approvalNotes": null,
      "rejectionReason": null,
      "createdAt": "2026-01-06T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 15,
    "pages": 2
  }
}
```

**Status Codes:**

- `200`: Success
- `401`: Unauthorized
- `500`: Server error

---

### Approve Credit Payment ⭐ NEW

**PATCH** `/admin/advertisement/credit-payments/:id/approve`

Approve a pending credit payment request. Credits will be immediately added to the user's account.

**Headers:**

- `Authorization`: Required (Admin token)
- `Content-Type`: application/json

**URL Parameters:**

- `id` (required): Payment request ID

**Request Body:**

```json
{
  "notes": "Transaction verified successfully"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Payment approved successfully",
  "data": {
    "_id": "payment_id",
    "user": "user_id",
    "status": 1,
    "approvalNotes": "Transaction verified successfully",
    "approvedBy": "admin_id",
    "approvedAt": "2026-01-06T11:00:00Z"
  }
}
```

**What happens on approval:**

1. Payment status is updated to `1` (approved)
2. User's credits are updated with purchased credits
3. Transaction is recorded in user's credit history
4. Email notification is sent to the user

**Status Codes:**

- `200`: Payment approved
- `400`: Payment already processed
- `404`: Payment not found
- `401`: Unauthorized
- `500`: Server error

---

### Reject Credit Payment ⭐ NEW

**PATCH** `/admin/advertisement/credit-payments/:id/reject`

Reject a pending credit payment request. User will be notified of rejection.

**Headers:**

- `Authorization`: Required (Admin token)
- `Content-Type`: application/json

**URL Parameters:**

- `id` (required): Payment request ID

**Request Body:**

```json
{
  "reason": "Transaction ID not found on blockchain"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Payment rejected successfully",
  "data": {
    "_id": "payment_id",
    "user": "user_id",
    "status": 2,
    "rejectionReason": "Transaction ID not found on blockchain",
    "approvedBy": "admin_id",
    "approvedAt": "2026-01-06T11:00:00Z"
  }
}
```

**What happens on rejection:**

1. Payment status is updated to `2` (rejected)
2. Rejection reason is recorded
3. Email notification is sent to the user with rejection reason
4. Credits are NOT added to user's account

**Status Codes:**

- `200`: Payment rejected
- `400`: Reason required or payment already processed
- `404`: Payment not found
- `401`: Unauthorized
- `500`: Server error

---

### Get Sponsor Details

**GET** `/admin/sponsor/:sponsorId/details`

Get detailed information about a sponsor/user including credit information and advertisements.

**Headers:**

- `Authorization`: Required (Admin token)

**URL Parameters:**

- `sponsorId` (required): User/Sponsor ID

---

## Payment Status Codes

| Code | Status   | Meaning                           |
| ---- | -------- | --------------------------------- |
| 0    | Pending  | Waiting for admin approval        |
| 1    | Approved | Payment approved, credits added   |
| 2    | Rejected | Payment rejected, reason provided |

---

## Position Types

Valid position types for advertisements:

- `HOME_BANNER` - Home page banner advertisement
- `BOTTOM_CIRCLE` - Bottom circular advertisement
- `SIDEBAR` - Sidebar advertisement
- `FOOTER` - Footer advertisement

---

## Payment Flow Diagram

```
User submits payment request
    ↓
POST /api/v1/advertisement/buy-credits
    ↓
AdvertisementCreditPayment created (status: pending)
    ↓
Admin reviews pending payments
    ↓
GET /api/v1/admin/advertisement/credit-payments
    ↓
Admin approves or rejects
    ↓
IF APPROVED:
  - PATCH /api/v1/admin/advertisement/credit-payments/:id/approve
  - Credits added to SponsorCredits
  - Email sent to user
  ↓
IF REJECTED:
  - PATCH /api/v1/admin/advertisement/credit-payments/:id/reject
  - Rejection reason recorded
  - Email sent to user
  ↓
User can check payment history
  ↓
GET /api/v1/advertisement/payment-history
```

---

## Error Responses

All endpoints follow a consistent error response format:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message (optional)",
  "errors": {
    "fieldName": "Validation error message"
  }
}
```

---

## Database Models

### AdvertisementCreditPayment Schema

```
{
  user: ObjectId (ref: User),
  telegram_id: String,
  amount: Number (USDT),
  credits: Number,
  package: ObjectId (ref: AdvertisementPackage),
  transactionId: String (unique),
  walletAddress: String,
  status: Number (0: pending, 1: approved, 2: rejected),
  approvalNotes: String,
  rejectionReason: String,
  approvedBy: ObjectId (ref: Admin),
  approvedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

---

## Authentication

Authentication is handled via middleware:

- **User Authentication**: `isUser` middleware - Required for user endpoints
- **Admin Authentication**: `isAdmin` middleware - Required for admin endpoints

Include the authentication token in the `Authorization` header:

```
Authorization: Bearer <token>
```

---

## Last Updated

January 6, 2026 - Updated with new payment approval flow
