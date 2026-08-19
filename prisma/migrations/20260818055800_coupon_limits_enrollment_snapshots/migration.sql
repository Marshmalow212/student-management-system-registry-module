-- Coupons have a usage count rather than a monetary discount cap. Existing
-- enrolments retain their recorded total; their new component snapshots remain
-- NULL because historical catalogue values cannot be reconstructed reliably.
ALTER TABLE "Programme"
    DROP COLUMN "discountLimit",
    ADD COLUMN "couponLimit" INTEGER,
    ADD COLUMN "couponUsed" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Programme"
    ADD CONSTRAINT "Programme_couponLimit_nonnegative"
        CHECK ("couponLimit" IS NULL OR "couponLimit" >= 0),
    ADD CONSTRAINT "Programme_couponUsed_nonnegative"
        CHECK ("couponUsed" >= 0),
    ADD CONSTRAINT "Programme_couponUsed_withinLimit"
        CHECK ("couponLimit" IS NULL OR "couponUsed" <= "couponLimit");

CREATE INDEX "Programme_coupon_status_deletedAt_idx"
    ON "Programme"("coupon", "status", "deletedAt");

-- Keep the fee charged and discount applied at enrolment independent from
-- mutable programme pricing. Nullable columns preserve the unknown values for
-- pre-existing enrolments without fabricating historical financial data.
ALTER TABLE "StudentEnrollment"
    ADD COLUMN "feeSnapshot" DECIMAL(12,2),
    ADD COLUMN "discountSnapshot" DECIMAL(12,2);

ALTER TABLE "StudentEnrollment"
    ADD CONSTRAINT "StudentEnrollment_feeSnapshot_nonnegative"
        CHECK ("feeSnapshot" IS NULL OR "feeSnapshot" >= 0),
    ADD CONSTRAINT "StudentEnrollment_discountSnapshot_nonnegative"
        CHECK ("discountSnapshot" IS NULL OR "discountSnapshot" >= 0),
    ADD CONSTRAINT "StudentEnrollment_discountSnapshot_withinFee"
        CHECK (
            "feeSnapshot" IS NULL
            OR "discountSnapshot" IS NULL
            OR "discountSnapshot" <= "feeSnapshot"
        );
