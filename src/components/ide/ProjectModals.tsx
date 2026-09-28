"use client";

import React, { useState } from "react";
import {
  X,
  Search,
  Plus,
  Folder,
  Check,
  Cpu,
  Layers,
  Sparkles,
  Cloud,
  Package,
  Trash2,
} from "lucide-react";
import { ProjectItem, FrameworkType } from "./types";

interface ProjectSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: ProjectItem[];
  activeProject: ProjectItem;
  onSelectProject: (proj: ProjectItem) => void;
  onOpenNewProject: () => void;
  onDeleteProject?: (projectId: string) => void;
  isDark: boolean;
}

export function ProjectSwitcherModal({
  isOpen,
  onClose,
  projects,
  activeProject,
  onSelectProject,
  onOpenNewProject,
  onDeleteProject,
  isDark,
}: ProjectSwitcherModalProps) {
  const [search, setSearch] = useState("");

  if (!isOpen) return null;

  const filtered = projects.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.desc.toLowerCase().includes(search.toLowerCase()) ||
      p.framework.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        className={`w-full max-w-lg max-h-[85vh] flex flex-col rounded-xl border shadow-2xl overflow-hidden font-sans ${
          isDark
            ? "bg-[#0E0F13] border-white/[0.1] text-zinc-100"
            : "bg-white border-slate-200 text-slate-900"
        }`}
      >
        {/* Modal Header */}
        <div
          className={`p-4 border-b flex items-center justify-between shrink-0 ${
            isDark ? "border-white/[0.08]" : "border-slate-200"
          }`}
        >
          <div className="flex items-center space-x-2">
            <Folder className="w-4 h-4 text-sky-400" />
            <h3 className="font-semibold text-sm">Switch Quantum Project</h3>
          </div>
          <button
            onClick={onClose}
            className={`p-1 rounded-md transition-colors ${
              isDark
                ? "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05]"
                : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div
          className={`p-3 border-b flex items-center space-x-2 shrink-0 ${
            isDark ? "border-white/[0.08]" : "border-slate-200"
          }`}
        >
          <Search className={`w-4 h-4 ${isDark ? "text-zinc-500" : "text-slate-400"}`} />
          <input
            type="text"
            placeholder="Search projects or archetypes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full bg-transparent text-xs font-mono outline-none border-none ${
              isDark
                ? "placeholder-zinc-500 text-zinc-200"
                : "placeholder-slate-400 text-slate-900"
            }`}
            autoFocus
          />
        </div>

        {/* Project List */}
        <div
          className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1 custom-scrollbar"
          style={{
            maxHeight: "calc(85vh - 145px)",
            scrollbarWidth: "thin",
            scrollbarColor: isDark
              ? "rgba(255, 255, 255, 0.3) transparent"
              : "rgba(100, 116, 139, 0.45) transparent",
          }}
        >
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-500 font-mono">
              No matching quantum projects found.
            </div>
          ) : (
            filtered.map((proj) => {
              const isSelected = proj.id === activeProject.id;
              return (
                <div
                  key={proj.id}
                  onClick={() => {
                    onSelectProject(proj);
                    onClose();
                  }}
                  className={`p-3 rounded-lg flex items-center justify-between cursor-pointer transition-all border ${
                    isSelected
                      ? isDark
                        ? "bg-white/[0.08] border-sky-500/40"
                        : "bg-sky-50 border-sky-300"
                      : isDark
                      ? "hover:bg-white/[0.04] border-transparent"
                      : "hover:bg-slate-100 border-transparent"
                  }`}
                >
                  <div className="space-y-1 min-w-0 pr-2">
                    <div className="flex items-center space-x-2">
                      <span className={`font-semibold text-xs truncate ${isDark ? "text-zinc-200" : "text-slate-900"}`}>
                        {proj.title}
                      </span>
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.2 rounded uppercase ${
                          proj.framework === "dwave"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                        }`}
                      >
                        {proj.framework}
                      </span>
                    </div>
                    <p className={`text-[11px] truncate ${isDark ? "text-zinc-400" : "text-slate-500"}`}>
                      {proj.desc}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 shrink-0">
                    {proj.isCustom ? (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center space-x-1">
                        <Cloud className="w-3 h-3" />
                        <span>Cloud</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 flex items-center space-x-1">
                        <Package className="w-3 h-3" />
                        <span>Template</span>
                      </span>
                    )}
                    {isSelected && <Check className="w-4 h-4 text-sky-400 shrink-0" />}
                    {proj.isCustom && onDeleteProject && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteProject(proj.id);
                        }}
                        className="p-1 rounded hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-colors"
                        title="Delete Project from Cloud"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div
          className={`p-3 border-t flex items-center justify-between text-xs shrink-0 ${
            isDark
              ? "border-white/[0.08] bg-white/[0.02]"
              : "border-slate-200 bg-slate-50/70"
          }`}
        >
          <span className={`text-[11px] font-mono ${isDark ? "text-zinc-500" : "text-slate-500"}`}>
            {projects.length} Workspace Projects
          </span>
          <button
            onClick={() => {
              onClose();
              onOpenNewProject();
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Project</span>
          </button>
        </div>
      </div>
    </div>
  );
}

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProject: (proj: ProjectItem) => void;
  isDark: boolean;
}

export function NewProjectModal({
  isOpen,
  onClose,
  onCreateProject,
  isDark,
}: NewProjectModalProps) {
  const [name, setName] = useState("");
  const [framework, setFramework] = useState<FrameworkType>("dwave");
  const [template, setTemplate] = useState("portfolio");

  if (!isOpen) return null;

  const handleCreate = () => {
    if (!name.trim()) return;
    const newProj: ProjectItem = {
      id: name.toLowerCase().replace(/[^a-z0-9]/g, "_"),
      title: name,
      desc: `User quantum project built on ${framework.toUpperCase()} framework.`,
      framework,
      updated: "Just now",
      files:
        framework === "dwave"
          ? ["main.py", "qubo_matrix.py", "config.json"]
          : ["main.py", "circuit.qasm", "config.json"],
      activeFile: "main.py",
    };
    onCreateProject(newProj);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        className={`w-full max-w-md max-h-[90vh] overflow-y-auto custom-scrollbar rounded-xl border shadow-2xl p-6 space-y-5 font-sans ${
          isDark
            ? "bg-[#0E0F13] border-white/[0.1] text-zinc-100"
            : "bg-white border-slate-200 text-slate-900"
        }`}
      >
        <div
          className={`flex items-center justify-between border-b pb-3 ${
            isDark ? "border-white/[0.08]" : "border-slate-200"
          }`}
        >
          <h3 className="font-semibold text-sm">Create New Quantum Project</h3>
          <button
            onClick={onClose}
            className={`p-1 rounded-md transition-colors ${
              isDark
                ? "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05]"
                : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 text-xs font-mono">
          <div className="space-y-1.5">
            <label className={isDark ? "text-zinc-400" : "text-slate-600"}>Project Name</label>
            <input
              type="text"
              placeholder="e.g. quantum-finance-v2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`w-full p-2 rounded-md border outline-none ${
                isDark
                  ? "bg-[#090A0D] border-white/[0.1] text-zinc-200 focus:border-sky-500"
                  : "bg-slate-50 border-slate-200 text-slate-900 focus:border-sky-500"
              }`}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label className={isDark ? "text-zinc-400" : "text-slate-600"}>Quantum Framework</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFramework("dwave")}
                className={`p-3 rounded-lg border text-left flex flex-col space-y-1 transition-all ${
                  framework === "dwave"
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                    : isDark
                    ? "border-white/[0.08] text-zinc-400 hover:border-zinc-700"
                    : "border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                <span className="font-semibold text-xs">D-Wave Annealing</span>
                <span className="text-[10px] opacity-75 font-sans">
                  QUBO & Ising Optimization
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFramework("qiskit")}
                className={`p-3 rounded-lg border text-left flex flex-col space-y-1 transition-all ${
                  framework === "qiskit"
                    ? "border-sky-500 bg-sky-500/10 text-sky-400"
                    : isDark
                    ? "border-white/[0.08] text-zinc-400 hover:border-zinc-700"
                    : "border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                <span className="font-semibold text-xs">Qiskit Gate Model</span>
                <span className="text-[10px] opacity-75 font-sans">
                  Circuits & Aer Simulation
                </span>
              </button>
            </div>
          </div>
        </div>

        <div
          className={`flex items-center justify-end space-x-2 pt-2 border-t ${
            isDark ? "border-white/[0.08]" : "border-slate-200"
          }`}
        >
          <button
            onClick={onClose}
            className={`px-3 py-1.5 rounded-md text-xs transition-colors ${
              isDark ? "text-zinc-400 hover:text-zinc-200" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim()}
            className="px-4 py-1.5 rounded-md bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-medium text-xs shadow-xs transition-colors"
          >
            Create Project
          </button>
        </div>
      </div>
    </div>
  );
}
