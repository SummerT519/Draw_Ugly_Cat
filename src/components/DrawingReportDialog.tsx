"use client";

import { FormEvent, useState } from "react";
import { useApp } from "@/components/AppProvider";

const options = [
  ["sexual", "色情或裸露内容", "Sexual or nude content"],
  ["violence", "暴力或血腥", "Violence or gore"],
  ["hate", "仇恨内容", "Hateful content"],
  ["harassment", "骚扰或攻击他人", "Harassment or abuse"],
  ["spam", "广告或垃圾内容", "Spam or advertisement"],
  ["other", "其他不当内容", "Other inappropriate content"],
] as const;

export function DrawingReportDialog({ drawingId, onClose, onReported }: { drawingId: string; onClose: () => void; onReported: () => void }) {
  const { language } = useApp();
  const [reason, setReason] = useState("sexual");
  const [details, setDetails] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const response = await fetch(`/api/drawings/${drawingId}/reports`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason, details }),
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
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <form className="report-card" onSubmit={submit}>
        <p className="eyebrow danger-text">REPORT A DRAWING</p>
        <h2>{language === "zh" ? "这幅画有什么问题？" : "What’s wrong with this drawing?"}</h2>
        <p className="muted">{language === "zh" ? "提交后会暂时隐藏画作，并交给社区复核。" : "The drawing will be hidden temporarily and sent for community review."}</p>
        <div className="radio-list">
          {options.map(([value, zh, en]) => (
            <label key={value} className={reason === value ? "radio-option checked" : "radio-option"}>
              <input type="radio" name="reason" value={value} checked={reason === value} onChange={() => setReason(value)} />
              <span>{language === "zh" ? zh : en}</span>
            </label>
          ))}
        </div>
        <label className="field-label" htmlFor="drawing-report-details">{language === "zh" ? "补充说明（可选）" : "Details (optional)"}</label>
        <textarea id="drawing-report-details" className="text-input" value={details} onChange={(event) => setDetails(event.target.value)} maxLength={500} />
        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions">
          <button type="button" className="button ghost" onClick={onClose}>{language === "zh" ? "取消" : "Cancel"}</button>
          <button className="button danger" disabled={saving}>{saving ? "…" : language === "zh" ? "提交举报" : "Submit report"}</button>
        </div>
      </form>
    </div>
  );
}
