"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useApp } from "@/components/AppProvider";

type ReviewDrawing = { id: string; drawingImageUrl: string; catImageUrl: string; nickname: string; createdAt: string; reviewCount: number; reportReasons: string };

export function DrawingReviewBoard() {
  const { language } = useApp();
  const [drawing, setDrawing] = useState<ReviewDrawing | null | undefined>(undefined);
  const [target, setTarget] = useState(5);
  const [excluded, setExcluded] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  async function load(skipIds: string[] = []) {
    setDrawing(undefined);
    const params = new URLSearchParams();
    if (skipIds.length) params.set("exclude", skipIds.join(","));
    const response = await fetch(`/api/review/drawings?${params}`, { cache: "no-store" });
    const data = await response.json();
    setDrawing(data.drawing);
    setTarget(data.target);
  }

  useEffect(() => { void load(); }, []);

  async function vote(decision: "keep" | "remove") {
    if (!drawing) return;
    setSaving(true);
    const response = await fetch("/api/review/drawings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ drawingId: drawing.id, decision }),
    });
    const data = await response.json();
    setSaving(false);
    setNotice(response.ok
      ? language === "zh" ? data.resolved ? `复核完成：${data.status === "visible" ? "恢复展示" : "停止展示"}` : `已记录，你是第 ${data.reviewCount} 位审核者。` : data.resolved ? `Resolved: ${data.status === "visible" ? "restored" : "hidden"}` : `Recorded. You were reviewer #${data.reviewCount}.`
      : language === "zh" ? "这幅画刚刚被处理了，换一幅看看。" : "This drawing was just handled. Loading another.");
    setExcluded([]);
    await load();
  }

  function skip() {
    if (!drawing) return;
    const next = [...excluded, drawing.id];
    setExcluded(next);
    void load(next);
  }

  if (drawing === undefined) return <div className="review-layout"><div className="skeleton big" /><div className="skeleton panel" /></div>;
  if (drawing === null) return <div className="empty-state review-empty"><div className="empty-cat">ฅ(•ㅅ•❀)ฅ</div><h2>{language === "zh" ? "违规画作队列已清空" : "Drawing queue cleared!"}</h2><p>{language === "zh" ? "暂时没有待复核的举报画作。" : "There are no reported drawings awaiting your review."}</p><Link className="button primary" href="/review">{language === "zh" ? "返回审核中心" : "Back to review"}</Link></div>;

  return (
    <>
      {notice && <div className="toast-inline">✓ {notice}</div>}
      <div className="review-layout drawing-review-layout">
        <section className="review-image-card drawing-comparison">
          <div className="review-progress"><span>{drawing.reviewCount}</span> / {target} {language === "zh" ? "份反馈" : "reviews"}</div>
          <div><p>{language === "zh" ? "被举报的画作" : "REPORTED DRAWING"}</p><img src={drawing.drawingImageUrl} alt={language === "zh" ? "被举报画作" : "Reported drawing"} /></div>
          <div className="reference-mini"><p>{language === "zh" ? "原猫参考" : "ORIGINAL CAT"}</p><img src={drawing.catImageUrl} alt={language === "zh" ? "原猫" : "Original cat"} /></div>
        </section>
        <aside className="review-panel">
          <p className="eyebrow danger-text">REPORTED DRAWING</p>
          <h2>{language === "zh" ? "这幅画可以公开展示吗？" : "Is this drawing safe to show?"}</h2>
          <div className="report-reasons"><strong>{language === "zh" ? "举报原因" : "Reported for"}</strong><span>{drawing.reportReasons.replaceAll("_", " ")}</span></div>
          <p className="review-hint">{language === "zh" ? "只判断内容是否安全、友善且与绘画有关；画得丑不是违规。" : "Judge safety, respect, and relevance only. Bad drawing skills are not a violation."}</p>
          <div className="review-actions">
            <button className="decision-button approve" disabled={saving} onClick={() => vote("keep")}><span>✓</span><strong>{language === "zh" ? "安全，恢复展示" : "Safe — restore"}</strong></button>
            <button className="decision-button reject" disabled={saving} onClick={() => vote("remove")}><span>×</span><strong>{language === "zh" ? "违规，停止展示" : "Inappropriate — hide"}</strong></button>
          </div>
          <div className="review-secondary"><span /><button onClick={skip}>{language === "zh" ? "跳过这幅 →" : "Skip this one →"}</button></div>
          <p className="privacy-note">{language === "zh" ? "你的选择匿名记录，提交后不能修改。" : "Your choice is recorded anonymously and cannot be changed."}</p>
        </aside>
      </div>
    </>
  );
}
