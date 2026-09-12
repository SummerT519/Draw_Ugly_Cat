"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useApp } from "@/components/AppProvider";

export default function FeedbackPage() {
  const { language } = useApp();
  const [type, setType] = useState<"bug" | "suggestion">("bug");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const response = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, message, pageUrl: document.referrer || window.location.href }),
    });
    setSaving(false);
    if (!response.ok) {
      setError(language === "zh" ? "提交失败，请检查内容后重试。" : "Submission failed. Check your message and try again.");
      return;
    }
    setSent(true);
  }

  if (sent) return <div className="page-shell wrap feedback-page"><div className="empty-state feedback-success"><div className="empty-cat">ฅ^•ﻌ•^ฅ</div><p className="eyebrow">MESSAGE RECEIVED</p><h1>{language === "zh" ? "收到，谢谢你！" : "Got it. Thank you!"}</h1><p>{language === "zh" ? "反馈已送到内部处理页面。你的意见会让猫猫少踩一些 bug。" : "Your feedback is now in the internal queue. It will help the cats step on fewer bugs."}</p><Link className="button primary" href="/">{language === "zh" ? "回到首页" : "Back home"}</Link></div></div>;

  return (
    <div className="page-shell wrap feedback-page">
      <div className="page-title-row"><div><p className="eyebrow">HELP THE CATS IMPROVE</p><h1>{language === "zh" ? "告诉我们哪里可以更好" : "Tell us what could be better"}</h1><p>{language === "zh" ? "发现问题，或有一个想让网站更好玩的点子，都可以写在这里。" : "Found a problem or have an idea that would make the site more fun? Send it here."}</p></div></div>
      <form className="feedback-card" onSubmit={submit}>
        <fieldset><legend>{language === "zh" ? "反馈类型" : "Feedback type"}</legend><div className="feedback-type-grid"><button type="button" className={type === "bug" ? "feedback-type selected" : "feedback-type"} onClick={() => setType("bug")}><span>🐛</span><strong>{language === "zh" ? "发现 Bug" : "Found a bug"}</strong><small>{language === "zh" ? "页面出错、按钮无反应等" : "Errors, broken buttons, odd behaviour"}</small></button><button type="button" className={type === "suggestion" ? "feedback-type selected" : "feedback-type"} onClick={() => setType("suggestion")}><span>💡</span><strong>{language === "zh" ? "改进建议" : "Improvement idea"}</strong><small>{language === "zh" ? "希望增加或改变的功能" : "Features or changes you would like"}</small></button></div></fieldset>
        <label className="field-label" htmlFor="feedback-message">{language === "zh" ? "具体内容" : "Your message"}</label>
        <textarea id="feedback-message" className="text-input feedback-textarea" value={message} onChange={(event) => setMessage(event.target.value)} minLength={5} maxLength={2000} required placeholder={language === "zh" ? "请描述发生了什么，或你希望怎样改进……" : "Describe what happened or what you would like to improve…"} />
        <div className="feedback-submit-row"><span>{message.length} / 2000</span><button className="button primary" disabled={saving || message.trim().length < 5}>{saving ? (language === "zh" ? "正在提交…" : "Sending…") : (language === "zh" ? "提交反馈 →" : "Send feedback →")}</button></div>
        {error && <p className="form-error">{error}</p>}
      </form>
    </div>
  );
}
