import type { Metadata } from "next";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: {
    template: "%s | Dream Adventure Gunma",
    default: "Dream Adventure Gunma",
  },
  description:
    "Premier river rafting and canyoning in Gunma, Japan.",
  metadataBase: new URL("https://thedreamadventure.com"),
  icons: {
    icon: "/favicon/favicon.ico",
    shortcut: "/favicon/favicon.ico",
    apple: "/favicon/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
