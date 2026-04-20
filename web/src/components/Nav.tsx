"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Evaluate" },
  { href: "/chat", label: "Chat" },
  { href: "/history", label: "Run History" },
  { href: "/chat/history", label: "Chat History" },
  { href: "/requests", label: "Request Inspector" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-gray-800 bg-gray-900 overflow-x-auto">
      <div className="mx-auto flex min-w-max max-w-7xl items-center px-4 py-3">
        <Link href="/" className="mr-8 text-lg font-bold text-gray-100 shrink-0">
          ARA-Eval
        </Link>
        <div className="flex gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded px-3 py-1.5 text-sm transition-colors ${
                  isActive
                    ? "bg-gray-800 text-white"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
