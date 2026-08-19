# Student Registration API

`POST /api/student-registrations` is an operational registrar-only flow
(Registrar or Admin). It accepts `fullName`, normalized `email`, optional
`dateOfBirth`, and an active `programmeId`; client-supplied user IDs and
academic years are rejected.

The service generates a `studentUid` and enrolment reference, derives the
current calendar year, and atomically creates the Student and its initial
active enrolment. It snapshots catalogue fee and discount in the enrolment.
For a positive programme discount, a valid limited coupon is claimed with a
conditional usage increment in the same transaction. Invalid catalogue
discounts, exhausted coupons, missing programmes, and unique identity
conflicts leave no partial registration.
