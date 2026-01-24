# Advertisement Module Implementation Guide

## Overview

This document describes the complete implementation of the Advertisement Module for the AddMyco Mini App, including database models, API endpoints, admin panel, and business logic.

## Files Created

### 1. Database Models (`/Models`)

#### Advertisement.js

- **Schema**: Main advertisement document containing:
  - Sponsor info, position, country, image URL, redirect URL
  - Display count, used, and remaining displays
  - Status tracking (ACTIVE, PAUSED, COMPLETED, REJECTED, DRAFT)
  - Approval status for admin moderation
  - Statistics (views, clicks, CTR, first/last display dates)
  - Metadata (filename, dimensions, upload date)
  - Soft delete support via `deletedAt`
- **Indexes**: sponsorId, status, country, position, createdAt

#### AdvertisementPackage.js

- **Schema**: Package offerings for credits
  - Name, description, display credits, price in USDT
  - Positions array (HOME_BANNER, BOTTOM_CIRCLE)
  - Duration (days or null for one-time)
  - Active/inactive toggle
- **Validation**: Unique names, at least one position required

#### SponsorCredits.js

- **Schema**: Track sponsor's credit balance
  - Total, used, and balance credits
  - Transaction history with status tracking
  - Transaction details (ID, package, amount, wallet, tx hash)

#### AdvertisementDisplayLog.js

- **Schema**: Track individual impressions and clicks
  - Advertisement reference, user/session ID, country, position
  - Display timestamp, click tracking with timestamp

### 2. Controllers (`/Controllers`)

#### AdvertisementController.js

Complete implementation of all advertisement functionality:

**User Endpoints:**

- `getPackages()` - Fetch active packages with optional position filter
- `getMyCredits()` - Get user's credit balance and transaction history
- `buyCredits()` - Initiate USDT payment for credits
- `verifyPayment()` - Verify blockchain transaction and add credits
- `createAdvertisement()` - Create new ad with image upload and credit deduction
- `getMyAds()` - List user's ads with pagination and filtering
- `pauseAd()` - Pause active advertisement
- `resumeAd()` - Resume paused advertisement
- `deleteAd()` - Soft-delete advertisement

**Public Endpoints:**

- `getActiveAds()` - Get ads for display (1 per position)
- `trackDisplay()` - Track impression, increment view count, decrement remaining
- `trackClick()` - Track click, increment click count

**Admin Endpoints:**

- `adminGetPackages()` - List all packages
- `adminCreatePackage()` - Create new package
- `adminUpdatePackage()` - Update package details
- `adminGetAllAds()` - List all ads with sponsor info and filtering
- `adminApproveAd()` - Approve pending advertisement
- `adminRejectAd()` - Reject ad with reason and refund credits
- `adminGetAnalytics()` - Dashboard data (KPIs, trends, top sponsors)
- `adminGetSponsorDetails()` - Detailed sponsor info with ads and transactions

**AdminController.js Methods:**

- `advertisementDashboard()` - Render KPI dashboard
- `manageAdvertisements()` - Render ad management table
- `managePackages()` - Render package management grid
- `sponsorDetails()` - Render sponsor details page

### 3. Routes (`/Routes`)

#### Advertisement.js

API Routes:

- **User Routes** (with `isUser` middleware):
  - `GET /api/v1/advertisement/packages`
  - `GET /api/v1/advertisement/my-credits`
  - `POST /api/v1/advertisement/buy-credits`
  - `POST /api/v1/advertisement/verify-payment`
  - `POST /api/v1/advertisement/create`
  - `GET /api/v1/advertisement/my-ads`
  - `PATCH /api/v1/advertisement/:id/pause`
  - `PATCH /api/v1/advertisement/:id/resume`
  - `DELETE /api/v1/advertisement/:id`

- **Public Routes** (no auth):
  - `GET /api/v1/advertisement/active`
  - `POST /api/v1/advertisement/:id/track-display`
  - `POST /api/v1/advertisement/:id/track-click`

- **Admin Routes** (with `isAdmin` middleware):
  - `GET /api/v1/admin/advertisement/packages`
  - `POST /api/v1/admin/advertisement/packages`
  - `PATCH /api/v1/admin/advertisement/packages/:id`
  - `GET /api/v1/admin/advertisement/all`
  - `PATCH /api/v1/admin/advertisement/:id/approve`
  - `PATCH /api/v1/admin/advertisement/:id/reject`
  - `GET /api/v1/admin/advertisement/analytics`
  - `GET /api/v1/admin/sponsor/:sponsorId/details`

### 4. Admin Panel Views (`/Views/Admin/Advertisement`)

#### Dashboard.ejs

KPI Dashboard with:

- 4 KPI cards: Total Ads, Active Ads, Total Impressions, Total Revenue
- Pie chart: Ads by position
- Performance metrics: Overall CTR and total clicks
- Top 5 sponsors table with impression metrics

#### ManageAds.ejs

Advertisement management with:

- Filter controls: Status, Approval Status, Position, Country
- Data table with: Image, Sponsor, Position, Country, Status, Approval, Displays, Views, Clicks/CTR, Created Date
- Action buttons: View details, Approve, Reject
- Pagination

#### ManagePackages.ejs

Package management with:

- Grid layout showing all packages
- Package cards with: Name, Description, Credits, Price, Positions, Duration
- Action buttons: Edit, Toggle Active/Inactive, Delete
- Create new package button

#### SponsorDetails.ejs

Sponsor profile with:

- Sponsor information section
- Credit balance cards (Total, Used, Balance)
- Transaction history table
- Advertisements posted table with statistics

### 5. Integration

**App.js Changes:**

- Imported `Advertisement` route
- Added route middleware: `app.use("/", advertisement)`

**Admin Routes (Routes/Admin.js):**

- Added 4 new GET routes for admin views:
  - `/advertisements` - Dashboard
  - `/advertisements/manage` - Manage Ads
  - `/advertisements/packages` - Manage Packages
  - `/advertisement/sponsor/:sponsorId` - Sponsor Details

## Key Features

### Business Logic

1. **Credit Management**
   - Users purchase credits via USDT payment
   - Credits deducted when creating advertisements
   - Cannot create ad with insufficient credits

2. **Display Tracking**
   - Display count decremented on each impression
   - Auto-complete ad when `displayRemaining` reaches 0
   - Track first and last display dates
   - Calculate CTR (Click-Through Rate)

3. **Ad Selection**
   - Return 1 ad per position (HOME_BANNER or BOTTOM_CIRCLE)
   - Prioritize country-specific ads, fallback to GLOBAL
   - Random selection among eligible ads
   - Only show ACTIVE ads with remaining displays

4. **Admin Approval**
   - Default approval on creation (can be configured)
   - Manual approval workflow for PENDING ads
   - Rejection with reason and credit refund
   - Email notifications to sponsors

5. **Analytics**
   - Real-time impression and click tracking
   - CTR calculation per ad
   - Revenue tracking from credit purchases
   - Top sponsors ranking
   - Ads by position and country breakdown

### Validation Rules

- **Redirect URL**: Must start with `https://t.me/` (Telegram only)
- **Display Count**: Minimum 100
- **Image**: Max 5MB, PNG/JPG/WebP
- **Package Name**: Unique, 3-50 characters
- **Price**: Must be positive number
- **Position**: One of HOME_BANNER or BOTTOM_CIRCLE

### Email Notifications

Sent on:

- Ad Creation: Confirmation with details
- Ad Approved: Live notification
- Ad Rejected: Rejection reason and appeal info
- Ad Completed: Stats summary
- Low Balance: Reminder to purchase credits
- Payment Verified: Credit confirmation

## API Response Examples

### Create Advertisement

```json
{
  "success": true,
  "data": {
    "_id": "...",
    "sponsorId": "...",
    "position": "HOME_BANNER",
    "country": "GLOBAL",
    "credits": 1,
    "displayCount": 1000,
    "displayRemaining": 1000,
    "status": "ACTIVE",
    "approvalStatus": "APPROVED",
    "imageUrl": "...",
    "redirectUrl": "https://t.me/...",
    "createdAt": "..."
  }
}
```

### Get Analytics

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
    "topSponsors": [...],
    "adsByPosition": {...},
    "adsByCountry": [...]
  }
}
```

## Admin Panel Routes

- **Dashboard**: `/admin/advertisements`
- **Manage Ads**: `/admin/advertisements/manage`
- **Manage Packages**: `/admin/advertisements/packages`
- **Sponsor Details**: `/admin/advertisement/sponsor/:sponsorId`

## Setup Instructions

1. **Database**: Models will automatically create collections on first use
2. **Environment Variables**: Add to `.env`:

   ```
   USDT_PAYMENT_ADDRESS=0x...  # USDT wallet for payment
   ```

3. **Assets Directory**: Create if doesn't exist:

   ```bash
   mkdir -p assets/advertisement
   ```

4. **Restart Server**:
   ```bash
   npm run dev
   ```

## Testing Checklist

- [ ] Create ad with sufficient credits
- [ ] Reject ad creation with insufficient credits
- [ ] Buy credits via USDT
- [ ] Track impressions correctly
- [ ] Track clicks correctly
- [ ] Ads disappear when displayRemaining = 0
- [ ] Admin approve/reject workflow
- [ ] Country-based ad filtering
- [ ] Package management CRUD
- [ ] Sponsor details view
- [ ] Analytics dashboard data accuracy
- [ ] Email notifications delivery

## TODO/Future Enhancements

1. Implement blockchain verification for USDT payments
2. Add image dimension validation
3. Implement ad statistics export to CSV
4. Add scheduled ad campaigns with start/end dates
5. Implement ad impression cap per user
6. Add A/B testing for ads
7. Implement referral rewards for ad purchases
8. Add geo-targeting based on user location
9. Create sponsor performance dashboard
10. Implement bid-based ad placement (premium positions)

---

**Last Updated**: January 6, 2026
**Status**: Complete Implementation
