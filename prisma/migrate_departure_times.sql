-- Migrate old departure times to canonical schedule
-- Old: 12:00 → New: 11:30
-- Old: 14:00 → New: 13:30
-- This fixes the public calendar showing no slots for dates with old-time slots

-- First handle the unique constraint: productId + date + startTime must be unique
-- We need to delete conflicts first, then update

-- Delete slots at 11:30 if a 12:00 slot exists for the same product+date
-- (the 11:30 is already correct, so 12:00 becomes redundant)
DELETE FROM "AvailabilitySlot" s1
WHERE s1."startTime" = '12:00'
AND EXISTS (
  SELECT 1 FROM "AvailabilitySlot" s2
  WHERE s2."productId" = s1."productId"
  AND s2."date" = s1."date"
  AND s2."startTime" = '11:30'
);

-- Now safely update remaining 12:00 → 11:30
UPDATE "AvailabilitySlot"
SET "startTime" = '11:30'
WHERE "startTime" = '12:00';

-- Delete slots at 13:30 if a 14:00 slot exists for the same product+date
DELETE FROM "AvailabilitySlot" s1
WHERE s1."startTime" = '14:00'
AND EXISTS (
  SELECT 1 FROM "AvailabilitySlot" s2
  WHERE s2."productId" = s1."productId"
  AND s2."date" = s1."date"
  AND s2."startTime" = '13:30'
);

-- Now safely update remaining 14:00 → 13:30
UPDATE "AvailabilitySlot"
SET "startTime" = '13:30'
WHERE "startTime" = '14:00';

-- Verify result
SELECT "startTime", COUNT(*) as count
FROM "AvailabilitySlot"
GROUP BY "startTime"
ORDER BY "startTime";
