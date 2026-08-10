/**
 * Manifest Engine — Shared Constants and Types
 *
 * This file is intentionally NOT a "use server" module so that constants and
 * TypeScript interfaces can be imported freely by both Server Components,
 * Client Components, and server action files without violating the Next.js
 * App Router rule that "use server" files may only export async functions.
 */

// ─── Physical Capacity Constants ──────────────────────────────────────────────

/** Maximum number of human participants (guests) per raft — not counting the guide. */
export const MAX_HUMANS_PER_RAFT = 7;


/** Canonical ordered raft/group names for a single departure slot. */
export const RAFT_NAMES = ["Raft A", "Raft B", "Raft C", "Raft D"] as const;

/** Canonical group names used for Canyoning (no dogs, no raft branding). */
export const GROUP_NAMES = ["Group 1", "Group 2", "Group 3", "Group 4"] as const;

/** Union type derived from RAFT_NAMES tuple. */
export type RaftName = (typeof RAFT_NAMES)[number];

// ─── Activity-type helper ────────────────────────────────────────────────────

/**
 * Returns true when the activity type string corresponds to a Canyoning trip.
 * Canyoning manifests use Group labels instead of Raft labels, and dog capacity
 * guards are completely disabled (no dogs in canyons).
 */
export function isCanyoning(activityType: string): boolean {
  return activityType?.toUpperCase() === "CANYONING";
}

/**
 * Given a raw DB raftName ("Raft A") and the activity type, returns the
 * display label appropriate for the UI and CSV export.
 * Rafting → "Raft A" | "Raft B" ...
 * Canyoning → "Group 1" | "Group 2" ...
 */
export function displayGroupName(raftName: string, activityType: string): string {
  if (!isCanyoning(activityType)) return raftName;
  const map: Record<string, string> = {
    "Raft A": "Group 1",
    "Raft B": "Group 2",
    "Raft C": "Group 3",
    "Raft D": "Group 4",
  };
  return map[raftName] ?? raftName;
}

// ─── Domain Types ─────────────────────────────────────────────────────────────

/**
 * A single participant record, serialized for transport between Server and
 * Client Components (all Dates converted to strings).
 */
export interface ParticipantData {
  id:               string;
  bookingId:        string;
  bookingRef:       string;
  firstName:        string;
  lastName:         string | null;
  participantType:  string;
  age:              number | null;
  medicalNotes:     string | null;
  raftAllocationId: string | null;
}

/**
 * A single physical raft allocation with its assigned guide and current
 * participant list. humanCount and dogCount are pre-computed to avoid
 * re-deriving them in every render.
 */
export interface RaftAllocationData {
  id:           string;
  raftName:     string;
  guide:        { id: string; name: string } | null;
  participants: ParticipantData[];
  humanCount:   number;
}

/**
 * The complete manifest for a single departure slot — the shape returned by
 * `getSlotManifest` and held in ManifestBuilder's local state.
 *
 * activityType is included so the UI and CSV export can conditionally
 * apply polymorphic logic (Rafting vs Canyoning).
 */
export interface SlotManifest {
  slotId:       string;
  date:         string;   // YYYY-MM-DD
  startTime:    string;
  productName:  string;
  activityType: string;   // "RAFTING" | "CANYONING"
  allocations:  RaftAllocationData[];
  unassigned:   ParticipantData[];
}
