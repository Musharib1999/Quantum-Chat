"use client";

import React, { useEffect, useRef, useState } from "react";
import { ArrowRight, X } from "lucide-react";
import type { LibraryDetail } from "@/lib/problemLibrary";

interface EnterpriseNewProjectModalProps {
  isOpen: boolean;
  isDark: boolean;
  initialName?: string;
  templateProblem?: LibraryDetail | null;
  onClose: () => void;
  onCreateBlank: (projectName: string) => void;
  onOpenProblemVault: (draftName: string) => void;
  onConfirmInstantiate: (problem: LibraryDetail, projectName: string) => void;
}

export function EnterpriseNewProjectModal({
  isOpen,
  isDark,
  initialName = "",
  templateProblem = null,
  onClose,
  onCreateBlank,
  onOpenProblemVault,
  onConfirmInstantiate,
}: EnterpriseNewProjectModalProps) {
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const defaultVal = initialName.trim() || templateProblem?.title || "";
    setName(defaultVal);
    const id = setTimeout(() => {
      inputRef.current?.focus();
      if (templateProblem) {
        inputRef.current?.select();
      }
    }, 20);
    return () => clearTimeout(id);
  }, [isOpen, initialName, templateProblem]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isInstantiate = Boolean(templateProblem);
  const border = isDark ? "border-white/[0.10]" : "border-slate-200";
  const textMain = isDark ? "text-zinc-100" : "text-slate-900";
  const textMuted = isDark ? "text-zinc-400" : "text-slate-600";
  const textFaint = isDark ? "text-zinc-500" : "text-slate-500";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    if (templateProblem) {
      onConfirmInstantiate(templateProblem, trimmed);
    } else {
      onCreateBlank(trimmed);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-[1px]" />

      <form
        onSubmit={handleSubmit}
        role="dialog"
        aria-label={isInstantiate ? "Instantiate Project" : "New Project"}
        style={{ backgroundColor: isDark ? "#0C0D11" : "#FFFFFF" }}
        className={`relative z-10 w-full max-w-md rounded-xl border shadow-2xl overflow-hidden ${border}`}
      >
        {/* Header */}
        <div className={`px-5 py-4 border-b flex items-center justify-between gap-3 ${border}`}>
          <h2 className={`text-sm font-semibold font-sans tracking-tight ${textMain}`}>
            {isInstantiate ? "Instantiate Project" : "New Project"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={`p-1 rounded-md cursor-pointer transition-colors ${textFaint} ${
              isDark ? "hover:bg-white/[0.06] hover:text-zinc-200" : "hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {templateProblem && (
            <div
              className={`rounded-lg border px-3 py-2 text-[11.5px] font-mono ${border} ${
                isDark ? "bg-white/[0.02]" : "bg-slate-50"
              }`}
            >
              <div className={textFaint}>
                {templateProblem.industry} · {templateProblem.problemType}
              </div>
              <div className={`font-sans font-medium truncate mt-0.5 ${textMain}`}>
                {templateProblem.title}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className={`block text-[11px] font-mono ${textMuted}`}>Project name</label>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isInstantiate ? "Enter a name for this project..." : "e.g., Q4 Fleet Dispatch"}
              className={`w-full h-9 px-3 rounded-lg border text-[13px] font-sans outline-none transition-colors ${
                isDark
                  ? "bg-[#090A0D] border-white/[0.10] text-zinc-100 placeholder:text-zinc-600 focus:border-white/[0.26]"
                  : "bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-slate-500"
              }`}
            />
          </div>

          {/* Doorway Card to Problem Vault (shown only in New Project mode) */}
          {!isInstantiate && (
            <button
              type="button"
              onClick={() => onOpenProblemVault(name.trim())}
              className={`w-full text-left p-3.5 rounded-lg border transition-colors cursor-pointer group ${
                isDark
                  ? "bg-white/[0.02] border-white/[0.08] hover:border-white/[0.18] hover:bg-white/[0.04]"
                  : "bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-slate-100"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold font-sans ${textMain}`}>Problem Vault</span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                        isDark
                          ? "bg-white/[0.04] border-white/[0.08] text-zinc-400"
                          : "bg-white border-slate-200 text-slate-600"
                      }`}
                    >
                      48 Verified
                    </span>
                  </div>
                  <p className={`text-[11.5px] font-sans ${textMuted}`}>
                    Review verified benchmarks and instantiate into a project
                  </p>
                </div>
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-mono shrink-0 ${
                    isDark ? "text-zinc-300 group-hover:text-white" : "text-slate-700 group-hover:text-slate-900"
                  }`}
                >
                  Browse
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </div>
            </button>
          )}
        </div>

        {/* Footer */}
        <div
          style={{ backgroundColor: isDark ? "#090A0D" : "#F8FAFC" }}
          className={`px-5 py-3 border-t flex items-center justify-end gap-2 ${border}`}
        >
          <button
            type="button"
            onClick={onClose}
            className={`px-3 py-1.5 rounded-lg text-[11.5px] font-mono cursor-pointer transition-colors ${
              isDark ? "text-zinc-400 hover:text-zinc-200" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name.trim()}
            className={`px-3.5 py-1.5 rounded-lg text-[11.5px] font-mono font-medium border transition-colors ${
              !name.trim()
                ? isDark
                  ? "bg-white/[0.03] border-white/[0.06] text-zinc-600 cursor-not-allowed"
                  : "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                : isDark
                ? "bg-white/[0.12] hover:bg-white/[0.18] border-white/[0.20] text-zinc-100 cursor-pointer"
                : "bg-slate-900 hover:bg-slate-800 border-slate-900 text-white cursor-pointer"
            }`}
          >
            {isInstantiate ? "Create Project" : "Blank Project"}
          </button>
        </div>
      </form>
    </div>
  );
}
