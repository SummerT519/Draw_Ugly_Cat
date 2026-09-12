"use client";

import Link from "next/link";
import { useApp } from "@/components/AppProvider";
import { ReviewBoard } from "@/components/ReviewBoard";

export default function ReReviewPage() {
  const { language } = useApp();
  return <div className="page-shell wrap review-page"><div className="page-title-row"><div><p className="eyebrow danger-text">REPORTED CAT ARCHIVE</p><h1>{language === "zh" ? "二次审核" : "Second review"}</h1><p>{language === "zh" ? "这些图片曾经通过，但后来被举报。请多看一眼。" : "These images passed once, then got reported. Give them a careful second look."}</p></div><div className="review-page-links"><Link className="text-link" href="/review">← {language === "zh" ? "普通审核" : "Regular review"}</Link><Link className="text-link danger-text" href="/review/drawings">{language === "zh" ? "审核疑似违规画作 ⚑" : "Reported drawings ⚑"}</Link></div></div><ReviewBoard mode="rereview" /></div>;
}
