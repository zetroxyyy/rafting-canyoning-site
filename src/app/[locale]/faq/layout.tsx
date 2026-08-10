import type { Metadata } from "next";

interface Props {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const isJa = locale === "ja";
  return {
    title: isJa ? "よくある質問 (FAQ)" : "Frequently Asked Questions (FAQ)",
    description: isJa
      ? "予約方法、持ち物、服装、雨天時の催行、キャンセル規定など、群馬のアウトドア体験に関するよくあるご質問にお答えします。"
      : "Find answers to frequently asked questions about booking, packing lists, weather policies, and safety rules for outdoor trips in Gunma.",
    alternates: {
      canonical: locale === "ja" ? "/faq" : `/en/faq`,
      languages: {
        en: "/en/faq",
        ja: "/faq",
        "x-default": "/faq",
      },
    },
  };
}

export default function FaqLayout({ children }: Props) {
  return children;
}
