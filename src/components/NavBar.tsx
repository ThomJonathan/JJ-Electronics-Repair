"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Zap, LayoutDashboard, Package, Truck, Receipt } from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/products", label: "Inventory", Icon: Package },
  { href: "/purchase-orders", label: "Orders", Icon: Truck },
  { href: "/sales", label: "Sales", Icon: Receipt },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export default function NavBar() {
  const pathname = usePathname();

  return (
    <>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Zap size={15} strokeWidth={2.5} />
          </div>
          <div>
            <div className="brand-name">JJ-Electronics</div>
            <div className="brand-sub">Gadget Stock Tracker</div>
          </div>
        </div>
        {NAV_ITEMS.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            className={`navitem ${isActive(pathname, href) ? "active" : ""}`}
          >
            <Icon size={16} strokeWidth={2} />
            {label}
          </Link>
        ))}
        <div className="sidebar-footer">
          Data is saved automatically to your account and stays private to you.
        </div>
      </aside>

      <nav className="bottomnav">
        {NAV_ITEMS.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            className={`bottomnav-item ${isActive(pathname, href) ? "active" : ""}`}
          >
            <Icon size={20} strokeWidth={2} />
            <span className="bottomnav-label">{label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
