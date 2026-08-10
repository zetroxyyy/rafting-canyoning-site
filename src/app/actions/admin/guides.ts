"use server";

/**
 * Guide CRUD Server Actions — STUB
 *
 * The Guide model has been removed from the schema.
 * These stubs preserve the export surface to prevent import errors.
 */

export interface GuideRow {
  id:        string;
  name:      string;
  phone:     string | null;
  isActive:  boolean;
  createdAt: string;
}

export interface GuideInput {
  name:  string;
  phone: string | null;
}

export async function listGuides(_includeInactive = false): Promise<GuideRow[]> {
  return [];
}

export async function createGuide(
  _input: GuideInput
): Promise<{ success: true; id: string } | { error: string }> {
  return { error: "Guide management has been removed from this system." };
}

export async function updateGuide(
  _id: string,
  _input: Partial<GuideInput>
): Promise<{ success: true } | { error: string }> {
  return { error: "Guide management has been removed from this system." };
}

export async function toggleGuide(
  _id: string,
  _isActive: boolean
): Promise<{ success: true } | { error: string }> {
  return { error: "Guide management has been removed from this system." };
}
