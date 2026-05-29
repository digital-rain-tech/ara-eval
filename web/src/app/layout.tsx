import type { Metadata } from "next";
import Link from "next/link";
import { AuthButton } from "@/components/AuthButton";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "ARA-Eval — Agentic Readiness Assessment",
  description:
    "Evaluate when enterprises can safely deploy autonomous AI agents",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body className="bg-gray-950 text-gray-100 antialiased">
        <header className="flex items-center justify-between border-b border-gray-800 px-4 py-2">
          <Link href="/" className="text-sm font-semibold text-gray-200">
            ARA-Eval
          </Link>
          {process.env.NEXT_PUBLIC_SUPABASE_URL && <AuthButton />}
        </header>
        {children}
      </body>
    </html>
  );
}
