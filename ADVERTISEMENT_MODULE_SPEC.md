# TECHNICAL SPECIFICATION: Advertisement Module for AddMyco Mini App

## Project Context

- **Frontend**: React/Vite-based mini app (Telegram WebApp)
- **Backend**: Existing Node.js API (handles chamber, profile, membership data)
- **Admin Panel**: EJS-based (shares same codebase/database as backend)
- **Payment**: USDT-based (following existing membership purchase pattern)
- **State Management**: Zustand (frontend), PostgreSQL/MongoDB (backend)

---

## SECTION 1: DATABASE SCHEMAS

### 1.1 Advertisement Schema

```javascript
{
  _id: ObjectId,                    // MongoDB/unique identifier
  sponsorId: ObjectId,              // Reference to User collection
  position: String,                 // Enum: "HOME_BANNER" | "BOTTOM_CIRCLE"
  country: String,                  // ISO 3166-1 alpha-2 (e.g., "US", "CN") or "GLOBAL"
  imageUrl: String,                 // CDN/file storage URL (image or thumbnail for video)
  redirectUrl: String,              // Telegram public channel or group URL
                                    // Validation: Must start with "https://t.me/"
  displayCount: Number,             // Total display impressions assigned
  displayUsed: Number,              // Cumulative displays shown so far
  displayRemaining: Number,         // Calculated: displayCount - displayUsed
  status: String,                   // Enum: "DRAFT" | "ACTIVE" | "PAUSED" | "REJECTED" | "COMPLETED"
  approvalStatus: String,           // Enum: "PENDING" | "APPROVED" | "REJECTED" (for admin moderation)
  rejectionReason: String,          // Optional: reason if REJECTED
  viewCount: Number,                // Total unique session views (impressions)
  clickCount: Number,               // Total redirect clicks
  statistics: {
    createdAt: Date,
    firstDisplayedAt: Date,
    lastDisplayedAt: Date,
    ctrPercentage: Number,          // clickCount / viewCount * 100
    averageDisplaysPerDay: Number,
  },
  metadata: {
    fileName: String,               // Original filename (for reference)
    fileSize: Number,               // File size in bytes
    imageDimensions: {
      width: Number,
      height: Number,
    },
    uploadedAt: Date,
  },
  createdAt: Timestamp,
  updatedAt: Timestamp,
  deletedAt: Timestamp,             // Soft delete
}
```

**Indexes**: `sponsorId`, `status`, `country`, `position`, `createdAt`

---

### 1.2 Advertisement Package Schema

```javascript
{
  _id: ObjectId,
  name: String,                     // e.g., "Starter", "Professional", "Enterprise"
  description: String,              // e.g., "Perfect for small businesses"
  displayCredits: Number,           // Credits per package (e.g., 1000 displays = 1 credit)
  priceUSDT: Number,                // Price in USDT (e.g., 50.00)
  positions: [String],              // Array: ["HOME_BANNER"] or ["BOTTOM_CIRCLE"] or both
  duration: Number,                 // Duration in days (optional, can be null for one-time purchase)
  isActive: Boolean,                // Admin can enable/disable packages
  createdAt: Timestamp,
  updatedAt: Timestamp,
}
```

**Example Data**:

```javascript
[
  {
    _id: ObjectId(),
    name: "Home Banner - Starter",
    description: "1000 displays on home page banner",
    displayCredits: 1000,
    priceUSDT: 50.0,
    positions: ["HOME_BANNER"],
    duration: null,
    isActive: true,
  },
  {
    _id: ObjectId(),
    name: "Bottom Circle - Starter",
    description: "1000 displays on bottom navigation icon",
    displayCredits: 1000,
    priceUSDT: 50.0,
    positions: ["BOTTOM_CIRCLE"],
    duration: null,
    isActive: true,
  },
];
```

---

### 1.3 Sponsor Credits Schema

```javascript
{
  _id: ObjectId,
  sponsorId: ObjectId,              // Reference to User collection
  totalCredits: Number,             // Lifetime credits purchased
  usedCredits: Number,              // Credits assigned to ads (cumulatively)
  balanceCredits: Number,           // Calculated: totalCredits - usedCredits
  transactions: [
    {
      transactionId: String,        // USDT blockchain TX ID or internal reference
      packageId: ObjectId,          // Reference to Package purchased
      creditsAdded: Number,
      amountUSDT: Number,
      status: String,               // "COMPLETED" | "PENDING" | "FAILED"
      walletAddress: String,        // User's wallet for USDT transaction
      transactionDate: Date,
    }
  ],
  createdAt: Timestamp,
  updatedAt: Timestamp,
}
```

---

### 1.4 Advertisement Display Log Schema (Optional but recommended)

```javascript
{
  _id: ObjectId,
  advertisementId: ObjectId,        // Reference to Advertisement
  userId: String,                   // Hashed user session ID (for privacy)
  country: String,                  // User's country
  position: String,                 // "HOME_BANNER" or "BOTTOM_CIRCLE"
  displayedAt: Timestamp,
  userClicked: Boolean,
  clickedAt: Timestamp,             // Optional
}
```

---

## SECTION 2: API ENDPOINTS

### 2.1 User-Facing Endpoints (Secured with Bearer Token)

#### GET /api/v1/advertisement/packages

- **Description**: Get all active advertisement packages
- **Auth**: Required (user token)
- **Query Parameters**:
  - `position` (optional): Filter by "HOME_BANNER" or "BOTTOM_CIRCLE"
- **Response**:

```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "name": "Home Banner - Starter",
      "description": "1000 displays on home page",
      "displayCredits": 1000,
      "priceUSDT": 50.0,
      "positions": ["HOME_BANNER"],
      "duration": null,
      "isActive": true
    }
  ]
}
```

---

#### POST /api/v1/advertisement/buy-credits

- **Description**: Initiate USDT payment for credits (following existing membership pattern)
- **Auth**: Required (user token)
- **Body**:

```json
{
  "packageId": "ObjectId",
  "walletAddress": "0x...", // User's USDT wallet
  "amount": 50.0 // In USDT
}
```

- **Response**:

```json
{
  "success": true,
  "data": {
    "transactionId": "TX_...",
    "status": "PENDING",
    "message": "Please send 50 USDT to wallet: ...",
    "paymentAddress": "0x...",
    "amount": 50.0,
    "creditsWillAdd": 1000
  }
}
```

- **Note**: Transaction status checked via webhook or manual admin verification (follow existing membership pattern)

---

#### POST /api/v1/advertisement/verify-payment

- **Description**: Verify USDT payment and add credits to user account
- **Auth**: Required (user token)
- **Body**:

```json
{
  "transactionId": "TX_...",
  "txHash": "0x..." // Blockchain TX hash for verification
}
```

- **Response**:

```json
{
  "success": true,
  "data": {
    "creditsAdded": 1000,
    "newBalance": 2000,
    "message": "Credits added successfully"
  }
}
```

---

#### GET /api/v1/advertisement/my-credits

- **Description**: Get user's current credit balance
- **Auth**: Required (user token)
- **Response**:

```json
{
  "success": true,
  "data": {
    "totalCredits": 2000,
    "usedCredits": 500,
    "balanceCredits": 1500,
    "transactions": [
      {
        "transactionId": "TX_...",
        "creditsAdded": 1000,
        "amountUSDT": 50.0,
        "status": "COMPLETED",
        "transactionDate": "2025-01-15T10:30:00Z"
      }
    ]
  }
}
```

---

#### POST /api/v1/advertisement/create

- **Description**: Create new advertisement
- **Auth**: Required (user token)
- **Body** (multipart/form-data):

```
{
  "sponsorId": "USER_...",           // Optional: sponsor id. If provided it must match authenticated user (cannot create ad for other sponsor via this endpoint)
  "position": "HOME_BANNER",         // "HOME_BANNER" | "BOTTOM_CIRCLE"
  "country": ["GLOBAL","BD"],      // Single string, comma-separated string, or array of strings supported
  "credits": 1,                       // Credits to spend; displayCount is computed as credits * displayCreditRate
  "redirectUrl": "https://t.me/mychannel",  // Telegram public URL only
  "image": <file>                    // Image file (PNG, JPG, WebP)
                                     // Dimensions: 1:1 for BOTTOM_CIRCLE, banner ratio for HOME_BANNER
}
```

- **Response**:

```json
{
  "success": true,
  "data": {
    "_id": "AD_...",
    "sponsorId": "USER_...",
    "position": "HOME_BANNER",
    "country": "GLOBAL",
    "credits": 1,
    "displayCount": 1000,
    "displayUsed": 0,
    "displayRemaining": 1000,
    "status": "ACTIVE",
    "approvalStatus": "APPROVED",
    "imageUrl": "https://cdn.../ad_....png",
    "redirectUrl": "https://t.me/mychannel",
    "createdAt": "2025-01-15T10:30:00Z"
  }
}
```

---

#### GET /api/v1/advertisement/my-ads

- **Description**: Get all ads posted by current user with statistics
- **Auth**: Required (user token)
- **Query Parameters**:
  - `status` (optional): Filter by "ACTIVE", "PAUSED", "COMPLETED", "REJECTED"
  - `position` (optional): Filter by "HOME_BANNER" or "BOTTOM_CIRCLE"
  - `page` (optional): Pagination (default 1)
  - `limit` (optional): Results per page (default 10)
- **Response**:

```json
{
  "success": true,
  "data": [
    {
      "_id": "AD_...",
      "position": "HOME_BANNER",
      "country": "GLOBAL",
      "imageUrl": "https://cdn.../...",
      "redirectUrl": "https://t.me/...",
      "displayCount": 1000,
      "displayUsed": 250,
      "displayRemaining": 750,
      "status": "ACTIVE",
      "viewCount": 250,
      "clickCount": 15,
      "ctrPercentage": 6.0,
      "createdAt": "2025-01-15T10:30:00Z",
      "lastDisplayedAt": "2025-01-20T14:22:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 5
  }
}
```

---

#### PATCH /api/v1/advertisement/:id/pause

- **Description**: Pause an active advertisement
- **Auth**: Required (user token)
- **Response**:

```json
{
  "success": true,
  "data": {
    "_id": "AD_...",
    "status": "PAUSED",
    "message": "Advertisement paused"
  }
}
```

---

#### PATCH /api/v1/advertisement/:id/resume

- **Description**: Resume a paused advertisement
- **Auth**: Required (user token)
- **Response**:

```json
{
  "success": true,
  "data": {
    "_id": "AD_...",
    "status": "ACTIVE",
    "message": "Advertisement resumed"
  }
}
```

---

#### DELETE /api/v1/advertisement/:id

- **Description**: Delete (soft-delete) an advertisement
- **Auth**: Required (user token)
- **Response**:

```json
{
  "success": true,
  "message": "Advertisement deleted"
}
```

---

### 2.2 Public Display Endpoints (No Auth Required)

#### GET /api/v1/advertisement/active?position=HOME_BANNER&country=US

- **Description**: Get active ads for display on mini app (called on app load)
- **Auth**: Optional (uses device fingerprint/session ID for impression tracking)
- **Query Parameters**:
  - `position` (required): "HOME_BANNER" or "BOTTOM_CIRCLE"
  - `country` (optional): User's ISO country code or "GLOBAL" (default: "GLOBAL")
- **Response**:

```json
{
  "success": true,
  "data": [
    {
      "_id": "AD_...",
      "position": "HOME_BANNER",
      "imageUrl": "https://cdn.../...",
      "redirectUrl": "https://t.me/...",
      "displayRemaining": 750
    }
  ],
  "sessionId": "sess_..." // For impression tracking
}
```

- **Logic**:
  - Return 1 ad for HOME_BANNER (per session)
  - Return 1 ad for BOTTOM_CIRCLE (per session)
  - Filter by country (user's country) first; if no ads, return GLOBAL ads
  - Only return ads with `status === "ACTIVE"` and `displayRemaining > 0`

---

#### POST /api/v1/advertisement/:id/track-display

- **Description**: Track an impression (ad shown to user)
- **Auth**: Optional
- **Body**:

```json
{
  "sessionId": "sess_...",
  "country": "US"
}
```

- **Response**:

```json
{
  "success": true,
  "message": "Display tracked"
}
```

- **Backend Logic**:
  - Increment `viewCount` on advertisement
  - Decrement `displayRemaining` by 1
  - Log to Advertisement Display Log
  - If `displayRemaining === 0`, set `status = "COMPLETED"`

---

#### POST /api/v1/advertisement/:id/track-click

- **Description**: Track when user clicks redirect link
- **Auth**: Optional
- **Body**:

```json
{
  "sessionId": "sess_..."
}
```

- **Response**:

```json
{
  "success": true,
  "redirectUrl": "https://t.me/..."
}
```

- **Backend Logic**:
  - Increment `clickCount` on advertisement
  - Log to Display Log with `userClicked = true`

---

### 2.3 Admin Endpoints (Secured with Admin Bearer Token)

#### GET /api/v1/admin/advertisement/packages

- **Description**: List all packages (active & inactive)
- **Auth**: Admin only
- **Response**: Same as user endpoint but includes inactive packages

---

#### POST /api/v1/admin/advertisement/packages

- **Description**: Create new package
- **Auth**: Admin only
- **Body**:

```json
{
  "name": "Premium Home Banner",
  "description": "...",
  "displayCredits": 5000,
  "priceUSDT": 200.0,
  "positions": ["HOME_BANNER"],
  "duration": null,
  "isActive": true
}
```

---

#### PATCH /api/v1/admin/advertisement/packages/:id

- **Description**: Update package
- **Auth**: Admin only

---

#### GET /api/v1/admin/advertisement/all

- **Description**: List all advertisements with sponsor details
- **Auth**: Admin only
- **Query Parameters**:
  - `status` (optional): Filter by status
  - `approvalStatus` (optional): Filter by "PENDING", "APPROVED", "REJECTED"
  - `page` (optional): Pagination
  - `limit` (optional): Results per page
- **Response**:

```json
{
  "success": true,
  "data": [
    {
      "_id": "AD_...",
      "sponsor": {
        "_id": "USER_...",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com",
        "tgid": "@johndoe"
      },
      "position": "HOME_BANNER",
      "country": "GLOBAL",
      "imageUrl": "https://cdn.../...",
      "redirectUrl": "https://t.me/...",
      "displayCount": 1000,
      "displayUsed": 250,
      "displayRemaining": 750,
      "status": "ACTIVE",
      "approvalStatus": "APPROVED",
      "viewCount": 250,
      "clickCount": 15,
      "ctrPercentage": 6.0,
      "createdAt": "2025-01-15T10:30:00Z"
    }
  ],
  "pagination": { ... }
}
```

---

#### PATCH /api/v1/admin/advertisement/:id/approve

- **Description**: Approve a pending advertisement
- **Auth**: Admin only
- **Body**:

```json
{
  "notes": "Approved"
}
```

---

#### PATCH /api/v1/admin/advertisement/:id/reject

- **Description**: Reject an advertisement
- **Auth**: Admin only
- **Body**:

```json
{
  "rejectionReason": "Inappropriate content"
}
```

---

#### GET /api/v1/admin/advertisement/analytics

- **Description**: Get analytics dashboard data
- **Auth**: Admin only
- **Query Parameters**:
  - `startDate` (optional): ISO date
  - `endDate` (optional): ISO date
  - `country` (optional): Filter by country
- **Response**:

```json
{
  "success": true,
  "data": {
    "totalAds": 45,
    "activeAds": 30,
    "completedAds": 12,
    "totalDisplays": 35000,
    "totalClicks": 1200,
    "overallCTR": 3.43,
    "totalRevenueUSDT": 2500.0,
    "topSponsors": [
      {
        "sponsorId": "USER_...",
        "sponsorName": "John Doe",
        "activeAds": 5,
        "totalDisplays": 5000,
        "totalClicks": 200,
        "totalSpent": 250.0
      }
    ],
    "adsByPosition": {
      "HOME_BANNER": { "count": 25, "displays": 20000, "clicks": 700 },
      "BOTTOM_CIRCLE": { "count": 20, "displays": 15000, "clicks": 500 }
    },
    "adsByCountry": [
      { "country": "GLOBAL", "count": 30, "displays": 25000 },
      { "country": "US", "count": 10, "displays": 8000 }
    ]
  }
}
```

---

#### GET /api/v1/admin/sponsor/:sponsorId/details

- **Description**: Get detailed sponsor information with all ads and transaction history
- **Auth**: Admin only
- **Response**:

```json
{
  "success": true,
  "data": {
    "sponsor": {
      "_id": "USER_...",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "tgid": "@johndoe"
    },
    "creditInfo": {
      "totalCredits": 5000,
      "usedCredits": 2000,
      "balanceCredits": 3000
    },
    "advertisements": [
      {
        "_id": "AD_...",
        "position": "HOME_BANNER",
        "status": "ACTIVE",
        "displayCount": 1000,
        "displayUsed": 500,
        "viewCount": 500,
        "clickCount": 30,
        "ctrPercentage": 6.0,
        "createdAt": "2025-01-15T10:30:00Z"
      }
    ],
    "transactions": [
      {
        "transactionId": "TX_...",
        "creditsAdded": 5000,
        "amountUSDT": 250.0,
        "status": "COMPLETED",
        "transactionDate": "2025-01-10T08:00:00Z"
      }
    ]
  }
}
```

---

## SECTION 3: ADMIN PANEL UI CHANGES (EJS-based)

### 3.1 New Admin Menu Item

Add to main admin navigation:

```
📢 Advertisements
├── Dashboard (Analytics)
├── Manage Ads
├── Manage Packages
└── Sponsor Details
```

---

### 3.2 Advertisement Dashboard View

**Route**: `/admin/advertisements` or `/admin/advertisement-dashboard`

**Components**:

1. **KPI Cards** (4 columns):
   - Total Ads Posted
   - Active Ads
   - Total Impressions (displays)
   - Total Revenue (USDT)

2. **Chart 1: Ads by Position** (Pie Chart)
   - HOME_BANNER vs BOTTOM_CIRCLE

3. **Chart 2: Impressions & Clicks Trend** (Line Chart)
   - Last 30 days trend

4. **Chart 3: Top 5 Sponsors by Spend**
   - Table: Sponsor Name, Active Ads, Total Spend, Ads Click Count

5. **Filter Options**:
   - Date Range (From - To)
   - Country dropdown
   - Position dropdown

---

### 3.3 Manage Advertisements View

**Route**: `/admin/advertisements/manage` or `/admin/advertisement-list`

**Table Columns**:
| Column | Description |
|--------|-------------|
| ID | Advertisement ID |
| Sponsor | Sponsor name + Telegram ID |
| Position | HOME_BANNER / BOTTOM_CIRCLE |
| Country | ISO code or GLOBAL |
| Status | ACTIVE / PAUSED / COMPLETED / DRAFT |
| Approval | PENDING / APPROVED / REJECTED |
| Displays | e.g., "500 / 1000" |
| Views | View count |
| Clicks | Click count & CTR% |
| Created | Date created |
| Actions | View | Edit | Approve | Reject | Pause | Delete |

**Filters**:

- Status dropdown
- Approval Status dropdown
- Position dropdown
- Country dropdown
- Date range

**Modal: View Ad Details**

- Full image preview
- All metadata
- Statistics graph (displays vs clicks over time)
- Sponsor contact info
- Edit form (if admin wants to adjust displayCount, etc.)

**Modal: Rejection Reason**

- Textarea for reason
- Auto-notify sponsor via email/Telegram

---

### 3.4 Manage Packages View

**Route**: `/admin/advertisements/packages`

**Table Columns**:
| Column | Description |
|--------|-------------|
| Name | Package name |
| Positions | HOME_BANNER / BOTTOM_CIRCLE |
| Credits | Display credits (e.g., 1000) |
| Price (USDT) | Price |
| Duration | Days or "One-time" |
| Status | Active / Inactive |
| Created | Date |
| Actions | Edit | Delete |

**Create/Edit Form**:

```
- Name (text input)
- Description (textarea)
- Display Credits (number)
- Price in USDT (decimal)
- Positions (checkboxes): HOME_BANNER, BOTTOM_CIRCLE
- Duration (number or null for one-time)
- Active (toggle)
- Submit / Cancel buttons
```

---

### 3.5 Sponsor Details View

**Route**: `/admin/advertisements/sponsor/:sponsorId`

**Sections**:

**1. Sponsor Information** (Card)

```
- Name: John Doe
- Email: john@example.com
- Telegram ID: @johndoe
- Member Type: Premium / Standard
- Member Since: Date
```

**2. Credit Information** (Card)

```
- Total Credits: 5000
- Used Credits: 2000
- Balance: 3000
- [Export CSV] button
```

**3. Transaction History** (Table)
| Trans ID | Credits | Amount (USDT) | Status | Date |
|----------|---------|---------------|--------|------|
| TX_001 | 5000 | 250.00 | COMPLETED | 2025-01-10 |
| TX_002 | 3000 | 150.00 | PENDING | 2025-01-18 |

**4. Advertisements Posted** (Table)
| Ad ID | Position | Country | Status | Displays | Clicks | Created |
|-------|----------|---------|--------|----------|--------|---------|
| AD_1 | HOME_BANNER | GLOBAL | ACTIVE | 500/1000 | 30 | 2025-01-15 |

**5. Actions**:

- View Sponsor's Profile
- Send Message (email)
- Block Sponsor (disable ad posting)

---

## SECTION 4: KEY BUSINESS LOGIC

### 4.1 Credit Deduction

- When user creates ad with `displayCount = 1000` and `displayCredits = 1000` per unit:
  - `SponsorCredits.usedCredits += 1000`
  - `SponsorCredits.balanceCredits -= 1000`
- Cannot create ad if `balanceCredits < credits`

### 4.2 Display Impression Tracking

- Client calls `POST /advertisement/:id/track-display` when ad is rendered
- Backend:
  - Increments `Advertisement.viewCount`
  - Decrements `Advertisement.displayRemaining`
  - If `displayRemaining === 0`, sets `status = "COMPLETED"`
  - Logs session in Display Log table

### 4.3 Ad Selection Logic (GET /api/v1/advertisement/active)

```
1. Get user's country (from IP geolocation or query param)
2. Get active ads by position with status="ACTIVE" and displayRemaining > 0
3. Prioritize by country:
   a. First: ads matching user's country
   b. Second: ads with country="GLOBAL"
4. Randomize selection (round-robin or random)
5. Return 1 ad per position
6. Return sessionId for tracking
```

### 4.4 Ad Approval Workflow

- Default: `approvalStatus = "APPROVED"` (auto-publish)
- Optional: Admin can set `approvalStatus = "PENDING"` for manual review
- If rejected: `approvalStatus = "REJECTED"` + `rejectionReason`
- Only ads with `approvalStatus = "APPROVED"` are displayed

---

## SECTION 5: VALIDATION RULES

### 5.1 Advertisement Validation

| Field          | Rules                                                                      |
| -------------- | -------------------------------------------------------------------------- |
| `position`     | Required; "HOME_BANNER" or "BOTTOM_CIRCLE"                                 |
| `country`      | Required; ISO code or "GLOBAL"                                             |
| `redirectUrl`  | Required; must start with "https://t.me/"                                  |
| `displayCount` | Required; >= 100; <= available balance                                     |
| `image`        | Required; PNG/JPG/WebP; max 5MB; dimensions 1:1 for circle, 3:1 for banner |

### 5.2 Package Validation

| Field            | Rules                           |
| ---------------- | ------------------------------- |
| `name`           | Required; 3-50 chars; unique    |
| `displayCredits` | Required; > 0                   |
| `priceUSDT`      | Required; > 0                   |
| `positions`      | Required; at least one position |

---

## SECTION 6: PAYMENT INTEGRATION (USDT)

### Flow:

1. User selects package (e.g., 1000 credits for 50 USDT)
2. Frontend calls `POST /advertisement/buy-credits` with `packageId` + `walletAddress`
3. Backend returns: paymentAddress + amount + transactionId
4. User sends USDT to paymentAddress (off-chain manual transfer or blockchain)
5. User submits `transactionId` or `txHash` via `POST /advertisement/verify-payment`
6. Backend verifies payment (via blockchain RPC or manual confirmation)
7. If verified: Add credits + update `SponsorCredits` table
8. Return updated balance to frontend

**Note**: Follow existing membership payment pattern for consistency.

---

## SECTION 7: EMAIL/NOTIFICATION INTEGRATIONS

When triggered, send notifications:

1. **Ad Created**: Sponsor receives confirmation + next steps
2. **Ad Approved**: Sponsor notified ad is live
3. **Ad Rejected**: Sponsor notified with rejection reason + appeal option
4. **Ad Completed**: Sponsor notified all displays used + stats summary
5. **Low Balance**: Reminder to buy more credits (when balance < 200)

---

## SECTION 8: TESTING CHECKLIST

- [ ] Create ad with sufficient credits
- [ ] Reject ad creation with insufficient credits
- [ ] Buy credits via USDT (dev testnet)
- [ ] Track impressions correctly
- [ ] Track clicks correctly
- [ ] Ads disappear when displayRemaining = 0
- [ ] Admin approve/reject workflow
- [ ] Country-based ad filtering
- [ ] Package management CRUD
- [ ] Sponsor details view with all transactions
- [ ] Analytics dashboard data accuracy

---

**End of Specification**
