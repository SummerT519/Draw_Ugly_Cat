"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useApp } from "@/components/AppProvider";
import { ReportDialog } from "@/components/ReportDialog";

type ReviewCat = { id: string; imageUrl: string; createdAt: string; reviewCount: number; reportReasons?: string };

export function ReviewBoard({ mode }: { mode: "normal" | "rereview" }) {
  const { language } = useApp();
  const [cat, setCat] = useState<ReviewCat | null | undefined>(undefined);
  const [target, setTarget] = useState(mode === "normal" ? 10 : 5);
  const [excluded, setExcluded] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [notice, setNotice] = useState("");

  async function load(skipIds = excluded) {
    setCat(undefined);
    const params = new URLSearchParams({ mode });
    if (skipIds.length) params.set("exclude", skipIds.join(","));
    const response = await fetch(`/api/review?${params}`, { cache: "no-store" });
    const data = await response.json();
    setCat(data.cat);
    setTarget(data.target);
  }

  useEffect(() => { void load([]); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function vote(decision: string) {
    if (!cat) return;
    setSaving(true);
    const response = await fetch("/api/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ catId: cat.id, mode, decision }),
    });
    const data = await response.json();
    setSaving(false);
    if (!response.ok) {
      setNotice(language === "zh" ? "这张图刚刚被别人处理了，换一张看看。" : "Someone just handled this image. Loading another.");
    } else {
      const done = data.resolved === true;
      setNotice(language === "zh"
        ? done ? `已完成：${statusText(data.status, "zh")}` : `已记录，你是第 ${data.reviewCount} 位审核者。`
        : done ? `Resolved: ${statusText(data.status, "en")}` : `Recorded. You were reviewer #${data.reviewCount}.`);
    }
    setExcluded([]);
    await load([]);
  }

  function skip() {
    if (!cat) return;
    const next = [...excluded, cat.id];
    setExcluded(next);
    void load(next);
  }

  if (cat === undefined) return <ReviewSkeleton />;
  if (cat === null) {
    return (
      <div className="empty-state review-empty">
        <div className="empty-cat">ฅ(•ㅅ•❀)ฅ</div>
        <h2>{language === "zh" ? "这轮审核完啦" : "Queue cleared!"}</h2>
        <p>{language === "zh" ? "暂时没有符合条件的图片。之后再来看看吧。" : "There are no eligible images right now. Check back later."}</p>
        <Link className="button primary" href="/">{language === "zh" ? "回到首页" : "Back home"}</Link>
      </div>
    );
  }

  return (
    <>
      {notice && <div className="toast-inline">✓ {notice}</div>}
      <div className="review-layout">
        <section className="review-image-card">
          <div className="review-progress"><span>{cat.reviewCount}</span> / {target} {language === "zh" ? "份反馈" : "reviews"}</div>
          <img src={cat.imageUrl} alt={language === "zh" ? "待审核猫图" : "Cat awaiting review"} />
        </section>
        <aside className="review-panel">
          <p className="eyebrow">{mode === "normal" ? "COMMUNITY CHECK" : "SECOND LOOK"}</p>
          <h2>{mode === "normal"
            ? language === "zh" ? "它是一张合格的猫图吗？" : "Does it belong in the drawing pool?"
            : language === "zh" ? "它还应该留在图库吗？" : "Should this image stay?"}</h2>
          {mode === "rereview" && cat.reportReasons && (
            <div className="report-reasons"><strong>{language === "zh" ? "举报原因" : "Reported for"}</strong><span>{cat.reportReasons.replaceAll("_", " ")}</span></div>
          )}
          <p className="review-hint">{mode === "normal"
            ? language === "zh" ? "主体是猫、内容安全，而且很丑。" : "Approve if it is a cat and safe. Looking ridiculous is encouraged."
            : language === "zh" ? "请重新判断内容是否安全、是否符合网站主题。" : "Take a fresh look at safety and whether it fits the site."}</p>
          <div className="review-actions">
            <button className="decision-button approve" disabled={saving} onClick={() => vote(mode === "normal" ? "approve" : "keep")}>
              <span>✓</span><strong>{mode === "normal" ? language === "zh" ? "可以，放猫！" : "Yes, release it!" : language === "zh" ? "保留" : "Keep"}</strong>
            </button>
            <button className="decision-button reject" disabled={saving} onClick={() => vote(mode === "normal" ? "reject" : "remove")}>
              <span>×</span><strong>{mode === "normal" ? language === "zh" ? "不适合" : "Not a fit" : language === "zh" ? "移除" : "Remove"}</strong>
            </button>
          </div>
          <div className="review-secondary">
            <button onClick={() => setShowReport(true)}>{language === "zh" ? "⚑ 举报严重内容" : "⚑ Report severe content"}</button>
            <button onClick={skip}>{language === "zh" ? "跳过这张 →" : "Skip this one →"}</button>
          </div>
          <p className="privacy-note">{language === "zh" ? "选择是匿名的，提交后不能修改。" : "Your choice is recorded anonymously and cannot be changed."}</p>
        </aside>
      </div>
      {showReport && <ReportDialog catId={cat.id} onClose={() => setShowReport(false)} onReported={() => { setShowReport(false); skip(); }} />}
    </>
  );
}

function statusText(status: string, language: "zh" | "en") {
  const map: Record<string, [string, string]> = {
    approved: ["审核通过", "approved"], rejected: ["审核未通过", "rejected"], removed: ["已移除", "removed"], under_re_review: ["继续复核", "still reviewing"],
  };
  return map[status]?.[language === "zh" ? 0 : 1] ?? status;
}

function ReviewSkeleton() {
  return <div className="review-layout"><div className="skeleton big" /><div className="skeleton panel" /></div>;
}
