import { z } from "zod";

// ─── Age constants ─────────────────────────────────────────────────────────────

export const AGE_ADULT_MIN = 18;
export const AGE_ADULT_MAX = 99;

// Child minimums differ by activity:
//   RAFTING    → 6–17
//   CANYONING  → 12–17  (more physically demanding; matches on-site policy)
export const AGE_CHILD_MIN_RAFTING   = 6;
export const AGE_CHILD_MIN_CANYONING = 12;
export const AGE_CHILD_MAX           = 17;

// ─── Activity-aware participant schema factory ─────────────────────────────────
//
// Call makeParticipantSchema("RAFTING") or makeParticipantSchema("CANYONING")
// to get a Zod schema with the correct child-age range baked in.
//
// Falls back to RAFTING limits when activityType is undefined (e.g. admin forms).

export function makeParticipantSchema(
  activityType?: "RAFTING" | "CANYONING" | string | null
) {
  const childMin =
    activityType === "CANYONING"
      ? AGE_CHILD_MIN_CANYONING
      : AGE_CHILD_MIN_RAFTING;

  return z
    .object({
      participantType: z.enum(["ADULT", "CHILD"]),
      firstName:       z.string().min(1, "First name is required"),
      lastName:        z.string().optional(),
      age:             z.coerce.number().int().min(1, "Age is required").max(99, "Please enter a valid age"),
      waiverAccepted:  z.boolean().refine((v) => v === true, {
        message: "Waiver must be accepted",
      }),
    })
    .superRefine((data, ctx) => {
      if (data.age === undefined || data.age === null) return;
      const addIssue = (path: string[], message: string) =>
        ctx.addIssue({ code: "custom", path, message });

      if (data.participantType === "ADULT") {
        if (data.age < AGE_ADULT_MIN) {
          addIssue(["age"], `Adults must be at least ${AGE_ADULT_MIN} years old.`);
        } else if (data.age > AGE_ADULT_MAX) {
          addIssue(["age"], `Please enter a valid age (max ${AGE_ADULT_MAX}).`);
        }
      } else {
        // CHILD — enforced range depends on activity
        if (data.age < childMin) {
          addIssue(
            ["age"],
            `Children must be at least ${childMin} years old for this activity. ` +
              `Participants under ${childMin} cannot participate.`
          );
        } else if (data.age > AGE_CHILD_MAX) {
          addIssue(
            ["age"],
            `Children must be ${AGE_CHILD_MAX} or younger. ` +
              `Participants ${AGE_ADULT_MIN}+ should be booked as Adults.`
          );
        }
      }
    });
}

// ─── Default participant schema (RAFTING limits — backward-compatible) ─────────
//
// Used by admin tooling and any place that doesn't have activity context.
export const participantSchema = makeParticipantSchema("RAFTING");

// ─── Booking details schema factory ──────────────────────────────────────────
//
// makeBookingDetailsSchema(activityType) bakes in the correct participant
// age floor for client-side react-hook-form validation.  This keeps the
// browser inline errors (Rafting 6+ vs Canyoning 12+) identical to the
// server-side API check.

export function makeBookingDetailsSchema(
  activityType?: "RAFTING" | "CANYONING" | string | null
) {
  return z.object({
    activityType: z.enum(["RAFTING", "CANYONING"]).optional(),
    // TASK 3: .max() bounds match the backend /api/booking/create Zod schema.
    // Mismatch here would allow the frontend form to accept values that the
    // server then rejects with a 400, creating a frustrating UX.
    leadName:     z.string().min(2, "Name is required").max(200, "Name is too long"),
    leadEmail:    z.string().email("Valid email required"),
    leadPhone:    z.string().max(30, "Phone number too long").optional(),
    leadCountry:  z.string().max(100, "Country name too long").optional(),
    customerNote: z.string().max(2000, "Note must be 2000 characters or less").optional(),
    participants: z.array(makeParticipantSchema(activityType)).min(1),
  });
}

// ─── Default booking details schema (Rafting limits — backward-compatible) ─────
//
// Used by any caller that doesn't have activity context (e.g. admin tooling,
// legacy API routes that already do their own activity-aware checks downstream).
export const bookingDetailsSchema = makeBookingDetailsSchema("RAFTING");

// ─── Other public schemas ──────────────────────────────────────────────────────

export const contactFormSchema = z.object({
  name:    z.string().min(1, "Name is required"),
  email:   z.string().email("Valid email required"),
  phone:   z.string().optional(),
  subject: z.string().optional(),
  message: z.string().min(10, "Message must be at least 10 characters"),
  locale:  z.enum(["en", "ja"]).default("en"),
});

export const manageBookingSchema = z.object({
  reference: z
    .string()
    .regex(/^DA-\d{6}-[A-Z0-9]{4}$/, "Invalid booking reference format"),
  email: z.string().email("Valid email required"),
});

export const adminLoginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

export const promoCodeSchema = z.object({
  code:            z.string().min(1).max(50),
  bookingSubtotal: z.number().int().min(0),
});

// ─── Inferred types ────────────────────────────────────────────────────────────

export type ParticipantInput    = z.infer<typeof participantSchema>;
export type BookingDetailsInput = z.infer<typeof bookingDetailsSchema>;
export type ContactFormInput    = z.infer<typeof contactFormSchema>;
export type ManageBookingInput  = z.infer<typeof manageBookingSchema>;
export type AdminLoginInput     = z.infer<typeof adminLoginSchema>;
