export type Payment = {
  id: number
  reference: string
  amount: string
  currency: string
  paymentDate: string
  enrollmentId: number
  receivedById?: number
  createdAt: string
  updatedAt?: string
  idempotencyKey?: string
  enrollment?: {
    id?: number
    reference: string
    studentId?: number
    programmeId?: number
    student: { studentUid: string; fullName: string }
    programme: { name: string }
  }
  receivedBy?: {
    name: string
    email: string
  }
}

export type Balance = {
  enrollmentId: number
  feeTotal: string
  paid: string
  balance: string
  overdue: boolean
}
