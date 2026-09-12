"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { DrawingReportDialog } from "@/components/DrawingReportDialog";
import type { Cat, Drawing } from "@/lib/types";

export default function CatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { language } = useApp();
  const [cat, setCat] = useState<Cat | null>(null);
  const [drawings, setDrawings] = useState<Drawing[] | null>(null);
  const [locked, setLocked] = useState(false);
  const [reportingDrawing, setReportingDrawing] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    fetch(`/api/cats/${id}`).then((res) => res.json()).then((data) => setCat(data.cat ?? null));
    fetch(`/api/cats/${id}/drawings`).then(async (res) => { if (res.status === 403) { setLocked(true); return; } const data = await res.json(); setDrawings(data.drawings); });
  }, [id]);
  if (!cat) return <div className="page-shell wrap"><div className="skeleton big" /></div>;
  return (
    <div className="page-shell wrap gallery-page">
      <div className="page-title-row"><div><p className="eyebrow">ONE CAT, MANY BAD IDEAS</p><h1>{language === "zh" ? "这只猫的作品墙" : "This cat’s gallery"}</h1><p>{cat.drawingCount} {language === "zh" ? "个人已经画过它" : "people have drawn this cat"}</p></div><Link className="text-link" href="/draw">{language === "zh" ? "再随机一只 →" : "Draw another →"}</Link></div>
      <section className="gallery-origin">
        <div className="gallery-origin-label">ORIGINAL CAT</div>
        <img src={cat.imageUrl} alt="Original cat" />
        {cat.sourceUrl && (
          <a className="source-credit" href={cat.sourceUrl} target="_blank" rel="noreferrer">
            <strong>{language === "zh" ? "网络 Meme 来源 ↗" : "Meme source ↗"}</strong>
            <span>{cat.sourceLabel}{cat.sourceAuthor ? ` · ${cat.sourceAuthor}` : ""}{cat.licenseName ? ` · ${cat.licenseName}` : ""}</span>
          </a>
        )}
      </section>
      {notice && <div className="toast-inline">✓ {notice}</div>}
      {locked ? <section className="locked-gallery"><div className="lock-icon">🔒</div><p className="eyebrow">NO PEEKING YET</p><h2>{language === "zh" ? "先画，后偷看。" : "Draw first. Peek later."}</h2><p>{language === "zh" ? "提交你自己的版本后，服务端才会解锁其他人的作品。自己上传的猫图不受此限制。" : "The server unlocks everyone else’s work after you submit. Cats you uploaded are always unlocked for you."}</p><Link className="button primary" href={`/draw?cat=${id}`}>{language === "zh" ? "去画这只猫 →" : "Draw this cat →"}</Link></section> : drawings === null ? <div className="skeleton big" /> : <section><div className="gallery-section-title"><h2>{language === "zh" ? "大家画成了这样" : "What everyone made"}</h2><span>{drawings.length} WORKS</span></div><div className="drawing-gallery">{drawings.map((drawing) => <article key={drawing.id} className={drawing.isMine ? "drawing-card mine" : "drawing-card"}>{drawing.isMine && <span className="mine-label">{language === "zh" ? "你的" : "YOURS"}</span>}<img src={drawing.imageUrl} alt={`${drawing.nickname}'s drawing`} /><div className="drawing-meta"><div><strong>{drawing.nickname}</strong><span>{new Date(drawing.createdAt).toLocaleDateString(language === "zh" ? "zh-CN" : "en-AU")}</span></div>{!drawing.isMine && <button className="drawing-report-button" onClick={() => setReportingDrawing(drawing.id)}>⚑ {language === "zh" ? "举报" : "Report"}</button>}</div></article>)}</div></section>}
      {reportingDrawing && <DrawingReportDialog drawingId={reportingDrawing} onClose={() => setReportingDrawing(null)} onReported={() => { setDrawings((current) => current?.filter((drawing) => drawing.id !== reportingDrawing) ?? current); setReportingDrawing(null); setNotice(language === "zh" ? "举报已提交，画作已暂时隐藏并进入复核。" : "Report submitted. The drawing is hidden pending review."); }} />}
    </div>
  );
}
