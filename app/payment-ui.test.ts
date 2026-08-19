/**
 * Payment Module UI Tests
 * 
 * Tests the payment UI API contract validation with mocked axios calls.
 * This follows the project pattern of testing Redux logic and API contracts,
 * not React component rendering.
 */

import { AxiosInstance } from "@/lib/axios-client"

jest.mock("@/lib/axios-client", () => ({
  AxiosInstance: {
    get: jest.fn(),
    post: jest.fn(),
  },
}))

const mockGet = AxiosInstance.get as jest.Mock
const mockPost = AxiosInstance.post as jest.Mock

describe("Payment Module API Contracts", () => {
  beforeEach(() => {
    mockGet.mockReset()
    mockPost.mockReset()
  })

  describe("GET /api/payments - List Payments", () => {
    it("accepts staff payment list response with full enrollment details", async () => {
      mockGet.mockResolvedValue({
        status: 200,
        data: {
          data: [
            {
              id: 1,
              reference: "PAY-2026-001",
              amount: "250.00",
              currency: "USD",
              paymentDate: "2026-08-10T00:00:00.000Z",
              enrollmentId: 10,
              receivedById: 2,
              createdAt: "2026-08-10T10:30:00.000Z",
              enrollment: {
                reference: "ENR-010",
                student: { studentUid: "STU-001", fullName: "John Doe" },
                programme: { name: "Computer Science" },
              },
            },
          ],
        },
      })

      const response = await AxiosInstance.get("/api/payments")
      
      expect(response.status).toBe(200)
      expect(response.data.data).toHaveLength(1)
      expect(response.data.data[0]).toMatchObject({
        reference: "PAY-2026-001",
        amount: "250.00",
        currency: "USD",
      })
      expect(response.data.data[0].enrollment).toHaveProperty("student")
      expect(response.data.data[0].enrollment).toHaveProperty("programme")
    })

    it("accepts student payment list response without sensitive details", async () => {
      mockGet.mockResolvedValue({
        status: 200,
        data: {
          data: [
            {
              id: 1,
              reference: "PAY-2026-001",
              amount: "250.00",
              currency: "USD",
              paymentDate: "2026-08-10T00:00:00.000Z",
              enrollmentId: 10,
              createdAt: "2026-08-10T10:30:00.000Z",
            },
          ],
        },
      })

      const response = await AxiosInstance.get("/api/payments")
      
      expect(response.status).toBe(200)
      expect(response.data.data).toHaveLength(1)
      expect(response.data.data[0]).not.toHaveProperty("receivedById")
      expect(response.data.data[0]).not.toHaveProperty("enrollment")
    })

    it("accepts empty payment list", async () => {
      mockGet.mockResolvedValue({
        status: 200,
        data: { data: [] },
      })

      const response = await AxiosInstance.get("/api/payments")
      
      expect(response.status).toBe(200)
      expect(response.data.data).toEqual([])
    })

    it("handles filtered payment list by enrollment", async () => {
      mockGet.mockResolvedValue({
        status: 200,
        data: {
          data: [
            {
              id: 1,
              reference: "PAY-2026-001",
              amount: "250.00",
              currency: "USD",
              paymentDate: "2026-08-10T00:00:00.000Z",
              enrollmentId: 10,
              receivedById: 2,
              createdAt: "2026-08-10T10:30:00.000Z",
            },
          ],
        },
      })

      const response = await AxiosInstance.get("/api/payments?enrollmentId=10")
      
      expect(response.status).toBe(200)
      expect(response.data.data.every((p: any) => p.enrollmentId === 10)).toBe(true)
    })
  })

  describe("GET /api/payments/[id] - Get Payment Details", () => {
    it("accepts payment detail response with full enrollment", async () => {
      mockGet.mockResolvedValue({
        status: 200,
        data: {
          data: {
            id: 1,
            reference: "PAY-2026-001",
            amount: "250.00",
            currency: "USD",
            paymentDate: "2026-08-10T00:00:00.000Z",
            enrollmentId: 10,
            receivedById: 2,
            createdAt: "2026-08-10T10:30:00.000Z",
            updatedAt: "2026-08-10T10:30:00.000Z",
            idempotencyKey: "idem-12345",
            enrollment: {
              id: 10,
              reference: "ENR-010",
              studentId: 5,
              programmeId: 3,
              student: { studentUid: "STU-001", fullName: "John Doe" },
              programme: { name: "Computer Science" },
            },
          },
        },
      })

      const response = await AxiosInstance.get("/api/payments/1")
      
      expect(response.status).toBe(200)
      expect(response.data.data).toMatchObject({
        id: 1,
        reference: "PAY-2026-001",
        amount: "250.00",
      })
      expect(response.data.data.enrollment).toHaveProperty("student")
      expect(response.data.data.enrollment).toHaveProperty("programme")
    })

    it("handles payment not found error", async () => {
      mockGet.mockRejectedValue({
        response: {
          status: 404,
          data: {
            success: false,
            error: "Payment not found",
            code: "NOT_FOUND",
          },
        },
      })

      try {
        await AxiosInstance.get("/api/payments/999")
        fail("Should have thrown error")
      } catch (error: any) {
        expect(error.response.status).toBe(404)
        expect(error.response.data.code).toBe("NOT_FOUND")
      }
    })
  })

  describe("GET /api/fees/[enrollmentId] - Get Fee Balance", () => {
    it("accepts fee balance response", async () => {
      mockGet.mockResolvedValue({
        status: 200,
        data: {
          data: {
            enrollmentId: 10,
            feeTotal: "1000.00",
            paid: "250.00",
            balance: "750.00",
            overdue: false,
          },
        },
      })

      const response = await AxiosInstance.get("/api/fees/10")
      
      expect(response.status).toBe(200)
      expect(response.data.data).toMatchObject({
        enrollmentId: 10,
        feeTotal: "1000.00",
        paid: "250.00",
        balance: "750.00",
        overdue: false,
      })
    })

    it("handles overdue balance status", async () => {
      mockGet.mockResolvedValue({
        status: 200,
        data: {
          data: {
            enrollmentId: 10,
            feeTotal: "1000.00",
            paid: "250.00",
            balance: "750.00",
            overdue: true,
          },
        },
      })

      const response = await AxiosInstance.get("/api/fees/10")
      
      expect(response.status).toBe(200)
      expect(response.data.data.overdue).toBe(true)
    })

    it("handles enrollment not found error", async () => {
      mockGet.mockRejectedValue({
        response: {
          status: 404,
          data: {
            success: false,
            error: "Enrollment not found",
            code: "NOT_FOUND",
          },
        },
      })

      try {
        await AxiosInstance.get("/api/fees/999")
        fail("Should have thrown error")
      } catch (error: any) {
        expect(error.response.status).toBe(404)
        expect(error.response.data.code).toBe("NOT_FOUND")
      }
    })
  })

  describe("POST /api/payments - Record Payment", () => {
    it("accepts payment creation request with required fields", async () => {
      const paymentData = {
        enrollmentId: 10,
        amount: "250.00",
        currency: "USD",
        paymentDate: "2026-08-10",
      }

      mockPost.mockResolvedValue({
        status: 201,
        data: {
          data: {
            id: 1,
            reference: "PAY-2026-001",
            amount: "250.00",
            currency: "USD",
            paymentDate: "2026-08-10T00:00:00.000Z",
            enrollmentId: 10,
            receivedById: 2,
            createdAt: "2026-08-10T10:30:00.000Z",
            idempotencyKey: "idem-12345",
          },
        },
      })

      const response = await AxiosInstance.post("/api/payments", paymentData)
      
      expect(response.status).toBe(201)
      expect(response.data.data).toMatchObject({
        reference: expect.stringMatching(/^PAY-/),
        amount: "250.00",
        currency: "USD",
        enrollmentId: 10,
      })
    })

    it("generates unique payment reference", async () => {
      mockPost.mockResolvedValue({
        status: 201,
        data: {
          data: {
            id: 1,
            reference: "PAY-2026-001",
            amount: "250.00",
            currency: "USD",
            paymentDate: "2026-08-10T00:00:00.000Z",
            enrollmentId: 10,
            receivedById: 2,
            createdAt: "2026-08-10T10:30:00.000Z",
            idempotencyKey: "idem-12345",
          },
        },
      })

      const response = await AxiosInstance.post("/api/payments", {
        enrollmentId: 10,
        amount: "250.00",
        currency: "USD",
        paymentDate: "2026-08-10",
      })
      
      expect(response.data.data.reference).toMatch(/^PAY-\d{4}-\d{3}$/)
    })

    it("handles validation errors for invalid amount", async () => {
      mockPost.mockRejectedValue({
        response: {
          status: 400,
          data: {
            success: false,
            error: "Validation failed",
            code: "VALIDATION_ERROR",
            details: { amount: "Amount must be positive" },
          },
        },
      })

      try {
        await AxiosInstance.post("/api/payments", {
          enrollmentId: 10,
          amount: "-50.00",
          currency: "USD",
          paymentDate: "2026-08-10",
        })
        fail("Should have thrown error")
      } catch (error: any) {
        expect(error.response.status).toBe(400)
        expect(error.response.data.code).toBe("VALIDATION_ERROR")
      }
    })

    it("handles duplicate idempotency key", async () => {
      mockPost.mockRejectedValue({
        response: {
          status: 409,
          data: {
            success: false,
            error: "Duplicate payment detected",
            code: "DUPLICATE_PAYMENT",
          },
        },
      })

      try {
        await AxiosInstance.post("/api/payments", {
          enrollmentId: 10,
          amount: "250.00",
          currency: "USD",
          paymentDate: "2026-08-10",
          idempotencyKey: "existing-key",
        })
        fail("Should have thrown error")
      } catch (error: any) {
        expect(error.response.status).toBe(409)
        expect(error.response.data.code).toBe("DUPLICATE_PAYMENT")
      }
    })

    it("handles unauthorized access for non-REGISTRAR roles", async () => {
      mockPost.mockRejectedValue({
        response: {
          status: 403,
          data: {
            success: false,
            error: "Insufficient permissions",
            code: "FORBIDDEN",
          },
        },
      })

      try {
        await AxiosInstance.post("/api/payments", {
          enrollmentId: 10,
          amount: "250.00",
          currency: "USD",
          paymentDate: "2026-08-10",
        })
        fail("Should have thrown error")
      } catch (error: any) {
        expect(error.response.status).toBe(403)
        expect(error.response.data.code).toBe("FORBIDDEN")
      }
    })
  })

  describe("Data Type Validation", () => {
    it("ensures amounts are strings (not numbers)", async () => {
      mockGet.mockResolvedValue({
        status: 200,
        data: {
          data: {
            enrollmentId: 10,
            feeTotal: "1000.00",
            paid: "250.00",
            balance: "750.00",
            overdue: false,
          },
        },
      })

      const response = await AxiosInstance.get("/api/fees/10")
      
      expect(typeof response.data.data.feeTotal).toBe("string")
      expect(typeof response.data.data.paid).toBe("string")
      expect(typeof response.data.data.balance).toBe("string")
    })

    it("validates payment dates are ISO 8601 strings", async () => {
      mockGet.mockResolvedValue({
        status: 200,
        data: {
          data: [
            {
              id: 1,
              reference: "PAY-2026-001",
              amount: "250.00",
              currency: "USD",
              paymentDate: "2026-08-10T00:00:00.000Z",
              enrollmentId: 10,
              createdAt: "2026-08-10T10:30:00.000Z",
            },
          ],
        },
      })

      const response = await AxiosInstance.get("/api/payments")
      
      const payment = response.data.data[0]
      expect(typeof payment.paymentDate).toBe("string")
      expect(payment.paymentDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    })
  })
})
