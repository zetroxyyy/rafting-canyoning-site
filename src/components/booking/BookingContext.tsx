"use client";

import { createContext, useContext, useReducer, useCallback } from "react";

export type ActivityType = "RAFTING" | "CANYONING" | "COMBO";

export interface ParticipantData {
  participantType: "ADULT" | "CHILD";
  firstName: string;
  lastName: string;
  age: string;
  waiverAccepted: boolean;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  accommodation?: string;
  dietaryNotes?: string;
  swimmingConfidence?: string;
  medicalNotes?: string;
}

// ─── Pricing shape passed in from the server ──────────────────────────────────

export interface BookingPrices {
  raftingAdult:   number;
  raftingChild:   number;
  canyoningAdult: number;
  canyoningChild: number;
  comboAdult:     number;
  comboChild:     number;
  bbq:            number;
}

// Static fallback (matches PRICING in utils.ts).
export const DEFAULT_PRICES: BookingPrices = {
  raftingAdult:   6000,
  raftingChild:   4000,
  canyoningAdult: 6000,
  canyoningChild: 4000,
  comboAdult:     10000,
  comboChild:     6000,
  bbq:            3000,
};

// ─── State ────────────────────────────────────────────────────────────────────

export interface BookingState {
  // Step 1 — Activity
  activityType: ActivityType | null;
  productId: string;
  hasBbq: boolean;

  // Step 2 — Date
  selectedDate: string;

  // Step 3 — Time (skipped for COMBO)
  slotId: string;
  startTime: string;

  // Step 4 — People
  adultCount: number;
  childCount: number;

  // Step 5 — Details
  leadName: string;
  leadEmail: string;
  leadPhone: string;
  leadCountry: string;
  customerNote: string;
  participants: ParticipantData[];

  // Step 6 — Review & Submit
  promoCode: string;
  promoValid: boolean | null;
  discountJpy: number;

  // Meta
  currentStep: number;
}

const initialState: BookingState = {
  activityType: null,
  productId: "",
  hasBbq: false,
  selectedDate: "",
  slotId: "",
  startTime: "",
  adultCount: 2,
  childCount: 0,
  leadName: "",
  leadEmail: "",
  leadPhone: "",
  leadCountry: "",
  customerNote: "",
  participants: [],
  promoCode: "",
  promoValid: null,
  discountJpy: 0,
  currentStep: 1,
};

// ─── Actions ──────────────────────────────────────────────────────────────────

type Action =
  | { type: "SET_ACTIVITY"; payload: { activityType: ActivityType; productId: string } }
  | { type: "SET_BBQ_ADDON"; payload: boolean }
  | { type: "SET_DATE"; payload: string }
  | { type: "SET_SLOT"; payload: { slotId: string; startTime: string } }
  | { type: "SET_PEOPLE"; payload: { adultCount: number; childCount: number } }
  | { type: "SET_DETAILS"; payload: {
      leadName?: string;
      leadEmail?: string;
      leadPhone?: string;
      leadCountry?: string;
      customerNote?: string;
      participants?: ParticipantData[];
    }}
  | { type: "SET_PROMO"; payload: { code: string; valid: boolean | null; discountJpy: number } }
  | { type: "SET_STEP"; payload: number }
  | { type: "NEXT_STEP" }
  | { type: "PREV_STEP" }
  | { type: "RESET" };

/**
 * For COMBO bookings, Step 3 (Time selection) is bypassed entirely.
 * Steps map: 1=Activity, 2=Date, 3=Time*, 4=People, 5=Details, 6=Review
 * COMBO flow: 1 → 2 → 4 → 5 → 6 (step 3 skipped)
 */
function getNextStep(current: number, activityType: ActivityType | null): number {
  const isCombo = activityType === "COMBO";
  if (isCombo && current === 2) return 4; // skip time step
  if (isCombo && current === 4) return 5;
  return Math.min(current + 1, 6);
}

function getPrevStep(current: number, activityType: ActivityType | null): number {
  const isCombo = activityType === "COMBO";
  if (isCombo && current === 4) return 2; // skip back over time step
  return Math.max(current - 1, 1);
}

function reducer(state: BookingState, action: Action): BookingState {
  switch (action.type) {
    case "SET_ACTIVITY":
      return {
        ...state,
        activityType: action.payload.activityType,
        productId: action.payload.productId,
        selectedDate: "",
        slotId: "",
        startTime: "",
        promoCode: "",
        promoValid: null,
        discountJpy: 0,
      };
    case "SET_BBQ_ADDON":
      return { ...state, hasBbq: action.payload };
    case "SET_DATE":
      return { ...state, selectedDate: action.payload, slotId: "", startTime: "" };
    case "SET_SLOT":
      return { ...state, slotId: action.payload.slotId, startTime: action.payload.startTime };
    case "SET_PEOPLE":
      return {
        ...state,
        ...action.payload,
        promoCode: "",
        promoValid: null,
        discountJpy: 0,
      };
    case "SET_DETAILS":
      return { ...state, ...action.payload };
    case "SET_PROMO":
      return {
        ...state,
        promoCode: action.payload.code,
        promoValid: action.payload.valid,
        discountJpy: action.payload.discountJpy,
      };
    case "SET_STEP":
      return { ...state, currentStep: action.payload };
    case "NEXT_STEP":
      return {
        ...state,
        currentStep: getNextStep(state.currentStep, state.activityType),
      };
    case "PREV_STEP":
      return {
        ...state,
        currentStep: getPrevStep(state.currentStep, state.activityType),
      };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface BookingContextValue {
  state:     BookingState;
  prices:    BookingPrices;
  dispatch:  React.Dispatch<Action>;
  nextStep:  () => void;
  prevStep:  () => void;
}

const BookingContext = createContext<BookingContextValue | null>(null);

export function BookingProvider({
  children,
  prices,
}: {
  children: React.ReactNode;
  prices?: BookingPrices;
}) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const nextStep = useCallback(() => dispatch({ type: "NEXT_STEP" }), []);
  const prevStep = useCallback(() => dispatch({ type: "PREV_STEP" }), []);

  return (
    <BookingContext.Provider value={{
      state,
      prices: prices ?? DEFAULT_PRICES,
      dispatch,
      nextStep,
      prevStep,
    }}>
      {children}
    </BookingContext.Provider>
  );
}

export function useBooking() {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error("useBooking must be used within BookingProvider");
  return ctx;
}
