"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useApp } from "@/components/AppProvider";

export default function UploadPage() {
  const { language } = useApp();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [isMyCat, setIsMyCat] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photoAccessExplained, setPhotoAccessExplained] = useState(false);
  const [showPhotoAccess, setShowPhotoAccess] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  function select(next: File | null) {
    if (!next) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(next.type)) {
      setMessage({ type: "error", text: language === "zh" ? "请选择 JPG、PNG 或 WEBP 图片。" : "Choose a JPG, PNG, or WEBP image." });
      return;
    }
    if (next.size > 8 * 1024 * 1024) {
      setMessage({ type: "error", text: language === "zh" ? "图片不能超过 8 MB。" : "The image must be 8 MB or smaller." });
      return;
    }
    setFile(next);
    setPreview(URL.createObjectURL(next));
    setMessage(null);
  }

  function choosePhoto() {
    const mobileOrTablet = window.matchMedia("(pointer: coarse)").matches || window.matchMedia("(hover: none)").matches;
    if (mobileOrTablet && !photoAccessExplained) {
      setShowPhotoAccess(true);
      return;
    }
    inputRef.current?.click();
  }

  function allowSelectedPhotoAccess() {
    setPhotoAccessExplained(true);
    setShowPhotoAccess(false);
    inputRef.current?.click();
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!file) return;
    setSaving(true);
    const form = new FormData();
    form.append("image", file);
    form.append("isMyCat", String(isMyCat));
    const response = await fetch("/api/cats", { method: "POST", body: form });
    const data = await response.json();
    setSaving(false);
    if (!response.ok) {
      setMessage({ type: "error", text: data.error || (language === "zh" ? "上传失败。" : "Upload failed.") });
      return;
    }
    setFile(null); setPreview(""); setIsMyCat(false);
    if (inputRef.current) inputRef.current.value = "";
    setMessage({ type: "ok", text: language === "zh" ? "收到！猫图已送去社区审核。" : "Got it! Your cat is now awaiting community review." });
  }

  return (
    <div className="page-shell wrap narrow-page">
      <div className="page-title-row">
        <div><p className="eyebrow">ADD TO THE CAT PILE</p><h1>{language === "zh" ? "上传一只猫" : "Upload a cat"}</h1><p>{language === "zh" ? "需要经过社区审核才能进入猫库哦。" : "Community review comes first. Then it joins the drawing pool."}</p></div>
        <Link className="text-link" href="/my-cats">{language === "zh" ? "查看我的上传 →" : "See my uploads →"}</Link>
      </div>
      {message && <div className={message.type === "ok" ? "notice success" : "notice error"}>{message.type === "ok" ? "✓" : "!"} {message.text}</div>}
      <form className="upload-layout" onSubmit={submit}>
        <div
          className={`drop-zone ${dragging ? "dragging" : ""} ${preview ? "has-preview" : ""}`}
          onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => { event.preventDefault(); setDragging(false); select(event.dataTransfer.files[0]); }}
          onClick={choosePhoto}
        >
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden aria-label={language === "zh" ? "从设备选择猫图" : "Choose a cat image from this device"} onClick={(event) => { event.currentTarget.value = ""; }} onChange={(event) => select(event.target.files?.[0] ?? null)} />
          {preview ? <><img src={preview} alt={language === "zh" ? "待上传猫图预览" : "Cat upload preview"} /><button type="button" className="replace-photo">{language === "zh" ? "换一张" : "Choose another"}</button></> : <div className="drop-copy"><div className="upload-icon">↥</div><h2><span className="desktop-upload-copy">{language === "zh" ? "把猫拖到这里" : "Drop a cat right here"}</span><span className="mobile-upload-copy">{language === "zh" ? "从相册选择猫图" : "Choose a cat from Photos"}</span></h2><p className="desktop-upload-copy">{language === "zh" ? "或者点击选择图片" : "or click to choose a file"}</p><p className="mobile-upload-copy">{language === "zh" ? "点击后确认访问说明，再使用系统相册选择器" : "Review the access note, then use your system photo picker"}</p><button type="button" className="button primary mobile-gallery-button" onClick={(event) => { event.stopPropagation(); choosePhoto(); }}>▣ {language === "zh" ? "打开相册" : "Open Photos"}</button><small>JPG · PNG · WEBP / MAX 8 MB</small></div>}
        </div>
        <aside className="upload-sidebar">
          <div className="ownership-box">
            <label className="check-label">
              <input type="checkbox" checked={isMyCat} onChange={(event) => setIsMyCat(event.target.checked)} />
              <span className="fake-check">✓</span>
              <strong>{language === "zh" ? "这是我自己的猫" : "This is my own cat"}</strong>
            </label>
            <p>{language === "zh" ? "如果是网络图片或 Meme，请不要勾选。说明：不影响上传，不过勾选后可随时查看她人按这张图片画的猫哦" : "Leave this unchecked for internet images or memes. You can still upload them."}</p>
          </div>
          <div className="rules-box">
            <p className="eyebrow">QUICK CAT CHECK</p>
            <ul>
              <li className="allowed"><span>✓</span>{language === "zh" ? "猫、搞笑猫、猫咪 Meme" : "Cats, funny cats, cat memes"}</li>
              <li><span>×</span>{language === "zh" ? "无关图片或广告" : "Unrelated images or ads"}</li>
              <li><span>×</span>{language === "zh" ? "虐待、色情、暴力或血腥内容" : "Abuse, sexual, violent or graphic content"}</li>
            </ul>
          </div>
          <button className="button primary wide" disabled={!file || saving}>{saving ? (language === "zh" ? "正在上传…" : "Uploading…") : (language === "zh" ? "送去审核 →" : "Send for review →")}</button>
          <p className="microcopy">{language === "zh" ? "审核标准：24 小时内获得 10 份社区反馈，通过数大于反对数" : "Goal: 10 community reviews within 24 hours"}</p>
        </aside>
      </form>
      {showPhotoAccess && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="photo-access-title">
        <div className="photo-access-card">
          <div className="modal-cat">▣</div>
          <p className="eyebrow">SELECTED-PHOTO ACCESS</p>
          <h2 id="photo-access-title">{language === "zh" ? "允许选择一张相册照片" : "Allow access to one selected photo"}</h2>
          <p className="muted">{language === "zh" ? "接下来将打开手机或 iPad 的系统相册选择器。选择图片即代表你授权本网站读取并上传该图片。" : "Your phone or iPad will open its system photo picker. Selecting an image authorises this site to read and upload that image."}</p>
          <ul className="photo-access-points">
            <li><span>✓</span>{language === "zh" ? "网站只能读取你主动选择的图片" : "Only the image you select can be read"}</li>
            <li><span>✓</span>{language === "zh" ? "不会浏览或读取相册中的其他内容" : "The rest of your photo library stays private"}</li>
            <li><span>✓</span>{language === "zh" ? "提交前会先显示预览，你也可以取消" : "You can preview or cancel before uploading"}</li>
          </ul>
          <div className="modal-actions"><button type="button" className="button ghost" onClick={() => setShowPhotoAccess(false)}>{language === "zh" ? "暂不选择" : "Not now"}</button><button type="button" className="button primary" onClick={allowSelectedPhotoAccess}>{language === "zh" ? "允许并打开相册" : "Allow & open Photos"}</button></div>
        </div>
      </div>}
    </div>
  );
}
