"use client";
import { useEffect, useState } from "react";

type Language = "ko" | "en";

export function LanguageSwitcher() {
  const [language, setLanguage] = useState<Language>("ko");

  useEffect(() => {
    const stored = localStorage.getItem("casa-language");
    const nextLanguage: Language = stored === "en" ? "en" : "ko";
    setLanguage(nextLanguage);
    document.documentElement.lang = nextLanguage;
    document.documentElement.dataset.lang = nextLanguage;
  }, []);

  const toggleLanguage = () => {
    const nextLanguage: Language = language === "ko" ? "en" : "ko";
    setLanguage(nextLanguage);
    localStorage.setItem("casa-language", nextLanguage);
    document.documentElement.lang = nextLanguage;
    document.documentElement.dataset.lang = nextLanguage;
  };

  return <button type="button" className="eyebrow rounded border border-[var(--line)] px-3 py-2 transition-colors hover:border-[var(--ink)]" onClick={toggleLanguage} aria-label={language === "ko" ? "Switch to English" : "한국어로 변경"}>{language === "ko" ? "EN" : "한국어"}</button>;
}
