"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useApp } from "@/components/AppProvider";
import { DrawingCanvas } from "@/components/DrawingCanvas";
import { ReportDialog } from "@/components/ReportDialog";
import type { Cat } from "@/lib/types";

export default function DrawPage() {
  return (
    <Suspense fallback={<div className="page-shell wrap"><div className="draw-grid"><div className="skeleton big" /><div className="skeleton big" /></div></div>}>
      <DrawContent />
    </Suspense>
  );
}

function DrawContent() {
  const { language } = useApp();
  const router = useRouter();
  const search = useSearchParams();
  const requested = search.get("cat");
  const [cat, setCat] = useState<Cat | null | undefined>(undefined);
  const [showReport, setShowReport] = useState(false);

  async function load() {
    setCat(undefined);
    const response = await fetch(`/api/cats/random${requested ? `?id=${encodeURIComponent(requested)}` : ""}`, { cache: "no-store" });
    const data = await response.json();
    setCat(data.cat ?? null);
  }
  useEffect(() => { void load(); }, [requested]); // eslint-disable-line react-hooks/exhaustive-deps

  if (cat === undefined) return <div className="page-shell wrap"><div className="draw-grid"><div className="skeleton big" /><div className="skeleton big" /></div></div>;
  if (cat === null) return <div className="page-shell wrap"><div className="empty-state"><div className="empty-cat">ฅ(≚ᄌ≚)</div><h1>{language === "zh" ? "暂时没有能画的猫" : "No drawable cats right now"}</h1><p>{language === "zh" ? "去审核几张新猫片，帮助它们进入图库吧。" : "Review a few uploads and help new cats enter the pool."}</p><a className="button primary" href="/review">{language === "zh" ? "去审核" : "Review cats"}</a></div></div>;

  return (
    <div className="draw-page page-shell wrap wide-wrap">
      <div className="draw-heading"><div><p className="eyebrow">YOUR RANDOM SUBJECT</p><h1>{language === "zh" ? "画之。" : "Don’t overthink it. Draw."}</h1></div><div className="draw-heading-actions">{cat.repeat && <span className="repeat-badge">↻ {language === "zh" ? "这只画过" : "Drawn before"}</span>}<button className="report-link" onClick={() => setShowReport(true)}>⚑ {language === "zh" ? "图片有问题？" : "Problem image?"}</button></div></div>
      <div className="draw-grid">
        <section className="reference-panel"><div className="panel-label"><span>01</span>{language === "zh" ? "参考猫" : "REFERENCE CAT"}</div><div className="reference-frame"><img src={cat.imageUrl} alt={language === "zh" ? "绘画参考猫" : "Cat drawing reference"} /><div className="tape top" /><div className="tape bottom" /></div><p>{language === "zh" ? "当你凝视猫猫的时候，猫猫也在凝视你。" : "Got it? No? That’s fine."}</p></section>
        <section className="drawing-panel"><div className="panel-label"><span>02</span>{language === "zh" ? "你的杰作" : "YOUR MASTERPIECE"}</div><DrawingCanvas catId={cat.id} /></section>
      </div>
      {showReport && <ReportDialog catId={cat.id} onClose={() => setShowReport(false)} onReported={() => { setShowReport(false); if (requested) router.push("/draw"); else void load(); }} />}
    </div>
  );
}
