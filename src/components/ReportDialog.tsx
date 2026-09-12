"use client";

import { FormEvent, useState } from "react";
import { useApp } from "@/components/AppProvider";

const options = [
  ["not_cat", "这不是猫", "Not a cat"],
  ["animal_abuse", "虐待动物或令人不适", "Animal abuse / disturbing"],
  ["sexual", "色情内容", "Sexual content"],
  ["violence", "暴力或血腥", "Violence / gore"],
  ["spam", "广告或垃圾内容", "Spam / advertisement"],
  ["other", "其他", "Other"],
] as const;

export function ReportDialog({ catId, onClose, onReported }: { catId: string; onClose: () => void; onReported: () => void }) {
  const { language } = useApp();
  const [reason, setReason] = useState("not_cat");
  const [details, setDetails] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const response = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ catId, reason, details }),
    });
    const data = await response.json();
    setSaving(false);
    if (!response.ok && data.error !== "ALREADY_REPORTED") {
      setError(language === "zh" ? "举报没有提交成功，请重试。" : "Report failed. Please try again.");
      return;
    }
    onReported();
  }

  return (
    <div className="modal-backdrop">
      <form className="report-card" onSubmit={submit}>
        <p className="eyebrow danger-text">CONTENT REPORT</p>
        <h2>{language === "zh" ? "这张图有什么问题？" : "What’s wrong with this image?"}</h2>
        <p className="muted">{language === "zh" ? "严重内容会立刻从随机图库暂时隐藏。" : "Severe content is immediately hidden from the random pool."}</p>
        <div className="radio-list">
          {options.map(([value, zh, en]) => (
            <label key={value} className={reason === value ? "radio-option checked" : "radio-option"}>
              <input type="radio" name="reason" value={value} checked={reason === value} onChange={() => setReason(value)} />
              <span>{language === "zh" ? zh : en}</span>
            </label>
          ))}
        </div>
        <label className="field-label" htmlFor="report-details">{language === "zh" ? "补充说明（可选）" : "Details (optional)"}</label>
        <textarea id="report-details" className="text-input" value={details} onChange={(e) => setDetails(e.target.value)} maxLength={500} />
        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions">
          <button type="button" className="button ghost" onClick={onClose}>{language === "zh" ? "取消" : "Cancel"}</button>
          <button className="button danger" disabled={saving}>{saving ? "…" : language === "zh" ? "提交举报" : "Submit report"}</button>
        </div>
      </form>
    </div>
  );
}
