-- H4: cancellation computed refund_amount and told the guest it "will be processed" but nothing
-- dispatched it. Adds a durable refund_status so a paid cancellation records a trackable refund
-- request. A refund worker / ops process (or a future automated dispatcher to payment-queue's
-- refund flow) actions rows where refund_status = 'requested'. Applied 2026-08-19 via MCP.
ALTER TABLE public.hotel_bookings
  ADD COLUMN IF NOT EXISTS refund_status text
    CHECK (refund_status IS NULL OR refund_status IN ('requested', 'processing', 'refunded', 'not_eligible', 'no_payment'));
