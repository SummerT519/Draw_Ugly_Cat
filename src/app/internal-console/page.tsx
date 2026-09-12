"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type AdminCat = { id: string; imageUrl: string; status: string; isVisible: number; isMyCat: number; createdAt: string; sourceUrl: string | null; owner: string; drawingCount: number; reportCount: number };
type AdminDrawing = { id: string; catId: string; imageUrl: string; moderationStatus: "visible" | "under_review" | "hidden"; createdAt: string; artist: string; reportCount: number };
type AdminReport = { id: string; itemId: string; imageUrl: string; reason: string; details: string | null; createdAt: string; reporter: string };
type AdminFeedback = { id: string; type: "bug" | "suggestion"; message: string; pageUrl: string | null; status: "new" | "resolved"; createdAt: string; nickname: string };
type Dashboard = {
  stats: { cats: number; drawings: number; catReports: number; drawingReports: number; feedback: number };
  cats: AdminCat[];
  drawings: AdminDrawing[];
  reports: { cats: AdminReport[]; drawings: AdminReport[] };
  feedback: AdminFeedback[];
};

export default function InternalConsolePage() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [configured, setConfigured] = useState(true);
  const [accessKey, setAccessKey] = useState("");
  const [loginError, setLoginError] = useState("");
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [tab, setTab] = useState<"content" | "reports" | "feedback">("content");
  const [contentType, setContentType] = useState<"cats" | "drawings">("cats");
  const [busy, setBusy] = useState("");

  const loadDashboard = useCallback(async () => {
    const response = await fetch("/api/internal/dashboard", { cache: "no-store" });
    if (response.status === 401) { setAuthenticated(false); setDashboard(null); return; }
    setDashboard(await response.json());
  }, []);

  useEffect(() => {
    fetch("/api/internal/session", { cache: "no-store" }).then((response) => response.json()).then((data) => {
      setAuthenticated(data.authenticated);
      setConfigured(data.configured);
      if (data.authenticated) void loadDashboard();
    });
  }, [loadDashboard]);

  async function login(event: FormEvent) {
    event.preventDefault();
    setLoginError("");
    const response = await fetch("/api/internal/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accessKey }) });
    if (!response.ok) { setLoginError("访问密钥不正确。"); return; }
    setAccessKey("");
    setAuthenticated(true);
    await loadDashboard();
  }

  async function logout() {
    await fetch("/api/internal/session", { method: "DELETE" });
    setAuthenticated(false);
    setDashboard(null);
  }

  async function moderate(entity: "cat" | "drawing" | "feedback", id: string, action: string) {
    if (action === "delete" && !window.confirm("永久删除后无法恢复。确认继续吗？")) return;
    setBusy(`${entity}:${id}:${action}`);
    const response = await fetch("/api/internal/moderate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entity, id, action }) });
    setBusy("");
    if (response.status === 401) { setAuthenticated(false); setDashboard(null); return; }
    if (!response.ok) { window.alert("操作失败，请刷新后重试。"); return; }
    await loadDashboard();
  }

  if (authenticated === null) return <div className="admin-gate"><div className="admin-loading">正在验证内部访问权限…</div></div>;
  if (!authenticated) return (
    <div className="admin-gate">
      <form className="admin-login-card" onSubmit={login}>
        <div className="admin-lock">⌁</div><p className="eyebrow">PRIVATE OPERATIONS</p><h1>内部管理台</h1>
        <p>此页面不属于公开网站。请输入内部访问密钥继续。</p>
        {!configured && <div className="notice error">服务器尚未设置 ADMIN_ACCESS_KEY。</div>}
        <label className="field-label" htmlFor="admin-key">访问密钥</label>
        <input id="admin-key" className="text-input" type="password" value={accessKey} onChange={(event) => setAccessKey(event.target.value)} autoComplete="current-password" autoFocus />
        {loginError && <p className="form-error">{loginError}</p>}
        <button className="button primary wide" disabled={!accessKey || !configured}>验证并进入</button>
      </form>
    </div>
  );

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar"><div><p className="eyebrow">UGLY CAT OPS</p><h1>内部管理台</h1></div><nav><button className={tab === "content" ? "active" : ""} onClick={() => setTab("content")}>▦ 内容总览</button><button className={tab === "reports" ? "active" : ""} onClick={() => setTab("reports")}>⚑ 被举报内容 <span>{(dashboard?.stats.catReports ?? 0) + (dashboard?.stats.drawingReports ?? 0)}</span></button><button className={tab === "feedback" ? "active" : ""} onClick={() => setTab("feedback")}>✦ 用户反馈 <span>{dashboard?.stats.feedback ?? 0}</span></button></nav><button className="admin-logout" onClick={logout}>退出内部管理台</button></aside>
      <section className="admin-main">
        <header className="admin-topbar"><div><p className="eyebrow">INTERNAL · AUTHENTICATED</p><h2>{tab === "content" ? "内容总览" : tab === "reports" ? "被举报内容" : "用户反馈"}</h2></div><button className="button small" onClick={loadDashboard}>刷新数据 ↻</button></header>
        {!dashboard ? <div className="admin-loading">正在加载数据…</div> : tab === "content" ? (
          <>
            <div className="admin-stats"><article><span>猫图总数</span><strong>{dashboard.stats.cats}</strong></article><article><span>画作总数</span><strong>{dashboard.stats.drawings}</strong></article><article><span>待处理举报</span><strong>{dashboard.stats.catReports + dashboard.stats.drawingReports}</strong></article><article><span>新反馈</span><strong>{dashboard.stats.feedback}</strong></article></div>
            <div className="admin-section-bar"><div className="admin-segment"><button className={contentType === "cats" ? "active" : ""} onClick={() => setContentType("cats")}>全部猫图 ({dashboard.cats.length})</button><button className={contentType === "drawings" ? "active" : ""} onClick={() => setContentType("drawings")}>全部画作 ({dashboard.drawings.length})</button></div></div>
            {contentType === "cats" ? <div className="admin-content-grid">{dashboard.cats.map((cat) => <article className="admin-content-card" key={cat.id}><img src={cat.imageUrl} alt="猫图" /><div className="admin-content-body"><div className="admin-tags"><span>{cat.status}</span><span className={cat.isVisible ? "safe" : "danger"}>{cat.isVisible ? "公开" : "已隐藏"}</span>{cat.reportCount > 0 && <span className="danger">{cat.reportCount} 举报</span>}</div><strong>{cat.owner}</strong><small>{cat.drawingCount} 幅画作 · {new Date(cat.createdAt).toLocaleDateString("zh-CN")}</small><code>{cat.id}</code><div className="admin-card-actions"><button onClick={() => moderate("cat", cat.id, cat.isVisible ? "hide" : "restore")} disabled={busy.startsWith(`cat:${cat.id}:`)}>{cat.isVisible ? "不显示" : "恢复显示"}</button><button className="danger" onClick={() => moderate("cat", cat.id, "delete")} disabled={busy.startsWith(`cat:${cat.id}:`)}>永久删除</button></div></div></article>)}</div> : <div className="admin-content-grid">{dashboard.drawings.map((drawing) => <article className="admin-content-card" key={drawing.id}><img src={drawing.imageUrl} alt="用户画作" /><div className="admin-content-body"><div className="admin-tags"><span className={drawing.moderationStatus === "visible" ? "safe" : "danger"}>{drawing.moderationStatus}</span>{drawing.reportCount > 0 && <span className="danger">{drawing.reportCount} 举报</span>}</div><strong>{drawing.artist}</strong><small>猫图 {drawing.catId.slice(0, 12)}… · {new Date(drawing.createdAt).toLocaleDateString("zh-CN")}</small><code>{drawing.id}</code><div className="admin-card-actions"><button onClick={() => moderate("drawing", drawing.id, drawing.moderationStatus === "visible" ? "hide" : "restore")} disabled={busy.startsWith(`drawing:${drawing.id}:`)}>{drawing.moderationStatus === "visible" ? "不显示" : "恢复显示"}</button><button className="danger" onClick={() => moderate("drawing", drawing.id, "delete")} disabled={busy.startsWith(`drawing:${drawing.id}:`)}>永久删除</button></div></div></article>)}</div>}
          </>
        ) : tab === "reports" ? (
          <div className="admin-report-sections"><ReportList title="被举报的猫图" reports={dashboard.reports.cats} empty="没有待处理的猫图举报。" actions={(report) => <><button onClick={() => moderate("cat", report.itemId, "hide")}>不显示</button><button onClick={() => moderate("cat", report.itemId, "restore")}>保留并显示</button><button className="danger" onClick={() => moderate("cat", report.itemId, "delete")}>删除</button></>} /><ReportList title="被举报的画作" reports={dashboard.reports.drawings} empty="没有待处理的画作举报。" actions={(report) => <><button onClick={() => moderate("drawing", report.itemId, "hide")}>不显示</button><button onClick={() => moderate("drawing", report.itemId, "restore")}>保留并显示</button><button className="danger" onClick={() => moderate("drawing", report.itemId, "delete")}>删除</button></>} /></div>
        ) : (
          <div className="admin-feedback-list">{dashboard.feedback.length === 0 ? <div className="admin-empty">暂无用户反馈。</div> : dashboard.feedback.map((item) => <article className={item.status === "resolved" ? "admin-feedback-card resolved" : "admin-feedback-card"} key={item.id}><div className="admin-feedback-heading"><span>{item.type === "bug" ? "🐛 BUG" : "💡 改进建议"}</span><time>{new Date(item.createdAt).toLocaleString("zh-CN")}</time></div><p>{item.message}</p><small>来自：{item.nickname}{item.pageUrl ? ` · 页面：${item.pageUrl}` : ""}</small><button onClick={() => moderate("feedback", item.id, item.status === "new" ? "resolve" : "reopen")}>{item.status === "new" ? "标记已处理" : "重新打开"}</button></article>)}</div>
        )}
      </section>
    </div>
  );
}

function ReportList({ title, reports, empty, actions }: { title: string; reports: AdminReport[]; empty: string; actions: (report: AdminReport) => React.ReactNode }) {
  return <section><h3>{title} <span>{reports.length}</span></h3>{reports.length === 0 ? <div className="admin-empty">{empty}</div> : <div className="admin-report-list">{reports.map((report) => <article key={report.id}><img src={report.imageUrl} alt="被举报内容" /><div><strong>{report.reason.replaceAll("_", " ")}</strong><p>{report.details || "未提供补充说明"}</p><small>举报人：{report.reporter} · {new Date(report.createdAt).toLocaleString("zh-CN")}</small></div><div className="admin-card-actions">{actions(report)}</div></article>)}</div>}</section>;
}
