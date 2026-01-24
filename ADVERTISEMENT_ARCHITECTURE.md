# Advertisement Module - Visual Architecture

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React Mini App)               │
├─────────────────────────────────────────────────────────────────┤
│  • Get active ads for display                                   │
│  • Track impressions (views)                                    │
│  • Track clicks (redirects)                                     │
│  • Buy advertisement credits                                    │
│  • Create and manage ads                                        │
└────────────┬──────────────────────────────────────┬─────────────┘
             │                                      │
             ▼                                      ▼
    ┌─────────────────────┐         ┌──────────────────────────┐
    │  PUBLIC API ROUTES  │         │   USER API ROUTES        │
    ├─────────────────────┤         ├──────────────────────────┤
    │ GET  /active        │         │ GET  /packages           │
    │ POST /:id/display   │         │ GET  /my-credits         │
    │ POST /:id/click     │         │ POST /buy-credits        │
    │                     │         │ POST /verify-payment     │
    │ (No Auth Required)  │         │ POST /create             │
    │                     │         │ GET  /my-ads             │
    │                     │         │ PATCH /:id/pause|resume  │
    │                     │         │ DELETE /:id              │
    │                     │         │ (Auth: isUser)           │
    └──────────┬──────────┘         └──────────┬───────────────┘
               │                               │
               └───────────────┬───────────────┘
                               │
                               ▼
            ┌──────────────────────────────────────┐
            │  AdvertisementController.js          │
            │  • Business Logic Implementation     │
            │  • Credit Management                 │
            │  • Display/Click Tracking            │
            │  • Ad Selection Logic                │
            │  • Payment Verification              │
            └──────────────┬───────────────────────┘
                           │
                 ┌─────────┼─────────┐
                 ▼         ▼         ▼
        ┌──────────────────────────────────────┐
        │      MONGODB COLLECTIONS             │
        ├──────────────────────────────────────┤
        │ ┌────────────────────────────────┐  │
        │ │ Advertisement                  │  │
        │ │ ├─ sponsorId                   │  │
        │ │ ├─ position (HOME/BOTTOM)      │  │
        │ │ ├─ country                     │  │
        │ │ ├─ displayCount/Used/Remaining│  │
        │ │ ├─ viewCount / clickCount      │  │
        │ │ ├─ status / approvalStatus     │  │
        │ │ └─ imageUrl / redirectUrl      │  │
        │ └────────────────────────────────┘  │
        │ ┌────────────────────────────────┐  │
        │ │ AdvertisementPackage           │  │
        │ │ ├─ name / description          │  │
        │ │ ├─ displayCredits              │  │
        │ │ ├─ priceUSDT                   │  │
        │ │ ├─ positions[]                 │  │
        │ │ └─ isActive                    │  │
        │ └────────────────────────────────┘  │
        │ ┌────────────────────────────────┐  │
        │ │ SponsorCredits                 │  │
        │ │ ├─ sponsorId                   │  │
        │ │ ├─ totalCredits                │  │
        │ │ ├─ usedCredits / balanceCredits│  │
        │ │ └─ transactions[]              │  │
        │ └────────────────────────────────┘  │
        │ ┌────────────────────────────────┐  │
        │ │ AdvertisementDisplayLog        │  │
        │ │ ├─ advertisementId             │  │
        │ │ ├─ sessionId / userId          │  │
        │ │ ├─ displayedAt / clickedAt     │  │
        │ │ └─ userClicked (boolean)       │  │
        │ └────────────────────────────────┘  │
        └──────────────────────────────────────┘
```

## 👨‍💼 Admin Panel Architecture

```
┌────────────────────────────────────────────────────────────┐
│                    ADMIN PANEL                              │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  /admin/advertisements                                     │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ 📊 DASHBOARD                                         │ │
│  ├──────────────────────────────────────────────────────┤ │
│  │ • 4 KPI Cards (Total, Active, Views, Revenue)      │ │
│  │ • Pie Chart (Ads by Position)                       │ │
│  │ • Performance Metrics (CTR, Clicks)                 │ │
│  │ • Top 5 Sponsors Table                              │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                             │
│  /admin/advertisements/manage                              │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ 📋 MANAGE ADVERTISEMENTS                             │ │
│  ├──────────────────────────────────────────────────────┤ │
│  │ • Filters: Status, Approval, Position, Country      │ │
│  │ • Data Table: 11 columns with image preview         │ │
│  │ • Actions: View, Approve, Reject                    │ │
│  │ • Pagination                                        │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                             │
│  /admin/advertisements/packages                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ 📦 MANAGE PACKAGES                                   │ │
│  ├──────────────────────────────────────────────────────┤ │
│  │ • Package Cards: Name, Description, Price           │ │
│  │ • Actions: Edit, Toggle Active, Delete              │ │
│  │ • Create New Package Button                         │ │
│  │ • Price Highlight                                  │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                             │
│  /admin/advertisement/sponsor/:sponsorId                   │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ 👤 SPONSOR DETAILS                                   │ │
│  ├──────────────────────────────────────────────────────┤ │
│  │ • Sponsor Info: Name, Email, Telegram ID            │ │
│  │ • Credit Cards: Total, Used, Balance                │ │
│  │ • Transaction History Table                         │ │
│  │ • Advertisements Posted Table                       │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

## 📊 Data Flow Diagrams

### 1. Create Advertisement Flow

```
User (Mini App)
     │
     ├─► Upload Image
     │
     ├─► POST /api/v1/advertisement/create
     │   ├─ position: "HOME_BANNER"
     │   ├─ country: "GLOBAL"
     │   ├─ credits: 1                  # Number of credits to spend; displayCount is computed using the position's displayCreditRate
     │   └─ redirectUrl: "https://t.me/..."
     │
     ▼
AdvertisementController.createAdvertisement()
     │
     ├─► Check Credits: balanceCredits >= credits?
     │   └─ If NO: Return 403 (Insufficient Credits)
     │
     ├─► Save Image to /assets/advertisement/
     │
     ├─► Deduct Credits from SponsorCredits
     │   ├─ usedCredits += credits
     │   └─ balanceCredits -= credits
     │
     ├─► Compute displayCount = credits * displayCreditRate
     │
     ├─► Create Advertisement document
     │   └─ status: "ACTIVE" (auto-approved by default)
     │
     └─► Send Email: "Ad Created Successfully"

     Return: Advertisement object with details
```

### 2. Display Tracking Flow

```
User Views Ad (Mini App)
     │
     └─► POST /api/v1/advertisement/:id/track-display
         ├─ sessionId: "sess_..."
         └─ country: "US"

         ▼
AdvertisementController.trackDisplay()
     │
     ├─► Advertisement.findById(:id)
     │
     ├─► Increment: viewCount += 1
     ├─► Increment: displayUsed += 1
     ├─► Decrement: displayRemaining -= 1
     │
     ├─► Update timestamps:
     │   ├─ Set firstDisplayedAt (if first time)
     │   └─ Update lastDisplayedAt
     │
     ├─► Check if displayRemaining === 0
     │   └─ If YES: Set status = "COMPLETED"
     │
     ├─► Save Advertisement
     │
     └─► Log to AdvertisementDisplayLog
         ├─ advertisementId
         ├─ sessionId
         ├─ displayedAt
         └─ userClicked: false
```

### 3. Payment & Credit Flow

```
User Selects Package
     │
     ├─► GET /api/v1/advertisement/packages
     │   └─ Return: List of active packages with prices
     │
     ├─► POST /api/v1/advertisement/buy-credits
     │   ├─ packageId: "PKG_..."
     │   ├─ walletAddress: "0x..."
     │   └─ amount: 50.0
     │
     ▼
AdvertisementController.buyCredits()
     │
     ├─► Validate package exists
     ├─► Validate amount matches package price
     │
     ├─► Generate transactionId
     │
     ├─► Create/Update SponsorCredits
     │
     ├─► Add transaction to pending state:
     │   └─ status: "PENDING"
     │
     └─► Return: Payment address to user
         ├─ transactionId
         ├─ paymentAddress (admin wallet)
         └─ creditsWillAdd

User Sends USDT to Payment Address
     │
     └─► POST /api/v1/advertisement/verify-payment
         ├─ transactionId: "TX_..."
         └─ txHash: "0x..."

         ▼
AdvertisementController.verifyPayment()
     │
     ├─► Find transaction by transactionId
     │
     ├─► Update transaction status: "COMPLETED"
     ├─► Set txHash: "0x..."
     │
     ├─► Update SponsorCredits:
     │   ├─ totalCredits += creditsAdded
     │   └─ balanceCredits += creditsAdded
     │
     ├─► Save changes
     │
     └─► Send Email: "Credits Added Successfully"
         └─ New balance
```

### 4. Admin Approval Flow

```
Ad Created with approvalStatus: "PENDING"
     │
     ├─► Admin Views: /admin/advertisements/manage
     │
     ├─► Admin Reviews Ad (Image, Details)
     │
     ├─► Admin Action: APPROVE or REJECT
     │
     ▼ APPROVE PATH
PATCH /api/v1/admin/advertisement/:id/approve
     │
     ├─► Set approvalStatus: "APPROVED"
     │
     ├─► Ad becomes visible in GET /active (if status=ACTIVE)
     │
     └─► Send Email to Sponsor: "Ad Approved!"

     ▼ REJECT PATH
PATCH /api/v1/admin/advertisement/:id/reject
     │
     ├─► Set approvalStatus: "REJECTED"
     ├─► Set rejectionReason: "..."
     ├─► Set status: "REJECTED"
     │
     ├─► If displayUsed === 0 (never shown):
     │   └─ Refund credits to sponsor
     │       ├─ usedCredits -= displayCount
     │       └─ balanceCredits += displayCount
     │
     └─► Send Email to Sponsor:
         ├─ "Ad Rejected"
         └─ Rejection reason
```

### 5. Ad Selection & Display Flow

```
User Opens Mini App
     │
     └─► GET /api/v1/advertisement/active
         ├─ position: "HOME_BANNER"
         └─ country: "US"

         ▼
AdvertisementController.getActiveAds()
     │
     ├─► Query ads where:
     │   ├─ position = "HOME_BANNER"
     │   ├─ status = "ACTIVE"
     │   ├─ approvalStatus = "APPROVED"
     │   ├─ displayRemaining > 0
     │   └─ deletedAt = null
     │
     ├─► Filter by country (priority):
     │   ├─ Priority 1: ads with country = "US" (user's country)
     │   └─ Priority 2: ads with country = "GLOBAL"
     │
     ├─► Select 1 random ad
     │
     ├─► Generate sessionId for tracking
     │
     └─► Return: Ad details + sessionId
         ├─ _id
         ├─ imageUrl
         ├─ redirectUrl
         └─ displayRemaining

Frontend renders Ad to User
     │
     ├─► User clicks on ad
     │
     └─► POST /api/v1/advertisement/:id/track-click
         ├─ sessionId: "sess_..."
         │
         ▼
         ├─► Increment clickCount
         ├─► Log click to DisplayLog with clickedAt
         │
         └─► Return: redirectUrl
             └─ Frontend redirects to Telegram URL
```

## 🔄 State Transitions

### Advertisement Status Flow

```
              CREATE
                │
                ▼
            [DRAFT] ────────────────┐
                │                   │
        (Admin Approval)        (User Creates)
                │                   │
                ▼                   ▼
            [ACTIVE] ◄─────────────►[PAUSED]
             │   │         (User toggles)
             │   │
        (Impressions)
             │
             ├─► displayRemaining = 0
             │
             ▼
          [COMPLETED]
          (All displays used)

Alternative paths:
[ACTIVE] ──(Admin Rejects)──► [REJECTED]
[DRAFT] ──(Admin Rejects)──► [REJECTED]
```

### Approval Status Flow

```
             CREATE
               │
               ▼
          [PENDING] ──(If manual approval enabled)
          /  │  \
         /   │   \
    [APPROVED] [REJECTED]
       ✓         ✗
    (Visible)  (Hidden)
```

---

**Diagram Version**: 1.0
**Updated**: January 6, 2026
