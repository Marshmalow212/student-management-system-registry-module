"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { HugeiconsIcon } from "@hugeicons/react"
import { AlertCircleIcon, CheckmarkCircle02Icon } from "@hugeicons/core-free-icons"
import type { Balance } from "@/types/payment"

type BalanceWidgetProps = {
  balance: Balance
}

function formatMoney(amount: string, currency: string = "USD") {
  return `${currency} ${amount}`
}

export function BalanceWidget({ balance }: BalanceWidgetProps) {
  const isPaidInFull = parseFloat(balance.balance) === 0

  return (
    <Card className={balance.overdue ? "border-destructive" : ""}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Enrollment Balance</span>
          {isPaidInFull ? (
            <Badge variant="default" className="gap-1">
              <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} className="h-3 w-3" />
              Paid in Full
            </Badge>
          ) : balance.overdue ? (
            <Badge variant="destructive" className="gap-1">
              <HugeiconsIcon icon={AlertCircleIcon} strokeWidth={2} className="h-3 w-3" />
              Overdue
            </Badge>
          ) : (
            <Badge variant="secondary">Outstanding</Badge>
          )}
        </CardTitle>
        <CardDescription>
          Enrollment ID: <code className="text-xs">{balance.enrollmentId}</code>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">
              Total Fee
            </p>
            <p className="text-2xl font-bold">
              {formatMoney(balance.feeTotal)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">
              Amount Paid
            </p>
            <p className="text-2xl font-bold text-green-600">
              {formatMoney(balance.paid)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">
              Outstanding Balance
            </p>
            <p className={`text-2xl font-bold ${isPaidInFull ? "text-green-600" : balance.overdue ? "text-destructive" : ""}`}>
              {formatMoney(balance.balance)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
