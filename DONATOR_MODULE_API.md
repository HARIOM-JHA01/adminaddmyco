# Donator Module API Documentation

## Overview

The Donator Module enables donators (donors) to purchase packages containing credits that allow them to create operator accounts. Operators can then create employee user accounts (premium users) who can access the AddMy.co platform.

## Architecture

### User Types

- **Operator**: Account that purchases packages and creates employees. Has JWT token-based authentication.
- **Employee**: Premium user account created by an operator. Gets `usertype=1`, 1-year premium membership.
- **Donator Admin**: System admin managing packages and approving purchases.

### Payment Flow

- **Operator** buys package → creates **DonatorPurchase** (pending)
- **Admin** approves → credits added to Operator
- **Operator** creates employee → credits deducted, employee gets premium membership

---

## Models

### DonatorPackage

```javascript
{
  _id: ObjectId,
  name: String (required),
  employeeCredits: Number (required), // Number of employee accounts granted
  operatorCredits: Number (required), // Number of operator slots/accounts granted
  price: Number (required),   // Price in USDT
  status: Number (1: active, 0: inactive),
  createdAt: Date,
  updatedAt: Date
}
```

### DonatorPurchase

```javascript
{
  _id: ObjectId,
  operator: ObjectId (ref: Operator, required),
  package: ObjectId (ref: DonatorPackage, required),
  amount: Number (required),
  currency: String (default: "USDT"),
  transactionId: String (unique, sparse), // Off-chain payment ID
  paymentMethod: String (default: "USDT"),
  status: Number (0: pending, 1: approved, 2: rejected, 3: cancelled),
  creditsGrantedEmployee: Number,
  creditsGrantedOperator: Number,
  approvedBy: ObjectId (ref: Admin),
  approvedAt: Date,
  rejectionReason: String,
  createdAt: Date,
  updatedAt: Date
}
```

### Operator

```javascript
{
  _id: ObjectId,
  name: String (required),
  email: String (required, unique),
  password: String (hashed, required),
  token: String (JWT),
  role: String (default: "operator"),
  credits: Number (default: 0), // Remaining credits
  isActive: Boolean (default: true),
  lastLogin: Date,
  createdByAdmin: ObjectId (ref: Admin),
  createdAt: Date,
  updatedAt: Date
}
```

### DonatorAudit

```javascript
{
  _id: ObjectId,
  actorType: String (admin|operator|system|paymentGateway),
  actorId: ObjectId,
  action: String (package.create|package.update|purchase.create|purchase.approve|purchase.reject|operator.create|operator.login|employee.create),
  details: Mixed (arbitrary JSON),
  entityType: String (DonatorPackage|DonatorPurchase|Operator|User),
  entityId: ObjectId,
  createdAt: Date
}
```

---

## API Endpoints

### PUBLIC ENDPOINTS

#### List All Active Packages

```
GET /donator/packages
```

**Description**: Retrieve all active donator packages  
**Auth**: None  
**Response**:

```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "name": "Basic Package",
      "employeeCredits": 10,
      "operatorCredits": 1,
      "price": 100
    }
  ]
}
```

---

### OPERATOR ENDPOINTS

#### Quick Reference

| Method | Endpoint                            | Purpose                 | Auth |
| ------ | ----------------------------------- | ----------------------- | ---- |
| POST   | `/donator/operator/register`        | Register new operator   | None |
| POST   | `/donator/operator/login`           | Login and get JWT token | None |
| GET    | `/donator/operator/profile`         | Get operator profile    | JWT  |
| GET    | `/donator/operator/credits`         | Get available credits   | JWT  |
| GET    | `/donator/operator/operators`       | Get sub-operators list  | JWT  |
| GET    | `/donator/operator/users`           | Get employees list      | JWT  |
| POST   | `/donator/buy`                      | Purchase package        | JWT  |
| POST   | `/donator/operator/create-employee` | Create employee account | JWT  |

---

#### Operator Registration

```
POST /donator/operator/register
```

**Description**: Register a new operator account  
**Auth**: None  
**Request Body**:

```json
{
  "name": "John Operator",
  "email": "john@example.com",
  "password": "SecurePass123",
  "confirmPassword": "SecurePass123"
}
```

**Validations**:

- Email must be unique
- Password minimum 8 characters
- Passwords must match

**Response**:

```json
{
  "success": true,
  "message": "Operator registered successfully",
  "data": {
    "_id": "...",
    "name": "John Operator",
    "email": "john@example.com"
  }
}
```

#### Operator Login

```
POST /donator/operator/login
```

**Description**: Authenticate operator and get JWT token  
**Auth**: None  
**Request Body**:

```json
{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

**Response**:

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "_id": "...",
    "name": "John Operator",
    "email": "john@example.com",
    "credits": 15,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### Get Operator Profile

```
GET /donator/operator/profile
Authorization: Bearer <token>
```

**Description**: Get current operator's profile  
**Auth**: Operator (Bearer JWT)  
**Response**:

```json
{
  "success": true,
  "data": {
    "_id": "...",
    "name": "John Operator",
    "email": "john@example.com",
    "credits": 15,
    "isActive": true,
    "lastLogin": "2026-02-06T10:30:00Z"
  }
}
```

#### Get Operator Credits

```
GET /donator/operator/credits
Authorization: Bearer <token>
```

**Description**: Get current operator's available credits and operator slots  
**Auth**: Operator (Bearer JWT)  
**Response**:

```json
{
  "success": true,
  "data": {
    "credits": 15,
    "operatorSlots": 5
  }
}
```

#### Get Operators List

```
GET /donator/operator/operators
Authorization: Bearer <token>
```

**Description**: Get list of sub-operators created by this operator (if applicable)  
**Auth**: Operator (Bearer JWT)  
**Response**:

```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "name": "Sub Operator 1",
      "email": "subop1@example.com",
      "credits": 10,
      "operatorSlots": 3,
      "isActive": true,
      "createdAt": "2026-01-15T08:00:00Z"
    }
  ],
  "total": 1
}
```

#### Get Operator Users

```
GET /donator/operator/users
Authorization: Bearer <token>
```

**Description**: Get list of employees/users created by this operator  
**Auth**: Operator (Bearer JWT)  
**Response**:

```json
{
  "success": true,
  "data": {
    "creditsUsed": 10,
    "potentialUsers": 10,
    "purchases": [
      {
        "_id": "...",
        "packageName": "Basic Package",
        "creditsGranted": 10,
        "createdAt": "2026-02-01T10:30:00Z"
      }
    ]
  },
  "total": 10
}
```

#### Buy Package

```
POST /donator/buy
Authorization: Bearer <token>
```

**Description**: Purchase a package. Creates pending purchase awaiting admin approval.  
**Auth**: Operator (Bearer JWT)  
**Request Body**:

```json
{
  "packageId": "507f1f77bcf86cd799439011",
  "transactionId": "TXN-2026-0001"
}
```

**Validations**:

- Package must exist and be active
- TransactionId must be unique

**Response**:

```json
{
  "success": true,
  "message": "Purchase created. Awaiting admin approval.",
  "data": {
    "purchaseId": "...",
    "status": 0,
    "amount": 100
  }
}
```

#### Create Employee Account

```
POST /donator/operator/create-employee
Authorization: Bearer <token>
```

**Description**: Create a new premium user account. Deducts 1 credit from operator.  
**Auth**: Operator (Bearer JWT)  
**Request Body**:

```json
{
  "employeeTgid": "username123",
  "employeeEmail": "employee@company.com",
  "employeeName": "John Employee"
}
```

**Validations**:

- EmployeeTgid must not already exist
- Operator must have at least 1 credit
- Email optional but if provided must be valid

**Side Effects**:

- Operator credits decremented by 1 (atomic operation)
- Employee created with `usertype=1`, `membertype="premium"`
- Membership set to 1 year from now
- freeUsername generated (random 8-char hex)
- username set to employeeTgid (or with suffix if collision)
- DonatorAudit entry created

**Response**:

```json
{
  "success": true,
  "message": "Employee account created successfully",
  "data": {
    "userId": "...",
    "username": "username123",
    "freeUsername": "a1b2c3d4",
    "tgid": "username123",
    "email": "employee@company.com",
    "membershipEnd": "2027-02-06",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### ADMIN ENDPOINTS

#### Create Donator Package

```
POST /admin/donator/package/create
Authorization: Session (Admin)
```

**Description**: Create a new donator package  
**Auth**: Admin (`isAdmin` middleware)  
**Request Body**:

```json
{
  "name": "Premium Package",
  "description": "Includes 20 employee accounts",
  "credits": 20,
  "price": 500,
  "employeeCredits": 20,
  "operatorCredits": 2,
  "isPopular": true,
  "status": 1
}
```

**Response**:

```json
{
  "success": true,
  "message": "Package created successfully",
  "data": {
    "_id": "...",
    "name": "Premium Package",
    "credits": 20,
    "price": 500,
    ...
  }
}
```

#### Update Donator Package

```
POST /admin/donator/package/edit/:id
Authorization: Session (Admin)
```

**Description**: Update an existing package  
**Auth**: Admin  
**URL Params**:

- `id`: Package ID

**Request Body**: Same as create (all fields optional)  
**Response**: Updated package object

#### List All Packages (Admin View)

```
GET /admin/donator/packages
Authorization: Session (Admin)
```

**Description**: Render admin packages list page  
**Auth**: Admin  
**Renders**: EJS template with all packages

#### List All Purchases (Admin View)

```
GET /admin/donator/purchases
Authorization: Session (Admin)
```

**Description**: Render admin purchases list page  
**Auth**: Admin  
**Renders**: EJS template with pending/approved/rejected purchases

#### Approve Purchase

```
POST /admin/donator/purchase/approve/:id
Authorization: Session (Admin)
```

**Description**: Approve a purchase and grant credits to operator  
**Auth**: Admin  
**URL Params**:

- `id`: Purchase ID

**Side Effects**:

- Purchase status set to 1 (approved)
- Credits added to Operator (atomic $inc)
- Operator.credits updated
- DonatorAudit entry created with credit transaction details

**Response**:

```json
{
  "success": true,
  "message": "Purchase approved. 20 credits added to operator.",
  "data": {
    "operatorCredits": 35
  }
}
```

#### Reject Purchase

```
POST /admin/donator/purchase/reject/:id
Authorization: Session (Admin)
```

**Description**: Reject a pending purchase  
**Auth**: Admin  
**Request Body**:

```json
{
  "rejectionReason": "Invalid transaction ID"
}
```

**Side Effects**:

- Purchase status set to 2 (rejected)
- No credits granted
- DonatorAudit entry created

**Response**:

```json
{
  "success": true,
  "message": "Purchase rejected"
}
```

#### Create Operator (Admin)

```
POST /admin/donator/operator/create
Authorization: Session (Admin)
```

**Description**: Admin creates a new operator account  
**Auth**: Admin  
**Request Body**:

```json
{
  "name": "Jane Operator",
  "email": "jane@example.com",
  "password": "SecurePass456",
  "confirmPassword": "SecurePass456",
  "isActive": true
}
```

**Response**:

```json
{
  "success": true,
  "message": "Operator created successfully",
  "data": {
    "_id": "...",
    "name": "Jane Operator",
    "email": "jane@example.com",
    "credits": 0,
    "isActive": true
  }
}
```

#### List Operators (Admin View)

```
GET /admin/donator/operators
Authorization: Session (Admin)
```

**Description**: Render operators management page  
**Auth**: Admin  
**Renders**: EJS template with all operators

#### Deactivate Operator

```
POST /admin/donator/operator/deactivate/:id
Authorization: Session (Admin)
```

**Description**: Deactivate an operator account (login prevented)  
**Auth**: Admin  
**Response**:

```json
{
  "success": true,
  "message": "Operator deactivated"
}
```

#### Activate Operator

```
POST /admin/donator/operator/activate/:id
Authorization: Session (Admin)
```

**Description**: Activate a deactivated operator account  
**Auth**: Admin  
**Response**:

```json
{
  "success": true,
  "message": "Operator activated"
}
```

#### Add Credits to Operator (Manual)

```
POST /admin/donator/operator/add-credits/:id
Authorization: Session (Admin)
```

**Description**: Manually add credits to operator (e.g., for promotional reasons)  
**Auth**: Admin  
**Request Body**:

```json
{
  "amount": 10
}
```

**Response**:

```json
{
  "success": true,
  "message": "10 credits added",
  "data": {
    "credits": 45
  }
}
```

---

## Admin UI Pages

| Page                | URL                                            | Controller                          | View File                  |
| ------------------- | ---------------------------------------------- | ----------------------------------- | -------------------------- |
| Packages List       | `/admin/donator/packages`                      | DonatorAdminController.PackageList  | Donator/PackageList.ejs    |
| Create/Edit Package | `/admin/donator/package/create` or `/edit/:id` | DonatorAdminController.PackageForm  | Donator/PackageCreate.ejs  |
| Purchases List      | `/admin/donator/purchases`                     | DonatorAdminController.PurchaseList | Donator/PurchaseList.ejs   |
| Operators List      | `/admin/donator/operators`                     | DonatorAdminController.OperatorList | Donator/OperatorList.ejs   |
| Create Operator     | `/admin/donator/operator/create`               | DonatorAdminController.OperatorForm | Donator/OperatorCreate.ejs |

---

## Business Rules & Constraints

1. **Credit Accounting**:
   - Credits are added atomically on purchase approval using MongoDB `$inc`
   - Credits are deducted atomically when creating an employee
   - Insufficient credit returns HTTP 409 (Conflict)

2. **Operator Authentication**:
   - JWT token stored in Operator.token field
   - Token required for all operator API calls
   - Deactivated operators cannot login

3. **Employee Creation**:
   - Always generates unique `freeUsername` (random 8-char hex)
   - `username` set to `tgid`, or with `-XXXX` suffix if collision
   - Always created as `usertype=1` (premium)
   - Always created as `membertype="premium"`
   - `paymentBy=7` (Donator code)
   - `startdate` = today, `enddate` = today + 1 year (employee membership is fixed to 1 year)
   - Membership auto-expires per `Utils/membershipCron.js` (daily check)

4. **Membership Expiry**:
   - Daily cron job checks for expired memberships
   - Expired employees reverted to `usertype=0` (free)
   - Existing `freeUsername` preserved

5. **Audit Trail**:
   - All significant actions logged to DonatorAudit
   - Tracks actor (admin/operator), action, entity, and details

6. **Off-Chain USDT Payment**:
   - Operator provides external transactionId
   - Admin reviews and approves
   - No direct integration with blockchain (manual verification)
   - Supports future integration with Stripe/Paypal

---

## Error Responses

### 422 Unprocessable Entity

```json
{
  "success": false,
  "message": "Validation error or business rule violation",
  "errors": { "field": ["error message"] }
}
```

### 404 Not Found

```json
{
  "success": false,
  "message": "Resource not found"
}
```

### 409 Conflict

```json
{
  "success": false,
  "message": "Insufficient credits"
}
```

### 401 Unauthorized

```json
{
  "success": false,
  "message": "Token verification failed"
}
```

### 500 Server Error

```json
{
  "success": false,
  "message": "Server error",
  "error": "error details"
}
```

---

## Integration Notes

### Reused Patterns

- **User Model**: Uses existing User.js with new `usertype=1`, `membertype="premium"`, payment date fields
- **Membership Expiry**: Integrated with existing `Utils/membershipCron.js` (no changes needed)
- **Admin Middleware**: Reuses `Middleware/AdminAuthentication.js`
- **Operator Auth**: Mirrors `Middleware/PartnerAuthentication.js` pattern

### Future Payment Integrations

- Replace `transactionId` with actual payment gateway (Stripe, Paypal)
- Add webhook handlers for payment confirmation
- Integrate with existing payment models if desired

### Email Notifications (TODO)

- Send credentials to operator on creation
- Send confirmation on purchase approval
- Notify employee on account creation

---

## Testing Checklist

- [ ] Operator can register and login
- [ ] Operator can list packages
- [ ] Operator can buy package (creates pending purchase)
- [ ] Admin can approve purchase → credits added
- [ ] Admin can reject purchase
- [ ] Operator can create employee with sufficient credits
- [ ] Employee creation deducts operator credits atomically
- [ ] Employee created with correct `usertype=1` and membership dates
- [ ] Membership expiry cron reverts employee to free after enddate
- [ ] Operator cannot create employee with 0 credits
- [ ] All audit trails logged correctly
- [ ] Deactivated operators cannot login
- [ ] Unique username collision handling works
- [ ] Unique freeUsername generation works
