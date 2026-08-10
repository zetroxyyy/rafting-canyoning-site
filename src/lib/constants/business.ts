/**
 * Single source of truth for Dream Adventure's NAP (Name/Address/Phone) and
 * map data. Import from here everywhere — do not hardcode these values
 * again anywhere else.
 *
 * This file exists because the Gunma pivot audit (docs/GUNMA_LOCATION_PIVOT.md)
 * found the phone number and address already drifted into disagreement across
 * the codebase before this fix: LocalBusinessSchema.tsx hardcoded one phone
 * number, the homepage JSON-LD another, and three different addresses existed
 * in transactional emails, PDFs, and structured data.
 *
 * 2026-07-30 relocation: base moved to Nakahotchimachi, Numata (378-0072).
 * Rafting is still on the Tone River — only the reception/base address changed.
 *
 * Note: messages/ja.json and messages/en.json cannot import this file (they
 * are static JSON). A later coding pass will enter the matching literal values
 * there by hand — those values must stay in sync with the constants below.
 */

export const BUSINESS_NAME_LEGAL = "Dream Adventure";
export const BUSINESS_NAME_EN = "Dream Adventure Gunma";
export const BUSINESS_NAME_JA = "ドリームアドベンチャー群馬";

export const EMAIL = "contact@thedreamadventure.com";

export const PHONE_PRIMARY_DISPLAY = "090-3338-1375";
export const PHONE_PRIMARY_E164 = "+81-90-3338-1375";
export const PHONE_PRIMARY_TEL_HREF = `tel:${PHONE_PRIMARY_E164}`;

export const PHONE_SUPPORT_DISPLAY = "070-3603-2375";
export const PHONE_SUPPORT_E164 = "+81-70-3603-2375";
export const PHONE_SUPPORT_TEL_HREF = `tel:${PHONE_SUPPORT_E164}`;

export const ADDRESS_EN =
  "946-1 Nakahotchimachi, Numata, Gunma 378-0072, Japan";
export const ADDRESS_JA = "〒378-0072 群馬県沼田市中発知町946-1";

export const ADDRESS_SCHEMA = {
  streetAddress: "946-1 Nakahotchimachi",
  addressLocality: "Numata",
  addressRegion: "Gunma",
  postalCode: "378-0072",
  addressCountry: "JP",
} as const;

export const GEO_LATITUDE = 36.7073005;
export const GEO_LONGITUDE = 139.0657068;

export const TRANSIT_DESC_EN = "17 minutes by car from Numata Station";
export const TRANSIT_DESC_JA = "沼田駅から車で17分";

// Business-entity embed — Place ID 0x601e15002a78a8c5:0x7d9412102a70fdcf (Dream Adventure GBP).
// Do NOT replace with an address-point embed: that reverts the pin label to the street address.
export const MAP_EMBED_SRC =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d799.6588166606484!2d139.0650617284408!3d36.707301573423166!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x601e15002a78a8c5%3A0x7d9412102a70fdcf!2sDream%20Adventure!5e0!3m2!1sen!2snp!4v1786254272071!5m2!1sen!2snp";

export const MAP_SHORT_LINK = "https://maps.app.goo.gl/hu26QtEsbWPtbcvB8";
