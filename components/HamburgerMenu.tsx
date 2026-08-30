"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

const links = [
  { href: "/", label: "🏠 Home" },
  { href: "/jo-schedule", label: "📅 Jo Schedule" },
  { href: "/packing", label: "🧳 Packing" },
  { href: "/budget", label: "💰 Budget" },
  { href: "/retirement", label: "📈 Retirement" },
  { href: "/todo", label: "✅ Todo" },
  { href: "/calendar", label: "📆 Calendar" },
  { href: "/lists", label: "📝 Lists" },
  { href: "/health", label: "🩺 Health" },
];

export default function HamburgerMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  return (
    <div
      ref={ref}
      style={{ position: "fixed", top: 10, right: 12, zIndex: 300 }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Menu"
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          background: "rgba(30,30,30,0.82)",
          backdropFilter: "blur(6px)",
          border: "1px solid rgba(255,255,255,0.12)",
          cursor: "pointer",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 5,
          padding: 0,
        }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              display: "block",
              width: 16,
              height: 2,
              borderRadius: 2,
              background: "#f0ede8",
              transition: "transform 0.2s, opacity 0.2s",
              transform:
                open && i === 0
                  ? "translateY(7px) rotate(45deg)"
                  : open && i === 2
                  ? "translateY(-7px) rotate(-45deg)"
                  : "none",
              opacity: open && i === 1 ? 0 : 1,
            }}
          />
        ))}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: 44,
            right: 0,
            background: "#1e1e1e",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10,
            overflow: "hidden",
            minWidth: 180,
            boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
          }}
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              style={{
                display: "block",
                padding: "11px 16px",
                fontSize: 14,
                color: "#f0ede8",
                textDecoration: "none",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.07)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
