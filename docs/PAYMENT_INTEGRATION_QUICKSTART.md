# Payment Module - Quick Start Integration Guide

**For**: API Integration Agent  
**Status**: ✅ UI Ready for Integration  
**Date**: 2026-08-18

---

## 🚀 Quick Start (5 Minutes)

### 1. Review What's Complete
```bash
# View implemented components
ls -R components/feature/payment/
ls -R app/dashboard/payments/
ls -R app/student/payments/

# View documentation
cat docs/feature-payment-ui.md
cat docs/PAYMENT_UI_INTEGRATION_SUMMARY.md
```

### 2. Run UI Tests (Currently with Mocks)
```bash
npm test -- app/payment-ui.test.ts

# Expected: 27 tests pass (all mocked)
```

### 3. Start Dev Server & View UI
```bash
npm run dev

# Visit:
# Staff: http://localhost:3000/dashboard/payments
# Student: http://localhost:3000/student/payments
```

---

## 📋 Integration Checklist

### Phase 1: Remove Mocks & Connect Real API
- [ ] **Remove axios mocks** from `app/payment-ui.test.ts`
  - Currently: `jest.mock("@/lib/axios-client")`
  - Action: Remove or conditionally disable mock
  
- [ ] **Verify API endpoints are live**
  ```bash
  # Test endpoints manually
  curl http://localhost:3000/api/payments
  curl http://localhost:3000/api/payments/1
  curl http://localhost:3000/api/fees/10
  ```

- [ ] **Test real API calls** in browser
  - Staff login → Dashboard → Payments
  - Enter enrollment ID → Load Balance
  - Record a payment
  - View payment history

### Phase 2: UI Tests with Real API
- [ ] **Update test setup** to use test database
  ```typescript
  // In jest.setup.js or test file
  beforeAll(async () => {
    // Seed test data
    // Create test users, enrollments, payments
  })
  
  afterAll(async () => {
    // Clean up test data
  })
  ```

- [ ] **Run UI tests against real API**
  ```bash
  npm test -- app/payment-ui.test.ts
  # All 27 tests should still pass
  ```

- [ ] **Verify test coverage**
  ```bash
  npm test -- --coverage app/payment-ui.test.ts
  ```

### Phase 3: End-to-End Testing
- [ ] **Create E2E test file**: `e2e/payment-workflow.spec.ts`
  ```typescript
  // Test scenarios:
  // 1. Staff: Load balance → Record payment → Verify in history
  // 2. Student: View own payments only
  // 3. Error: Overpayment attempt
  // 4. Error: Invalid enrollment ID
  // 5. Idempotency: Submit same payment twice
  ```

- [ ] **Run E2E tests**
  ```bash
  # Assuming Playwright is set up
  npx playwright test e2e/payment-workflow.spec.ts
  ```

### Phase 4: Role-Based Access Testing
- [ ] **Test staff access**
  - Can view all payments ✓
  - Can record payments ✓
  - Can view payment details ✓
  - Can load any enrollment balance ✓

- [ ] **Test student access**
  - Can view own payments only ✓
  - Cannot record payments ✓
  - Cannot view all payments ✓
  - Cannot view payment details ✓

- [ ] **Test unauthorized access**
  - `/dashboard/payments` → redirects to login (not logged in)
  - `/dashboard/payments` → 403 or redirect (student tries to access)
  - `/student/payments` → redirects to login (not logged in)
  - `/student/payments` → 403 or redirect (staff tries to access)

### Phase 5: Error Scenario Testing
- [ ] **Test validation errors**
  - Invalid amount format
  - Zero amount
  - Invalid currency code
  - Missing required fields

- [ ] **Test business rule errors**
  - Overpayment (amount > balance)
  - Payment to cancelled enrollment
  - Payment to completed enrollment
  - Idempotency conflict (same key, different data)
  - Duplicate payment reference

- [ ] **Test network errors**
  - API timeout
  - 500 server error
  - Network disconnection

### Phase 6: Performance & Security
- [ ] **Load testing**
  - Test with 100+ payments
  - Test with multiple enrollments
  - Verify table performance

- [ ] **Idempotency testing**
  - Submit payment with same key twice (should replay)
  - Submit payment with same key, different data (should 409)
  - Verify database has only one payment

- [ ] **Security audit**
  - Students cannot access GET /api/payments/:id
  - Students cannot POST /api/payments
  - Students see only their own payments in list
  - Staff cannot bypass role checks

### Phase 7: Final Verification
- [ ] **Manual testing checklist**
  - [ ] Staff can record payment successfully
  - [ ] Balance updates after payment
  - [ ] Payment appears in history immediately
  - [ ] Student sees payment in their portal
  - [ ] All error messages are user-friendly
  - [ ] No console errors in browser
  - [ ] No TypeScript errors
  - [ ] Mobile responsive design works

- [ ] **Documentation updates**
  - [ ] Update README if needed
  - [ ] Document any integration quirks
  - [ ] Note any deferred features

---

## 🔧 Common Integration Issues & Solutions

### Issue 1: Tests Fail After Removing Mocks
**Problem**: Real API returns different data shape than mocked

**Solution**:
1. Compare API response with mock response in test
2. Update component to handle real data shape
3. Or update API to match documented contract

### Issue 2: CORS Errors in Browser
**Problem**: API blocks requests from frontend

**Solution**:
1. Verify Next.js API routes are in `/app/api/`
2. Check axios client has `withCredentials: true`
3. Verify cookies are being sent

### Issue 3: Students See All Payments
**Problem**: Role-based filtering not working

**Solution**:
1. Verify API checks user role in session
2. Verify API filters payments by student profile
3. Check student profile exists in database

### Issue 4: Balance Not Updating After Payment
**Problem**: UI doesn't refresh after successful payment

**Solution**:
1. Verify `recordPayment()` calls `loadBalance()` after success
2. Verify `recordPayment()` calls `loadPayments()` after success
3. Check for state update issues

### Issue 5: Idempotency Not Working
**Problem**: Same payment recorded twice

**Solution**:
1. Verify API checks `idempotencyKey` uniqueness
2. Verify client generates unique keys (UUID)
3. Check database constraint on `idempotencyKey`

---

## 📊 Expected Test Results

### UI Tests (with real API)
```
PASS  app/payment-ui.test.ts
  Payment Module UI
    PaymentPage - Staff Mode
      ✓ renders staff payment page with enrollment filter
      ✓ loads balance when enrollment ID is submitted
      ✓ displays record payment button when balance is loaded
      ✓ loads and displays payments list
    PaymentPage - Student Mode
      ✓ renders student payment page without enrollment filter
      ✓ loads and displays student's own payments
    PaymentHistory Component
      ✓ displays empty state when no payments
      ✓ renders payment list with staff columns
      ✓ renders payment list without staff-only columns for students
    BalanceWidget Component
      ✓ displays balance information correctly
      ✓ shows overdue badge when balance is overdue
      ✓ shows paid in full badge when balance is zero
    PaymentForm Component
      ✓ renders all payment form fields
      ✓ validates required fields
      ✓ validates amount format
      ✓ validates currency format
      ✓ pre-fills idempotency key
      ✓ submits valid payment data
    API Contract Validation
      ✓ makes correct POST request to record payment
      ✓ makes correct GET request for payment list
      ✓ makes correct GET request with enrollmentId filter
      ✓ makes correct GET request for balance
    Error Handling
      ✓ displays error message on API failure
      ✓ displays specific error for overpayment

Test Suites: 1 passed, 1 total
Tests:       27 passed, 27 total
```

### E2E Tests (after implementation)
```
  Staff Payment Workflow
    ✓ Can record payment and see in history
    ✓ Balance updates after payment
    ✓ Can view payment details
    ✓ Can filter by enrollment ID
    
  Student Payment Workflow
    ✓ Can view own payments
    ✓ Cannot record payments
    ✓ Cannot view all payments
    
  Error Scenarios
    ✓ Overpayment is rejected
    ✓ Invalid enrollment ID shows error
    ✓ Duplicate reference is rejected
    ✓ Idempotency key conflict is handled
```

---

## 🎯 Success Criteria

Integration is complete when:
- ✅ All 27 UI tests pass with real API
- ✅ E2E tests pass for all workflows
- ✅ No TypeScript compilation errors
- ✅ No browser console errors
- ✅ Staff can record payments successfully
- ✅ Students can view their own payments
- ✅ Role-based access works correctly
- ✅ All error scenarios handled gracefully
- ✅ Idempotency works as expected
- ✅ Performance is acceptable (< 2s load time)
- ✅ Mobile responsive design works
- ✅ Accessibility (ARIA, keyboard nav) works

---

## 📞 Need Help?

### Documentation
- **UI Docs**: [docs/feature-payment-ui.md](docs/feature-payment-ui.md)
- **API Docs**: [docs/PAYMENT_API_GREENLIGHT.md](docs/PAYMENT_API_GREENLIGHT.md)
- **Architecture**: [docs/PAYMENT_COMPONENT_ARCHITECTURE.md](docs/PAYMENT_COMPONENT_ARCHITECTURE.md)
- **Summary**: [docs/PAYMENT_UI_INTEGRATION_SUMMARY.md](docs/PAYMENT_UI_INTEGRATION_SUMMARY.md)

### File Locations
```
UI Components:
├── components/feature/payment/payment-page.tsx
├── components/feature/payment/payment-history.tsx
├── components/feature/payment/balance-widget.tsx
└── components/forms/payment-form.tsx

Pages:
├── app/dashboard/payments/page.tsx
└── app/student/payments/page.tsx

Tests:
└── app/payment-ui.test.ts

Navigation:
└── components/app-sidebar.tsx
```

### Key Concepts
- **Money as Strings**: Never convert amounts to numbers
- **Idempotency**: UUIDs generated client-side with `crypto.randomUUID()`
- **Role-Based**: Single component, mode prop controls behavior
- **Error Mapping**: All API errors mapped to user-friendly messages
- **State Management**: Local state in PaymentPage, props down to children

---

## 🎬 Getting Started Now

```bash
# 1. Install dependencies (if not already)
npm install

# 2. Run UI tests (currently mocked)
npm test -- app/payment-ui.test.ts

# 3. Start dev server
npm run dev

# 4. Test in browser
# Staff: http://localhost:3000/dashboard/payments
# Student: http://localhost:3000/student/payments

# 5. Remove mocks and start integration
# Edit: app/payment-ui.test.ts
# Remove: jest.mock("@/lib/axios-client")

# 6. Run tests with real API
npm test -- app/payment-ui.test.ts

# 7. Create E2E tests
# Create: e2e/payment-workflow.spec.ts

# 8. Final verification
npm test
npm run build
```

---

**Ready to integrate!** 🚀  
All UI components are production-ready and waiting for real API connection.

**Next Steps**: Remove mocks → Test with real API → Add E2E tests → Ship! 🎉
