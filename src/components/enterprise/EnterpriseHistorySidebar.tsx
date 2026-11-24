"use client";

import React, { useState } from "react";
import {
  Plus,
  History,
  ChevronRight,
  ChevronDown,
  Sun,
  Moon,
} from "lucide-react";
import { ExecutionRun } from "./types";

export interface ProjectEntry {
  id: string;
  title: string;
  domain: string;
  updatedAt: string;
  runsCount: number;
}

interface EnterpriseHistorySidebarProps {
  isDark: boolean;
  onToggleTheme?: () => void;
  projects: ProjectEntry[];
  activeProjectId: string;
  onSelectProject: (projectId: string) => void;
  onNewProject: () => void;
  executionHistory: ExecutionRun[];
  activeRunId?: string | null;
  onSelectRun: (run: ExecutionRun) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  className?: string;
}

export function EnterpriseHistorySidebar({
  isDark,
  onToggleTheme,
  projects,
  activeProjectId,
  onSelectProject,
  onNewProject,
  executionHistory,
  activeRunId,
  onSelectRun,
  className = "",
}: EnterpriseHistorySidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);

  const filteredProjects = projects.filter((p) =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.domain.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <aside
      style={{
        backgroundColor: isDark ? "#090A0D" : "#F8FAFC",
      }}
      className={`h-full flex flex-col min-w-0 transition-colors ${
        isDark ? "text-zinc-100 border-white/[0.08]" : "text-slate-900 border-slate-200"
      } ${className}`}
    >
      {/* Top 80%: Search + Projects + Run History */}
      <div className="h-[80%] min-h-0 flex flex-col">
        {/* Search Bar + New Project CTA (Single compact line) */}
        <div className={`p-2.5 sm:p-3 border-b flex items-center gap-2 shrink-0 ${isDark ? "border-white/[0.08]" : "border-slate-200"}`}>
          <div className="relative flex-1 min-w-0">
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                backgroundColor: isDark ? "#0E0F13" : "#FFFFFF",
              }}
              className={`w-full px-2.5 py-1 text-xs font-mono rounded-lg border outline-none transition-colors ${
                isDark
                  ? "border-white/[0.08] text-zinc-200 placeholder:text-zinc-500 focus:border-white/20"
                  : "border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-slate-400"
              }`}
            />
          </div>

          <button
            onClick={onNewProject}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-mono font-medium border transition-all cursor-pointer shrink-0 active:scale-95 ${
              isDark
                ? "bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 hover:text-white border-white/[0.08]"
                : "bg-slate-900 hover:bg-slate-800 text-white border-slate-900"
            }`}
            title="Create new optimization project"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New</span>
          </button>
        </div>

        {/* Projects List */}
        <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-0.5 custom-scrollbar">
          <div className="px-2 py-1 text-[10.5px] font-mono text-zinc-500 flex items-center justify-between">
            <span>Projects ({filteredProjects.length})</span>
          </div>

          {filteredProjects.map((proj) => {
            const isActive = proj.id === activeProjectId;
            return (
              <button
                key={proj.id}
                onClick={() => onSelectProject(proj.id)}
                className={`w-full flex flex-col text-left px-2.5 py-2 rounded-lg text-xs font-mono transition-colors cursor-pointer border ${
                  isActive
                    ? isDark
                      ? "bg-white/[0.05] text-zinc-100 border-white/[0.10]"
                      : "bg-white text-slate-900 border-slate-200 shadow-2xs"
                    : isDark
                    ? "border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.025]"
                    : "border-transparent hover:bg-slate-200/60 text-slate-600 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center justify-between gap-2 w-full">
                  <span className={`font-medium truncate ${isActive ? (isDark ? "text-zinc-100" : "text-slate-900") : isDark ? "text-zinc-400" : "text-slate-700"}`}>
                    {proj.title}
                  </span>
                  {isActive && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isDark ? "bg-zinc-200" : "bg-slate-900"}`} />}
                </div>
                <div className="flex items-center justify-between w-full text-[10px] text-zinc-500 pt-0.5">
                  <span className="truncate">{proj.domain}</span>
                  <span suppressHydrationWarning>{proj.updatedAt}</span>
                </div>
              </button>
            );
          })}

          {/* Collapsible Run History */}
          {executionHistory.length > 0 && (
            <div className={`pt-2.5 border-t mt-2.5 ${isDark ? "border-white/[0.06]" : "border-slate-200"}`}>
              <button
                onClick={() => setIsHistoryExpanded((prev) => !prev)}
                className="w-full flex items-center justify-between px-2 py-1 text-[10.5px] font-mono text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
              >
                <div className="flex items-center space-x-1.5">
                  <History className="w-3 h-3" />
                  <span>Run history ({executionHistory.length})</span>
                </div>
                {isHistoryExpanded ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
              </button>

              {isHistoryExpanded && (
                <div className="space-y-1 pt-1">
                  {executionHistory.map((run) => {
                    const isSelected = run.id === activeRunId;
                    const feasible = run.feasible;
                    return (
                      <div
                        key={run.id}
                        onClick={() => onSelectRun(run)}
                        className={`px-2.5 py-2 rounded-lg border text-[11px] font-mono transition-colors cursor-pointer ${
                          isSelected
                            ? isDark
                              ? "bg-white/[0.05] border-white/[0.10] text-zinc-200"
                              : "bg-white border-slate-200 text-slate-900 shadow-2xs"
                            : isDark
                            ? "border-transparent hover:bg-white/[0.025] text-zinc-400 hover:text-zinc-300"
                            : "border-transparent hover:bg-slate-100 text-slate-700"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={isDark ? "text-zinc-200" : "text-slate-900"}>Run #{run.runNumber}</span>
                          {feasible !== null && (
                            <span
                              className={`text-[10px] ${
                                feasible
                                  ? isDark ? "text-emerald-400" : "text-emerald-700"
                                  : isDark ? "text-amber-400" : "text-amber-700"
                              }`}
                            >
                              {feasible ? "Feasible" : "Suboptimal"}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-0.5">
                          <span>E = {typeof run.energy === "number" && Number.isFinite(run.energy) ? run.energy.toFixed(2) : "—"}</span>
                          <span>λ = {typeof run.penaltyLambda === "number" && Number.isFinite(run.penaltyLambda) ? run.penaltyLambda.toFixed(1) : "—"}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom 20%: Clean blank breathing room with Light / Dark theme switcher */}
      <div
        className={`h-[20%] shrink-0 border-t flex flex-col justify-end p-3 ${
          isDark ? "border-white/[0.08]" : "border-slate-200"
        }`}
      >
        {onToggleTheme && (
          <div className="flex items-center justify-between gap-2">
            <span className={`text-[11px] font-mono ${isDark ? "text-zinc-500" : "text-slate-500"}`}>
              Theme
            </span>
            <div
              className={`inline-flex items-center p-0.5 rounded-lg border text-[11px] font-mono ${
                isDark
                  ? "bg-[#0E0F13] border-white/[0.08]"
                  : "bg-slate-100 border-slate-200"
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  if (isDark) onToggleTheme();
                }}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md transition-colors cursor-pointer ${
                  !isDark
                    ? "bg-white text-slate-900 font-medium shadow-2xs"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
                title="Light theme"
              >
                <Sun className="w-3 h-3" />
                <span>Light</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!isDark) onToggleTheme();
                }}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md transition-colors cursor-pointer ${
                  isDark
                    ? "bg-white/[0.08] text-zinc-100 font-medium"
                    : "text-slate-500 hover:text-slate-800"
                }`}
                title="Dark theme"
              >
                <Moon className="w-3 h-3" />
                <span>Dark</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
