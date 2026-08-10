import React from "react";
import {
  BUSINESS_NAME_LEGAL,
  EMAIL,
  PHONE_PRIMARY_E164,
  ADDRESS_SCHEMA,
  MAP_SHORT_LINK,
  GEO_LATITUDE,
  GEO_LONGITUDE,
} from "@/lib/constants/business";

export default function LocalBusinessSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": ["LocalBusiness", "TourOperator"],
    "@id": "https://thedreamadventure.com/#business",
    "name": BUSINESS_NAME_LEGAL,
    "url": "https://thedreamadventure.com",
    "telephone": PHONE_PRIMARY_E164,
    "email": EMAIL,
    "image": "https://thedreamadventure.com/logo.png",
    "priceRange": "¥4000 - ¥10000",
    "address": {
      "@type": "PostalAddress",
      ...ADDRESS_SCHEMA,
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": GEO_LATITUDE,
      "longitude": GEO_LONGITUDE,
    },
    "openingHoursSpecification": [
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ],
        "opens": "08:00",
        "closes": "18:00",
        "validFrom": "2026-04-01",
        "validThrough": "2026-10-31",
      },
    ],
    "hasMap": MAP_SHORT_LINK,
    "description": "Guided whitewater rafting on the Tone River and canyoning in Gunma, Japan. Professional guides and all safety equipment included.",
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
