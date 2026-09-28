"use client";

import React from "react";
import {
  Folder,
  FileCode,
  FileText,
  FileJson,
  Plus,
  Layers,
  ChevronRight,
} from "lucide-react";
import { ProjectItem } from "./types";

interface ProjectExplorerProps {
  isDark: boolean;
  activeProject: ProjectItem;
  activeFile: string;
  onSelectFile: (file: string) => void;
}

export function ProjectExplorer({
  isDark,
  activeProject,
  activeFile,
  onSelectFile,
}: ProjectExplorerProps) {
  const getFileIcon = (file: string) => {
    if (file.endsWith(".py")) {
      return (
        <FileCode
          className={`w-3.5 h-3.5 ${
            activeProject.framework === "dwave"
              ? "text-emerald-400"
              : "text-sky-400"
          }`}
        />
      );
    }
    if (file.endsWith(".json")) {
      return <FileJson className="w-3.5 h-3.5 text-amber-400" />;
    }
    return <FileText className="w-3.5 h-3.5 text-zinc-400" />;
  };

  return (
    <aside
      className={`w-52 border-r flex flex-col shrink-0 transition-colors select-none ${
        isDark ? "bg-[#090A0D] border-white/[0.08]" : "bg-slate-50 border-slate-200"
      }`}
    >
      {/* Workspace Section Header */}
      <div
        className={`h-9 px-3.5 border-b flex items-center justify-between text-[11px] font-semibold tracking-wider uppercase font-mono ${
          isDark ? "border-white/[0.08] text-zinc-400" : "border-slate-200 text-slate-500"
        }`}
      >
        <span>Explorer</span>
        <span className="text-[10px] text-zinc-500 font-normal">
          {activeProject.files.length} files
        </span>
      </div>

      {/* Project Folder Manifest */}
      <div className="p-2 space-y-1">
        <div
          className={`flex items-center space-x-2 px-2 py-1.5 rounded-md text-xs font-mono font-medium ${
            isDark ? "text-zinc-200" : "text-slate-700"
          }`}
        >
          <Folder className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="truncate">{activeProject.id}</span>
        </div>

        {/* File items */}
        <div className="pl-4 space-y-0.5">
          {activeProject.files.map((file) => {
            const isSelected = activeFile === file;
            return (
              <button
                key={file}
                onClick={() => onSelectFile(file)}
                className={`w-full flex items-center space-x-2 px-2.5 py-1 rounded-md text-xs font-mono transition-all text-left ${
                  isSelected
                    ? isDark
                      ? "bg-white/[0.08] text-white font-medium border border-white/[0.08]"
                      : "bg-white text-slate-900 font-medium shadow-xs border border-slate-200"
                    : isDark
                    ? "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                }`}
              >
                {getFileIcon(file)}
                <span className="truncate">{file}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SLA & Config Summary Pill at Bottom of Explorer */}
      <div className="mt-auto p-3 border-t border-white/[0.06] text-[10px] font-mono space-y-1 text-zinc-500">
        <div className="flex justify-between">
          <span>Target SLA:</span>
          <span className="text-zinc-400">P95 &lt; 50ms</span>
        </div>
        <div className="flex justify-between">
          <span>Engine:</span>
          <span className="text-zinc-400 capitalize">{activeProject.framework}</span>
        </div>
      </div>
    </aside>
  );
}
