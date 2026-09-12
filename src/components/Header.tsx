"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/components/AppProvider";

const links = [
  { href: "/upload", zh: "上传", en: "Upload" },
  { href: "/draw", zh: "画猫", en: "Draw" },
  { href: "/review", zh: "审核", en: "Review" },
];

export function Header() {
  const pathname = usePathname();
  const { language, setLanguage, nickname, editNickname } = useApp();
  if (pathname.startsWith("/internal-console")) return null;
  return (
    <header className="site-header">
      <Link className="brand" href="/" aria-label="画只丑猫首页">
        <span className="brand-mark">丑</span>
        <span>{language === "zh" ? "画只丑猫" : "UGLY CAT STUDIO"}</span>
      </Link>
      <nav className="main-nav" aria-label="Main navigation">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className={pathname.startsWith(link.href) ? "active" : ""}>
            {link[language]}
          </Link>
        ))}
      </nav>
      <div className="header-tools">
        <div className="language-switch" aria-label="Language">
          <button className={language === "zh" ? "selected" : ""} onClick={() => setLanguage("zh")}>中</button>
          <span>/</span>
          <button className={language === "en" ? "selected" : ""} onClick={() => setLanguage("en")}>EN</button>
        </div>
        <button className="nickname-button" onClick={editNickname} title={language === "zh" ? "修改昵称" : "Edit nickname"}>
          <span className="online-dot" />
          {nickname === undefined ? "…" : nickname || (language === "zh" ? "起个昵称" : "Nickname")}
        </button>
      </div>
    </header>
  );
}
