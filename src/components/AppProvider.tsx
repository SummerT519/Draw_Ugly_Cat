"use client";

import { createContext, FormEvent, ReactNode, useContext, useEffect, useState } from "react";
import type { Language } from "@/lib/types";
import { usePathname } from "next/navigation";

type AppContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  nickname: string | null | undefined;
  editNickname: () => void;
};

const AppContext = createContext<AppContextValue | null>(null);

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used inside AppProvider");
  return context;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [language, setLanguageState] = useState<Language>("zh");
  const [nickname, setNickname] = useState<string | null | undefined>(undefined);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("ugly-cat-language");
    if (stored === "en") setLanguageState("en");
    fetch("/api/session")
      .then((response) => response.json())
      .then((data: { nickname: string | null }) => {
        setNickname(data.nickname);
        setDraft(data.nickname ?? "");
      })
      .catch(() => setNickname(null));
  }, []);

  function setLanguage(next: Language) {
    setLanguageState(next);
    localStorage.setItem("ugly-cat-language", next);
    document.documentElement.lang = next === "zh" ? "zh-CN" : "en";
  }

  async function saveNickname(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const response = await fetch("/api/session", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname: draft }),
    });
    const data = await response.json();
    setSaving(false);
    if (!response.ok) {
      setError(data.error || "保存失败");
      return;
    }
    setNickname(data.nickname);
    setEditing(false);
  }

  const mustChoose = nickname === null;
  return (
    <AppContext.Provider value={{ language, setLanguage, nickname, editNickname: () => setEditing(true) }}>
      {children}
      {!pathname.startsWith("/internal-console") && (mustChoose || editing) && (
        <div className="modal-backdrop" role="presentation">
          <form className="nickname-card" onSubmit={saveNickname} aria-labelledby="nickname-title">
            <div className="modal-cat" aria-hidden="true">ฅ^•ﻌ•^ฅ</div>
            <p className="eyebrow">{mustChoose ? "FIRST THINGS FIRST" : "NEW NAME, SAME CAT"}</p>
            <h2 id="nickname-title">
              {language === "zh" ? (mustChoose ? "你是哪位小猫？" : "修改昵称") : mustChoose ? "What should we call you?" : "Change nickname"}
            </h2>
            <p className="muted">
              {language === "zh" ? "昵称会与你的画一起公开展示" : "This name appears beside your drawings."}
            </p>
            <label className="field-label" htmlFor="nickname">
              {language === "zh" ? "昵称" : "Nickname"}
            </label>
            <input
              id="nickname"
              className="text-input"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={24}
              autoFocus
              placeholder={language === "zh" ? "例如：不会画猫" : "e.g. Cannot Draw Cats"}
            />
            {error && <p className="form-error">{error}</p>}
            <div className="modal-actions">
              {!mustChoose && (
                <button type="button" className="button ghost" onClick={() => { setEditing(false); setDraft(nickname ?? ""); }}>
                  {language === "zh" ? "取消" : "Cancel"}
                </button>
              )}
              <button className="button primary" disabled={saving || !draft.trim()}>
                {saving ? "…" : language === "zh" ? "开始画猫" : "Let’s draw"}
              </button>
            </div>
          </form>
        </div>
      )}
    </AppContext.Provider>
  );
}
