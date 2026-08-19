# Payment Module API - Implementation Plan

## Current State Analysis

### ✅ Already Implemented

#### Database Schema
The `PaymentTransaction` model already exists in `prisma/schema.prisma`:
- `id`: Auto-increment primary key
- `reference`: Unique payment reference string
- `idempotencyKey`: Unique key for preventing duplicate payments
- `enrollmentId`: Foreign key to StudentEnrollment
- `amount`: Decimal(12,2) - payment amount
- `currency`: VarChar(3) - currency code (default: USD)
- `paymentDate`: DateTime - when payment was made
- `receivedById`: Foreign key to User (staff who recorded payment)
- `createdAt`: Timestamp

**Relationships:**
- Belongs to StudentEnrollment (via enrollmentId)
- Belongs to User (via receivedById)

**Indexes:**
- `[enrollmentId, paymentDate]` - for efficient enrollment payment lookups
- `[receivedById, createdAt]` - for audit trail queries

#### Existing API Routes

1. **POST /api/payments** ✅
   - Records a payment against an enrollment
   - Auth: REGISTRAR role required (UserRole.REGISTRAR)
   - Validation: Zod schema with idempotency support
   - Business rules:
     * Prevents overpayment (validates against enrollment balance)
     * Only accepts payments for ACTIVE enrollments
     * Idempotency key prevents duplicate payments
     * Creates audit log (LogEvent.PAYMENT_RECORDED)
   - Test coverage: Comprehensive (7 test cases)

2. **GET /api/payments** ✅
   - Lists all payments or filters by enrollmentId
   - Auth: STAFF role required
   - Test coverage: Exists in route.test.ts

3. **GET /api/fees/[enrollmentId]** ✅
   - Returns outstanding balance for an enrollment
   - Calculates: feeTotal, paid amount, balance, overdue status
   - Auth: STAFF role required
   - Test coverage: Comprehensive

#### Existing Utilities
- `lib/enrollment-fees.ts`:
  - `paymentCreateSchema`: Zod validation for payment creation
  - `publicPayment()`: Converts Prisma Decimal to string for API response
  - `balancePayload()`: Calculates balance, overdue status
  - `cents()`, `money()`: Decimal-safe financial calculations
  - `decimalString()`: Safe Decimal-to-string conversion

- `lib/auth/log-events.ts`:
  - `LogEvent.PAYMENT_RECORDED` already defined

### ❌ Missing Implementation

Based on the user's requirements, the following endpoints need to be created:

1. **GET /api/payments/[id]** - Get single payment details
   - **Purpose**: Retrieve details of a specific payment by ID
   - **Auth**: STAFF role (all staff can view)
   - **Response**: Single payment object with enrollment details
   - **Error cases**: 404 if payment not found, 401 if not authenticated

2. **Student-facing payment history** - Students viewing their own payments
   - **Option A**: Add student authorization to existing GET /api/payments
     * Pros: Single endpoint, simpler maintenance
     * Cons: Complex authorization logic (staff sees all, students see own)
   
   - **Option B**: Create separate student endpoint GET /api/student/payments
     * Pros: Clear separation, simpler authorization per route
     * Cons: Code duplication, multiple endpoints for similar functionality
   
   - **Recommendation**: Option A - extend existing endpoint with role-based filtering

3. **Payment receipt/confirmation endpoint** (Nice to have)
   - **GET /api/payments/[id]/receipt**
   - Returns formatted payment receipt data
   - Could be used by UI to generate printable receipt

## Implementation Plan

### Phase 1: Complete Core Payment API

#### 1.1 Implement GET /api/payments/[id]
**File**: `app/api/payments/[id]/route.ts`

```typescript
Features:
- Validate ID parameter (positive integer)
- Retrieve payment with enrollment and student details
- Return 404 if not found
- Staff-only authorization
- Convert Decimal amounts to strings
```

**Test File**: `app/api/payments/[id]/route.test.ts`
```
Test cases:
- ✅ Returns payment details for valid ID
- ✅ Returns 404 for non-existent payment
- ✅ Validates ID format (rejects negative, non-numeric)
- ✅ Requires authentication (401 for unauthenticated)
- ✅ Requires staff role (students get 403)
- ✅ Includes enrollment and student relationship data
- ✅ Returns decimal amounts as strings
```

#### 1.2 Enhance GET /api/payments for Student Access
**File**: `app/api/payments/route.ts` (modify existing)

```typescript
Changes:
- Support both staff and student authentication
- Staff: can view all payments (existing behavior)
- Students: can only view payments for their own enrollments
- Add student guard function to lib/auth-guards.ts
- Filter by student's enrollments when student role detected
```

**Additional Tests**: `app/api/payments/route.test.ts` (extend existing)
```
New test cases:
- ✅ Student can view their own payment history
- ✅ Student filtered to only their enrollments
- ✅ Student cannot see other students' payments
- ✅ Student role returns empty array if no enrollments
- ✅ Enrollment filter works for both staff and students
```

#### 1.3 Add Student Auth Guard
**File**: `lib/auth-guards.ts` (extend existing)

```typescript
New function:
- requireStudent(): Returns authenticated student user
- Validates role === 0 (STUDENT)
- Returns user with studentId populated
```

### Phase 2: Enhanced Features (Optional)

#### 2.1 Payment Receipt Endpoint
**File**: `app/api/payments/[id]/receipt/route.ts`

```typescript
Features:
- Returns payment details in receipt format
- Includes student info, program info, enrollment details
- Payment amount, date, reference
- Running balance after payment
- Staff who recorded payment
```

### Phase 3: Testing & Validation

1. **Unit Tests**: All routes with comprehensive coverage
   - Happy paths
   - Validation errors (400)
   - Authorization failures (401, 403)
   - Not found errors (404)
   - Business rule violations (409)
   - Server errors (500)

2. **Schema Validation**: `npx prisma validate`
3. **TypeScript Validation**: `npx tsc --noEmit`
4. **Test Execution**: `npm test -- app/api/payments`

### Phase 4: Documentation

Create comprehensive API documentation following the pattern in `API_AUTH_DOCUMENTATION.md`:
- **File**: `docs/PAYMENT_API_DOCUMENTATION.md`
- All endpoints with request/response examples
- Error codes and their meanings
- Business rules and constraints
- Authentication/authorization requirements
- Example client usage

## API Endpoints Summary

| Method | Endpoint | Auth | Description | Status |
|--------|----------|------|-------------|--------|
| POST | `/api/payments` | REGISTRAR | Record a payment | ✅ Implemented |
| GET | `/api/payments` | STAFF/STUDENT | List payments (filtered by role) | ⚠️ Staff only |
| GET | `/api/payments/[id]` | STAFF | Get payment details | ❌ Not implemented |
| GET | `/api/fees/[enrollmentId]` | STAFF | Get enrollment balance | ✅ Implemented |

**Proposed additions:**
- GET `/api/payments/[id]` - Payment details
- Extend GET `/api/payments` - Student access with filtering
- (Optional) GET `/api/payments/[id]/receipt` - Receipt data

## Business Rules (from existing implementation)

1. **Payment Creation**:
   - Amount must be positive with max 2 decimal places
   - Cannot exceed outstanding balance (OVERPAYMENT error)
   - Only ACTIVE enrollments accept payments (ENROLLMENT_NOT_PAYABLE)
   - Idempotency key prevents duplicate submissions
   - Reference must be unique (PAYMENT_EXISTS)
   - Creates audit log in same transaction

2. **Payment Immutability**:
   - No UPDATE or DELETE endpoints
   - Refunds/voids are out of scope (future feature)
   - Payment records are append-only

3. **Balance Calculation**:
   - `balance = feeTotal - sum(payments)`
   - All calculations use bigint cents to avoid floating-point errors
   - Overdue flag set if balance > 0 and past due date

4. **Authorization**:
   - Payment writes: REGISTRAR role minimum
   - Payment reads: STAFF role (to be extended to students)
   - Students: can only view their own enrollment payments

## Schema Changes Required

**None** - The PaymentTransaction model is already complete and production-ready.

## Dependencies & Utilities

- ✅ `lib/api-utils.ts` - Response helpers
- ✅ `lib/enrollment-fees.ts` - Validation, money helpers
- ✅ `lib/auth-guards.ts` - Auth guards (needs student guard)
- ✅ `lib/auth/log-events.ts` - Audit logging
- ✅ `lib/prisma.ts` - Database client

## Risk Assessment

### Low Risk
- GET endpoints are read-only, no data mutation
- Schema already exists, no migration needed
- Existing payment creation is well-tested
- Decimal handling is already proven correct

### Medium Risk
- Student access adds authorization complexity
  - *Mitigation*: Comprehensive tests for role-based filtering
  - *Mitigation*: Review enrollment relationship to ensure students can only see their own

### No Risk
- Database is currently unavailable per user note
- All validation can be done via `npx prisma validate` and `npx tsc --noEmit`
- Tests use mocked Prisma, no DB connection required

## Success Criteria

### Implementation Complete When:
1. ✅ GET /api/payments/[id] implemented and tested
2. ✅ Student access added to GET /api/payments with proper filtering
3. ✅ All unit tests pass (100% success rate)
4. ✅ Schema validation passes
5. ✅ TypeScript compilation passes with no errors
6. ✅ API documentation created
7. ✅ Greenlight summary provided to UI team

### Quality Metrics:
- **Test Coverage**: Minimum 7 test cases per route
- **Error Handling**: All 4xx and 5xx cases covered
- **Type Safety**: No TypeScript errors
- **Decimal Safety**: All money values as strings
- **Authorization**: Proper role-based access control
- **Audit Trail**: All mutations logged

## Next Steps

1. Implement GET /api/payments/[id] with tests
2. Add requireStudent() auth guard
3. Extend GET /api/payments for student access
4. Run all validations
5. Create API documentation
6. Provide greenlight summary

---

**Estimated Effort**: 2-3 hours
**Complexity**: Low-Medium (building on existing patterns)
**External Dependencies**: None (DB not required for validation)
