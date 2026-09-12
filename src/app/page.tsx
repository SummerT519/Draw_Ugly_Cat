"use client";

import Link from "next/link";
import Image from "next/image";
import { useApp } from "@/components/AppProvider";

const cards = [
  { href: "/upload", number: "01", zh: "上传猫猫", en: "UPLOAD A CAT", zhBody: "贡献一张猫片，交给社区鉴定（不丑的不要）。", enBody: "Contribute a questionable cat photo for the community to inspect.", className: "lime", face: "≽^•⩊•^≼" },
  { href: "/draw", number: "02", zh: "画只猫猫", en: "DRAW A CAT", zhBody: "随机领一只猫。画完以后才能偷看别人的作品哦！", enBody: "Meet a random cat. Finish yours before peeking at anyone else’s.", className: "coral", face: "₍^. .^₎⟆" },
  { href: "/review", number: "03", zh: "审核猫猫", en: "JUDGE A CAT", zhBody: "帮忙挡住广告、怪图，以及那些根本不是猫的东西。", enBody: "Keep out spam, nasty images, and things that are clearly not cats.", className: "blue", face: "ฅ^._.^ฅ" },
];

const SHOW_HERO_ART = false;

export default function Home() {
  const { language } = useApp();
  return (
    <div className="home-page">
      <section className={`hero wrap ${SHOW_HERO_ART ? "" : "hero-title-only"}`}>
        <div className="hero-copy">
          <div className="hero-kicker"><span>●</span> COMMUNITY-FED CAT CHAOS</div>
          <h1>{language === "zh" ? <><span className="hero-title-line">今日无事，</span><span className="hero-title-line hero-title-line-end">画点<span className="hero-accent">丑</span>猫</span></> : <><span className="hero-title-line">DRAW SOME</span><span className="hero-title-line hero-title-line-end"><span className="hero-accent">TERRIBLE</span> CATS.</span></>}</h1>
          <p>{language === "zh" ? "猫猫没有好看的义务！你的画也是" : "Cats don’t have to look good! Neither do your drawings."}</p>
          <div className="hero-note">
            <span className="scribble-arrow">↘</span>
            {language === "zh" ? "从下面挑一个入口。" : "Pick your kind of chaos below"}
          </div>
        </div>
        {SHOW_HERO_ART && <div className="hero-art" aria-hidden="true">
          <Image className="hero-cat-photo" src="/hero-cat.jpg" alt="" fill priority sizes="(max-width: 950px) 100vw, 42vw" />
          <div className="hero-photo-overlay" />
          <div className="art-sticker">100%<br />GOOD CAT</div>
        </div>}
      </section>
      <section className="action-section wrap">
        <div className="section-heading">
          <p className="eyebrow">THREE THINGS. ZERO TALENT REQUIRED.</p>
          <h2>{language === "zh" ? "我要：" : "What are we doing today?"}</h2>
        </div>
        <div className="action-grid">
          {cards.map((card) => (
            <Link href={card.href} key={card.href} className={`action-card ${card.className}`}>
              <div className="action-number">{card.number}</div>
              <div className="action-face">{card.face}</div>
              <h3>{language === "zh" ? card.zh : card.en}</h3>
              <p>{language === "zh" ? card.zhBody : card.enBody}</p>
              <span className="round-arrow">→</span>
            </Link>
          ))}
        </div>
      </section>
      <section className="manifesto-strip">
        <div>BAD LINES <span>✦</span> GOOD CATS <span>✦</span> NO PEEKING <span>✦</span> COMMUNITY APPROVED <span>✦</span></div>
      </section>
    </div>
  );
}
