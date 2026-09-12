"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SiteFooter() {
  const pathname = usePathname();
  if (pathname.startsWith("/internal-console")) return null;
  return <footer className="site-footer"><span>丑猫画室 / UGLY CAT STUDIO</span><Link className="footer-feedback-link" href="/feedback">反馈与建议 / FEEDBACK →</Link><span>画得不像也算艺术 © 2026</span></footer>;
}
