# Donator Module - User Data Retrieval APIs

## Summary

Three new endpoints have been implemented to allow operators to view their current resources (credits, operators, and users/employees).

---

## New APIs

### 1. Get Operator Credits

**Endpoint**: `GET /donator/operator/credits`

**Authentication**: Bearer JWT token (operator)

**Purpose**: Retrieve current available credits and operator slots

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

**Use Case**: Display credit balance on operator dashboard

---

### 2. Get Sub-Operators List

**Endpoint**: `GET /donator/operator/operators`

**Authentication**: Bearer JWT token (operator)

**Purpose**: Retrieve list of operators created by this operator

**Response**:

```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Sub Operator 1",
      "email": "subop@example.com",
      "credits": 10,
      "operatorSlots": 3,
      "isActive": true,
      "createdAt": "2026-01-15T08:00:00Z"
    }
  ],
  "total": 1
}
```

**Use Case**: Manage hierarchical operator structure (if applicable)

---

### 3. Get Employees/Users List

**Endpoint**: `GET /donator/operator/users`

**Authentication**: Bearer JWT token (operator)

**Purpose**: Retrieve employees created using this operator's credits and track credit usage

**Response**:

```json
{
  "success": true,
  "data": {
    "creditsUsed": 10,
    "potentialUsers": 10,
    "purchases": [
      {
        "_id": "507f1f77bcf86cd799439012",
        "packageName": "Basic Package",
        "creditsGranted": 10,
        "createdAt": "2026-02-01T10:30:00Z"
      }
    ]
  },
  "total": 10
}
```

**Use Case**: Track employee creation history and remaining credits

---

## Implementation Details

### Files Modified

1. **Controllers/DonatorController.js**
   - Added `GetOperatorCredits()` method
   - Added `GetOperatorsList()` method
   - Added `GetOperatorUsers()` method

2. **Routes/Donator.js**
   - Added route: `GET /donator/operator/credits`
   - Added route: `GET /donator/operator/operators`
   - Added route: `GET /donator/operator/users`

3. **DONATOR_MODULE_API.md**
   - Documented all three new endpoints
   - Added operator endpoints quick reference table

4. **DONATOR_MODULE_IMPLEMENTATION.md**
   - Updated routes list with new endpoints
   - Added new "User Data Retrieval APIs" section with implementation details
   - Updated testing quick start guide

### Technical Details

#### Get Operator Credits

- Fetches from single Operator document
- Selects only `credits` and `operatorSlots` fields
- O(1) operation - instant response

#### Get Operators List

- Queries all Operators where `createdByAdmin = currentOperator._id`
- Supports hierarchical operator structure
- Excludes password field for security
- Returns: name, email, credits, operatorSlots, isActive, createdAt

#### Get Employees List

- Queries DonatorPurchase records for approved purchases
- Calculates:
  - `creditsUsed`: Sum of creditsGrantedEmployee from all purchases
  - `potentialUsers`: Total user capacity created
  - Purchase details: packageName, creditsGranted, createdAt
- Note: Current User model doesn't have `createdByOperator` field
  - Workaround: Tracks through purchase records
  - Future enhancement: Add `createdByOperator` to User model for direct employee tracking

---

## Error Handling

All endpoints return standard error responses:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

**Status Codes**:

- `200`: Success
- `404`: Operator not found
- `500`: Server error

---

## Security

1. **Authentication**: All endpoints require valid Bearer JWT token
2. **Authorization**: Operators can only see their own resources
3. **No Password Leaks**: Password fields excluded from responses
4. **Atomic Operations**: Credit operations use MongoDB `$inc` to prevent race conditions

---

## Testing

### Get Credits

```bash
curl -X GET http://localhost:3000/donator/operator/credits \
  -H "Authorization: Bearer <token>"
```

### Get Sub-Operators

```bash
curl -X GET http://localhost:3000/donator/operator/operators \
  -H "Authorization: Bearer <token>"
```

### Get Employees

```bash
curl -X GET http://localhost:3000/donator/operator/users \
  -H "Authorization: Bearer <token>"
```

---

## Future Enhancements

1. **User Model Enhancement**: Add `createdByOperator` field to User model for direct employee tracking
2. **Pagination**: Add `limit` and `skip` query parameters for large result sets
3. **Filtering**: Add filters for active/inactive operators or status-based user filtering
4. **Sorting**: Add sort options (by credits, creation date, etc.)
5. **Export**: Add CSV export functionality for operator reports

---

## Database Indexes

No new indexes required - uses existing:

- Operator: `createdByAdmin` index (implicit through foreign key)
- DonatorPurchase: `operator` and `status` indexes already exist

---

## Version

- **Date**: February 6, 2026
- **Module**: Donator Module v1.1
- **Status**: Implemented and Documented
