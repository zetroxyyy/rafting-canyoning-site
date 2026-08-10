import type { Metadata } from "next";

interface Props {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const isJa = locale === "ja";
  return {
    title: isJa ? "お問い合わせ" : "Contact Us",
    description: isJa
      ? "ご質問やツアーに関するお問い合わせはこちらからお気軽にご連絡ください。お電話でも受け付けております。"
      : "Contact the Dream Adventure team. Ask questions about river rafting or canyoning in Gunma, Japan.",
    alternates: {
      canonical: locale === "ja" ? "/contact" : `/en/contact`,
      languages: {
        en: "/en/contact",
        ja: "/contact",
        "x-default": "/contact",
      },
    },
  };
}

export default function ContactLayout({ children }: Props) {
  return children;
}
