"use client";

import Link from "next/link";
import { useApp } from "@/components/AppProvider";
import { DrawingReviewBoard } from "@/components/DrawingReviewBoard";

export default function DrawingReviewPage() {
  const { language } = useApp();
  return <div className="page-shell wrap review-page"><div className="page-title-row"><div><p className="eyebrow danger-text">DRAWING SAFETY CHECK</p><h1>{language === "zh" ? "疑似违规画作审核" : "Reported drawing review"}</h1><p>{language === "zh" ? "对被举报的用户画作进行复核。原猫图片会一并显示，方便判断。" : "Review drawings reported by users. The original cat is shown for context."}</p></div><Link className="text-link" href="/review">← {language === "zh" ? "普通审核" : "Regular review"}</Link></div><DrawingReviewBoard /></div>;
}
