"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useApp } from "@/components/AppProvider";
import type { Cat, CatStatus } from "@/lib/types";

const statusCopy: Record<CatStatus, [string, string]> = {
  pending: ["审核中", "Pending"], approved: ["已通过", "Approved"], rejected: ["未通过", "Rejected"], under_re_review: ["二次审核中", "Re-review"], removed: ["已移除", "Removed"],
};

export default function MyCatsPage() {
  const { language } = useApp();
  const [cats, setCats] = useState<Cat[] | null>(null);
  useEffect(() => { fetch("/api/cats/mine").then((res) => res.json()).then((data) => setCats(data.cats)); }, []);
  return (
    <div className="page-shell wrap">
      <div className="page-title-row"><div><p className="eyebrow">YOUR CONTRIBUTIONS</p><h1>{language === "zh" ? "我的上传" : "My uploads"}</h1><p>{language === "zh" ? "看看猫片过审没有，以及多少人已经画过。" : "Track review status and how many people have drawn each cat."}</p></div><Link className="button small primary" href="/upload">+ {language === "zh" ? "再上传一只" : "Upload another"}</Link></div>
      {cats === null ? <div className="card-grid"><div className="skeleton card" /><div className="skeleton card" /></div> : cats.length === 0 ? <div className="empty-state"><div className="empty-cat">/ᐠ｡ꞈ｡ᐟ\</div><h2>{language === "zh" ? "还没有猫" : "No cats yet"}</h2><Link className="button primary" href="/upload">{language === "zh" ? "上传第一只" : "Upload your first"}</Link></div> : <div className="cat-list-grid">{cats.map((cat) => <article className="cat-list-card" key={cat.id}><div className="cat-thumb"><img src={cat.imageUrl} alt="" /><span className={`status-badge ${cat.isVisible === false ? "removed" : cat.status}`}>{cat.isVisible === false ? (language === "zh" ? "已停止显示" : "Hidden") : statusCopy[cat.status][language === "zh" ? 0 : 1]}</span></div><div className="cat-list-body"><span className="date">{new Date(cat.createdAt).toLocaleDateString(language === "zh" ? "zh-CN" : "en-AU")}</span>{cat.status === "pending" ? <><h3>{cat.reviewCount} / 10 {language === "zh" ? "份审核" : "reviews"}</h3><div className="progress"><span style={{ width: `${Math.min(100, ((cat.reviewCount ?? 0) / 10) * 100)}%` }} /></div></> : <h3>{cat.drawingCount ?? 0} {language === "zh" ? "个人画过" : "drawings"}</h3>} {cat.status === "approved" && cat.isVisible !== false && <Link href={`/cat/${cat.id}`} className="card-link">{language === "zh" ? "查看猫咪详情 →" : "View cat details →"}</Link>}</div></article>)}</div>}
      <div className="gallery-rule"><span>🔒</span><div><strong>{language === "zh" ? "作品图库规则" : "Gallery rule"}</strong><p>{language === "zh" ? "普通猫图需要先亲自画一次才能看其他作品；你自己上传的猫图可直接查看大家的画。" : "Normally you draw first to unlock the gallery. You can always view drawings of cats you uploaded yourself."}</p></div></div>
    </div>
  );
}
