"use client";

import React, { useState } from "react";
import {
  Plus,
  Search,
  Folder,
  History,
  Check,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  Layers,
  Sparkles,
  Clock,
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
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(true);

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
                : "border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-sky-500"
            }`}
          />
        </div>

        <button
          onClick={onNewProject}
          className="flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-mono font-medium bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 hover:text-white border border-white/[0.08] transition-all cursor-pointer shrink-0 active:scale-95"
          title="Create new optimization project"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New</span>
        </button>
      </div>

      {/* Projects List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
        <div className="px-2 py-1 text-[11px] font-mono text-zinc-500 flex items-center justify-between">
          <span>Active projects ({filteredProjects.length})</span>
        </div>

        {filteredProjects.map((proj) => {
          const isActive = proj.id === activeProjectId;
          return (
            <button
              key={proj.id}
              onClick={() => onSelectProject(proj.id)}
              className={`w-full flex flex-col text-left p-2.5 rounded-lg text-xs font-mono transition-all cursor-pointer border ${
                isActive
                  ? isDark
                    ? "bg-white/[0.04] text-zinc-200 border-white/[0.08]"
                    : "bg-white text-slate-900 border-slate-200 shadow-xs"
                  : isDark
                  ? "border-transparent text-zinc-400 hover:text-zinc-300 hover:bg-white/[0.02]"
                  : "border-transparent hover:bg-slate-200/60 text-slate-600 hover:text-slate-900"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className={`font-medium truncate ${isActive ? "text-zinc-200" : isDark ? "text-zinc-400" : "text-slate-700"}`}>{proj.title}</span>
                {isActive && <span className="w-1.5 h-1.5 rounded-full bg-sky-400/70 shrink-0" />}
              </div>
              <div className="flex items-center justify-between w-full text-[10px] text-zinc-500 pt-1">
                <span className="truncate">{proj.domain}</span>
                <span suppressHydrationWarning>{proj.updatedAt}</span>
              </div>
            </button>
          );
        })}

        {/* Chronological Execution Runs Section */}
        <div className="pt-3 border-t border-white/[0.08] mt-3">
          <button
            onClick={() => setIsHistoryExpanded((prev) => !prev)}
            className="w-full flex items-center justify-between px-2 py-1.5 text-[11px] font-mono text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
          >
            <div className="flex items-center space-x-1.5">
              <History className="w-3.5 h-3.5 text-sky-400" />
              <span className={`font-semibold ${isDark ? "text-zinc-300" : "text-slate-700"}`}>Run history ({executionHistory.length})</span>
            </div>
            {isHistoryExpanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </button>

          {isHistoryExpanded && (
            <div className="space-y-1 pt-1">
              {executionHistory.length === 0 ? (
                <div className="px-2 py-3 text-[11px] font-mono text-zinc-500 leading-relaxed">
                  No runs yet. Submit a problem in Copilot to populate run history.
                </div>
              ) : (
                executionHistory.map((run) => {
                  const isSelected = run.id === activeRunId;
                  const feasible = run.feasible;
                  return (
                    <div
                      key={run.id}
                      onClick={() => onSelectRun(run)}
                      className={`p-2.5 rounded-lg border text-xs font-mono transition-all cursor-pointer ${
                        isSelected
                          ? isDark
                            ? "bg-white/[0.04] border-white/[0.08] text-zinc-200"
                            : "bg-white border-slate-200 text-slate-900 shadow-xs"
                          : isDark
                          ? "border-transparent hover:bg-white/[0.02] text-zinc-400 hover:text-zinc-300"
                          : "border-slate-200 hover:bg-slate-100 text-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between pb-1">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-medium text-sky-400">Run #{run.runNumber}</span>
                          <span suppressHydrationWarning className="text-[10px] text-zinc-500">{run.timestamp}</span>
                        </div>
                        {feasible !== null && (
                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                              feasible
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            }`}
                          >
                            {feasible ? "Feasible" : "Suboptimal"}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-zinc-400">
                        <span>
                          E = {typeof run.energy === "number" && Number.isFinite(run.energy) ? run.energy.toFixed(3) : "—"}
                        </span>
                        <span>
                          λ = {typeof run.penaltyLambda === "number" && Number.isFinite(run.penaltyLambda) ? run.penaltyLambda.toFixed(1) : "—"}
                        </span>
                      </div>

                      <div className="text-[10px] text-zinc-500 pt-0.5 truncate">
                        {typeof run.runtimeMs === "number" ? `${run.runtimeMs}ms · ` : ""}{run.solver}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
