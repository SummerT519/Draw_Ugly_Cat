"use client";

import Link from "next/link";
import { useApp } from "@/components/AppProvider";
import { ReviewBoard } from "@/components/ReviewBoard";

export default function ReviewPage() {
  const { language } = useApp();
  return <div className="page-shell wrap review-page"><div className="page-title-row"><div><p className="eyebrow">THE CAT GATEKEEPERS</p><h1>{language === "zh" ? "社区审核" : "Community review"}</h1><p>{language === "zh" ? "一次一张。判断它是不是猫、安不安全，丑不丑不扣分。" : "One at a time. Judge whether it’s a safe cat—not whether it’s pretty."}</p></div><div className="review-page-links"><Link className="text-link" href="/rereview">{language === "zh" ? "二次审核猫图 ⚑" : "Reported cats ⚑"}</Link><Link className="text-link danger-text" href="/review/drawings">{language === "zh" ? "审核疑似违规画作 ⚑" : "Reported drawings ⚑"}</Link></div></div><ReviewBoard mode="normal" /></div>;
}
