# Payment Module - Component Architecture & Data Flow

## Component Hierarchy

```
┌────────────────────────────────────────────────────────────────┐
│                    Browser Navigation                          │
└────────────────────────────────────────────────────────────────┘
                            │
                 ┌──────────┴──────────┐
                 │                     │
         ┌───────▼──────────┐  ┌──────▼──────────┐
         │  Staff Portal    │  │ Student Portal  │
         │  /dashboard      │  │  /student       │
         └───────┬──────────┘  └──────┬──────────┘
                 │                     │
         ┌───────▼──────────┐  ┌──────▼──────────┐
         │  Payments Page   │  │ My Payments Page│
         │ (Server Component│  │(Server Component│
         │  + Auth Check)   │  │  + Auth Check)  │
         └───────┬──────────┘  └──────┬──────────┘
                 │                     │
                 │    ┌────────────────┘
                 │    │
         ┌───────▼────▼──────────┐
         │   AppSidebar          │
         │   + SidebarProvider   │
         └───────────────────────┘
                 │
         ┌───────▼──────────────────────────────────┐
         │         PaymentPage                      │
         │         (Client Component)               │
         │  mode: "staff" | "student"               │
         │                                           │
         │  State:                                   │
         │  • payments[]                             │
         │  • selectedPayment                        │
         │  • balance                                │
         │  • loading states                         │
         │                                           │
         │  API Calls:                               │
         │  • GET /api/payments                      │
         │  • GET /api/payments/:id                  │
         │  • GET /api/fees/:enrollmentId            │
         │  • POST /api/payments                     │
         └───────┬───────────────────────────────────┘
                 │
       ┌─────────┼─────────┐
       │         │         │
   ┌───▼────┐ ┌─▼────────┐ ┌───▼─────────────┐
   │Balance │ │Payment   │ │ PaymentHistory  │
   │Widget  │ │Form      │ │                 │
   └────────┘ └──────────┘ └─────┬───────────┘
                                  │
                          ┌───────▼────────┐
                          │ Dialog         │
                          │ (Payment       │
                          │  Details)      │
                          └────────────────┘
```

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Actions                            │
└─────────────────────────────────────────────────────────────────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         │                     │                     │
    ┌────▼─────┐        ┌─────▼──────┐       ┌─────▼──────┐
    │ Load     │        │ Load       │       │ Record     │
    │ Balance  │        │ Payments   │       │ Payment    │
    └────┬─────┘        └─────┬──────┘       └─────┬──────┘
         │                    │                     │
         │                    │                     │
    ┌────▼─────────────────────▼─────────────────────▼──────┐
    │              PaymentPage State                        │
    │  • enrollmentIdFilter                                 │
    │  • loading / balanceLoading / saving                  │
    │  • error                                              │
    └────┬──────────────────────────────────────────────────┘
         │
         │ Axios Requests (Currently Mocked)
         │
    ┌────▼──────────────────────────────────────────────────┐
    │                    API Layer                          │
    │                                                        │
    │  GET /api/fees/:enrollmentId                          │
    │      → Balance { feeTotal, paid, balance, overdue }   │
    │                                                        │
    │  GET /api/payments?enrollmentId=X                     │
    │      → Payment[] (role-filtered)                      │
    │                                                        │
    │  GET /api/payments/:id                                │
    │      → Payment (with relations)                       │
    │                                                        │
    │  POST /api/payments                                   │
    │      → Payment (newly created)                        │
    └────┬──────────────────────────────────────────────────┘
         │
         │ Response Data
         │
    ┌────▼──────────────────────────────────────────────────┐
    │              PaymentPage State Update                 │
    │  • setBalance(data)                                   │
    │  • setPayments(data)                                  │
    │  • setSelectedPayment(data)                           │
    │  • setLoading(false)                                  │
    │  • setError(null)                                     │
    └────┬──────────────────────────────────────────────────┘
         │
         │ Props Down
         │
    ┌────▼──────────────────────────────────────────────────┐
    │              Child Components Render                  │
    │                                                        │
    │  BalanceWidget    →  Display balance info             │
    │  PaymentHistory   →  Render payment table             │
    │  PaymentForm      →  Render form inputs               │
    └───────────────────────────────────────────────────────┘
```

## Role-Based Access Flow

```
┌──────────────────────────────────────────────────────────────┐
│                    User Authentication                       │
│  getCurrentUser() from lib/auth/current-user                 │
└──────────────────────┬───────────────────────────────────────┘
                       │
         ┌─────────────┴─────────────┐
         │                           │
    ┌────▼────┐                 ┌────▼──────┐
    │ Staff   │                 │ Student   │
    │ role≥1  │                 │ role=0    │
    └────┬────┘                 └────┬──────┘
         │                           │
    ┌────▼────────────┐         ┌────▼─────────────┐
    │ /dashboard/     │         │ /student/        │
    │ payments        │         │ payments         │
    └────┬────────────┘         └────┬─────────────┘
         │                           │
    ┌────▼────────────────────────────▼─────────────┐
    │        PaymentPage Component                  │
    └────┬──────────────────────────────┬───────────┘
         │                              │
    ┌────▼────────────┐            ┌────▼──────────┐
    │ mode="staff"    │            │ mode="student"│
    │                 │            │               │
    │ Features:       │            │ Features:     │
    │ • Filter by     │            │ • View own    │
    │   enrollmentId  │            │   payments    │
    │ • Load balance  │            │               │
    │ • Record payment│            │ No:           │
    │ • View details  │            │ • Payment     │
    │                 │            │   recording   │
    │ API Access:     │            │ • Detail view │
    │ • All payments  │            │               │
    │ • All balances  │            │ API Access:   │
    │                 │            │ • Own payments│
    │                 │            │   only        │
    └─────────────────┘            └───────────────┘
```

## Form Validation Flow

```
┌──────────────────────────────────────────────────────────────┐
│                    PaymentForm Component                     │
└──────────────────────┬───────────────────────────────────────┘
                       │
         ┌─────────────┴─────────────┐
         │                           │
    ┌────▼────────┐           ┌──────▼─────────┐
    │ User Inputs │           │ React Hook Form│
    │ Form Fields │           │ + Zod Resolver │
    └────┬────────┘           └──────┬─────────┘
         │                           │
         │ onChange / onBlur         │
         │                           │
    ┌────▼───────────────────────────▼─────────┐
    │           Zod Validation                 │
    │                                          │
    │  reference:   min(1), max(64)            │
    │  idempotency: min(1), max(128)           │
    │  amount:      /^\d+(\.\d{1,2})?$/        │
    │               refine(not zero)           │
    │  currency:    /^[A-Z]{3}$/               │
    │  paymentDate: optional datetime          │
    └────┬─────────────────────┬───────────────┘
         │                     │
    ┌────▼──────┐         ┌────▼──────┐
    │ Valid     │         │ Invalid   │
    └────┬──────┘         └────┬──────┘
         │                     │
         │                ┌────▼──────────────┐
         │                │ Show Error        │
         │                │ Messages          │
         │                └───────────────────┘
         │
    ┌────▼─────────────────────────────────────┐
    │  onSubmit() → PaymentPage.recordPayment()│
    └────┬─────────────────────────────────────┘
         │
    ┌────▼─────────────────────────────────────┐
    │  POST /api/payments                      │
    │  {                                       │
    │    reference,                            │
    │    idempotencyKey,                       │
    │    enrollmentId,                         │
    │    amount,                               │
    │    currency,                             │
    │    paymentDate (ISO 8601)                │
    │  }                                       │
    └────┬─────────────────────┬───────────────┘
         │                     │
    ┌────▼──────┐         ┌────▼──────────────┐
    │ Success   │         │ Error             │
    │ 201       │         │ 400/409/500       │
    └────┬──────┘         └────┬──────────────┘
         │                     │
    ┌────▼──────┐         ┌────▼──────────────┐
    │ Close     │         │ Display Error     │
    │ Form      │         │ Message           │
    │ Reload    │         │ Keep Form Open    │
    │ Data      │         └───────────────────┘
    └───────────┘
```

## Error Handling Flow

```
┌──────────────────────────────────────────────────────────────┐
│                    API Request Error                         │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       │ Axios Error
                       │
    ┌──────────────────▼───────────────────┐
    │  errorMessage(reason) function       │
    │                                      │
    │  Extract:                            │
    │  • response.data.code                │
    │  • response.data.error               │
    └──────────────────┬───────────────────┘
                       │
         ┌─────────────┴─────────────┐
         │                           │
    ┌────▼────────────┐         ┌────▼────────────┐
    │ Known Error Code│         │ Generic Error   │
    │ (from mapping)  │         │                 │
    └────┬────────────┘         └────┬────────────┘
         │                           │
         │ User-Friendly Message     │ Fallback Message
         │                           │
    ┌────▼───────────────────────────▼─────────────┐
    │         setError(message)                    │
    └────┬─────────────────────────────────────────┘
         │
    ┌────▼─────────────────────────────────────────┐
    │  Display Error Banner                        │
    │  (Red background, destructive text)          │
    │  At top of page                              │
    └──────────────────────────────────────────────┘

Error Code Mapping:
┌─────────────────────────┬──────────────────────────────────┐
│ UNAUTHORIZED            │ Session expired, please sign in  │
│ FORBIDDEN               │ No permission                    │
│ VALIDATION_ERROR        │ Check submitted fields           │
│ PAYMENT_EXISTS          │ Reference already exists         │
│ IDEMPOTENCY_CONFLICT    │ Key belongs to different data    │
│ OVERPAYMENT             │ Exceeds outstanding balance      │
│ ENROLLMENT_NOT_PAYABLE  │ Cannot receive payments          │
│ ENROLLMENT_NOT_FOUND    │ Enrollment doesn't exist         │
│ INTERNAL_ERROR          │ Service unavailable              │
└─────────────────────────┴──────────────────────────────────┘
```

## Component Props Interface

```typescript
// payment-page.tsx
interface PaymentPageProps {
  mode: "staff" | "student"
}

// payment-history.tsx
interface PaymentHistoryProps {
  payments: Payment[]
  mode: "staff" | "student"
  onViewDetails?: (payment: Payment) => void
  selectedPayment?: Payment | null
  detailLoading?: boolean
}

// balance-widget.tsx
interface BalanceWidgetProps {
  balance: {
    enrollmentId: number
    feeTotal: string
    paid: string
    balance: string
    overdue: boolean
  }
}

// payment-form.tsx
interface PaymentFormProps {
  balance?: string
  onSubmit: (values: PaymentFormValues) => Promise<void>
  onCancel?: () => void
  isLoading?: boolean
  error?: string | null
}

interface PaymentFormValues {
  reference: string
  idempotencyKey: string
  amount: string
  currency: string
  paymentDate?: string
}
```

## State Management Pattern

```
PaymentPage (Client Component)
│
├─ Local State (useState)
│  ├─ payments: Payment[]
│  ├─ selectedPayment: Payment | null
│  ├─ balance: Balance | null
│  ├─ enrollmentIdFilter: string
│  ├─ loading: boolean
│  ├─ balanceLoading: boolean
│  ├─ detailLoading: boolean
│  ├─ saving: boolean
│  ├─ error: string | null
│  └─ showPaymentForm: boolean
│
├─ Effects (useEffect)
│  └─ loadPayments() when enrollmentIdFilter changes
│
└─ Callbacks (useCallback)
   ├─ loadPayments()
   ├─ loadPaymentDetail(payment)
   ├─ loadBalance(enrollmentId)
   ├─ recordPayment(values)
   └─ handleEnrollmentIdSubmit(e)

Data flows DOWN via props
Events flow UP via callbacks
```

## Testing Strategy

```
┌──────────────────────────────────────────────────────────────┐
│                    payment-ui.test.ts                        │
└──────────────────────────────────────────────────────────────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         │                     │                     │
    ┌────▼──────┐       ┌──────▼──────┐      ┌──────▼──────┐
    │ Component │       │ User        │      │ API         │
    │ Rendering │       │ Interaction │      │ Contract    │
    │ Tests     │       │ Tests       │      │ Tests       │
    └────┬──────┘       └──────┬──────┘      └──────┬──────┘
         │                     │                     │
    • Renders          • Form inputs        • Correct endpoints
    • Props            • Button clicks      • Correct payloads
    • Modes            • Validation         • Response shapes
    • Empty states     • Submission         • Error handling
                       • Modal open/close
                       
                All tests use mocked AxiosInstance
                       jest.mock("@/lib/axios-client")
```

---

**Key Takeaways:**

1. **Unidirectional Data Flow**: Data flows down from PaymentPage to child components via props
2. **Event Bubbling**: User interactions bubble up via callbacks (onSubmit, onViewDetails, etc.)
3. **Role-Based Rendering**: Single PaymentPage component handles both staff and student modes
4. **Centralized Error Handling**: All API errors funneled through errorMessage() utility
5. **Mocked API Layer**: All axios calls currently mocked, ready for real integration
6. **Validated Forms**: Zod schema validation before API submission
7. **Type Safety**: TypeScript interfaces for all data shapes and props

**Integration Points:**
- Replace `AxiosInstance` mocks with real API calls
- Verify API response shapes match TypeScript types
- Add E2E tests for complete workflows
- Test role-based access at API level (not just UI)
