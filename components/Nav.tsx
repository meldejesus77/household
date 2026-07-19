"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Home" },
  { href: "/jo-schedule", label: "Jo Schedule" },
  { href: "/packing", label: "Packing" },
  { href: "/budget", label: "Budget" },
  { href: "/retirement", label: "Retirement" },
  { href: "/todo", label: "Todo" },
  { href: "/lists", label: "Lists" },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="max-w-6xl mx-auto flex items-center gap-1 flex-wrap">
        <span className="font-semibold text-gray-800 mr-4 text-lg">🏠</span>
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              pathname === link.href
                ? "bg-blue-100 text-blue-700"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
