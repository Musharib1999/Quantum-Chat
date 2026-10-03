"use client";

import React, { useState } from "react";
import {
  X,
  Search,
  Plus,
  Folder,
  FolderPlus,
  Check,
  Cpu,
  Layers,
  Sparkles,
  Cloud,
  Package,
  Trash2,
  ArrowRight,
} from "lucide-react";
import { ProjectItem, FrameworkType } from "./types";

interface ProjectSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: ProjectItem[];
  activeProject: ProjectItem;
  onSelectProject: (proj: ProjectItem) => void;
  onOpenNewProject: () => void;
  onOpenAlgorithmStudio?: () => void;
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
  onOpenAlgorithmStudio,
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
        className={`w-full max-w-lg max-h-[85vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden font-sans ${
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
            className={`p-1 rounded-md transition-colors cursor-pointer ${
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
            maxHeight: "calc(85vh - 150px)",
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
                        className="p-1 rounded hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
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
          className={`p-3.5 border-t flex items-center justify-between text-xs shrink-0 ${
            isDark
              ? "border-white/[0.08] bg-white/[0.02]"
              : "border-slate-200 bg-slate-50/70"
          }`}
        >
          {onOpenAlgorithmStudio ? (
            <button
              onClick={() => {
                onClose();
                onOpenAlgorithmStudio();
              }}
              className="flex items-center space-x-1.5 text-[11px] font-mono text-purple-400 hover:text-purple-300 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Browse Algorithm Vault →</span>
            </button>
          ) : (
            <span className={`text-[11px] font-mono ${isDark ? "text-zinc-500" : "text-slate-500"}`}>
              {projects.length} Workspace Projects
            </span>
          )}

          <button
            onClick={() => {
              onClose();
              onOpenNewProject();
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs shadow-xs transition-colors cursor-pointer"
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
  onOpenAlgorithmStudio?: () => void;
  isDark: boolean;
}

export function NewProjectModal({
  isOpen,
  onClose,
  onCreateProject,
  onOpenAlgorithmStudio,
  isDark,
}: NewProjectModalProps) {
  const [name, setName] = useState("quantum-workspace-01");
  const [framework, setFramework] = useState<FrameworkType>("dwave");

  if (!isOpen) return null;

  const handleCreate = () => {
    const finalName = name.trim() || "my-quantum-project";
    const targetFile = "main.py";
    const initialCode =
      framework === "dwave"
        ? `# Quantum Guru — D-Wave Binary Quadratic Model Starter\nimport dimod\nfrom dwave.samplers import SimulatedAnnealingSampler\n\nbqm = dimod.BinaryQuadraticModel({'x': -1.0, 'y': -1.0}, {('x', 'y'): 2.0}, 0.0, dimod.BINARY)\nsampler = SimulatedAnnealingSampler()\nsampleset = sampler.sample(bqm, num_reads=100)\nprint("Optimal Decisions:", sampleset.first.sample)\n`
        : `# Quantum Guru — Qiskit Starter Circuit\nfrom qiskit import QuantumCircuit\nfrom qiskit_aer import AerSimulator\n\nqc = QuantumCircuit(2, 2)\nqc.h(0)\nqc.cx(0, 1)\nqc.measure([0, 1], [0, 1])\nsim = AerSimulator()\nres = sim.run(qc, shots=1024).result()\nprint("Measurement Counts:", res.get_counts())\n`;

    const newProj: ProjectItem = {
      id: finalName.toLowerCase().replace(/[^a-z0-9]/g, "_"),
      title: finalName,
      desc: `Custom ${framework === "dwave" ? "D-Wave Annealing" : "Qiskit Gate Model"} quantum workspace.`,
      framework,
      updated: "Just now",
      files: [targetFile],
      activeFile: targetFile,
      fileContents: { [targetFile]: initialCode },
    };
    onCreateProject(newProj);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div
        className={`w-full max-w-md flex flex-col rounded-2xl border shadow-2xl overflow-hidden font-sans transition-all duration-200 ${
          isDark
            ? "bg-[#0E0F13] border-white/[0.12] text-zinc-100 shadow-black/80"
            : "bg-white border-slate-200 text-slate-900 shadow-xl"
        }`}
      >
        {/* Modal Top Header */}
        <div
          className={`px-5 py-4 border-b flex items-center justify-between shrink-0 ${
            isDark ? "border-white/[0.08] bg-[#0E0F13]" : "border-slate-200 bg-white"
          }`}
        >
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/15 text-sky-400 flex items-center justify-center shrink-0 border border-sky-500/20">
              <FolderPlus className="w-4 h-4 text-sky-400" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">New Quantum Project</h3>
              <p className={`text-[11px] ${isDark ? "text-zinc-400" : "text-slate-500"}`}>
                Initialize a workspace with your target quantum framework
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isDark
                ? "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05]"
                : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body: Project Name + Framework Cards + Doorway Card */}
        <div className="p-5 space-y-4">
          {/* Field 1: Project Name */}
          <div className="space-y-1.5">
            <label className={`text-xs font-mono font-medium ${isDark ? "text-zinc-300" : "text-slate-700"}`}>
              Project Name
            </label>
            <input
              type="text"
              placeholder="e.g. quantum-optimization-v1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border outline-none text-xs font-mono transition-colors ${
                isDark
                  ? "bg-[#090A0D] border-white/[0.1] text-zinc-100 focus:border-sky-500"
                  : "bg-slate-50 border-slate-200 text-slate-900 focus:border-sky-500"
              }`}
              autoFocus
            />
          </div>

          {/* Field 2: Target Quantum Framework */}
          <div className="space-y-1.5">
            <label className={`text-xs font-mono font-medium ${isDark ? "text-zinc-300" : "text-slate-700"}`}>
              Quantum Architecture
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFramework("dwave")}
                className={`p-3 rounded-xl border text-left flex flex-col space-y-1 transition-all cursor-pointer ${
                  framework === "dwave"
                    ? "border-emerald-500/80 bg-emerald-500/10 text-emerald-400 shadow-xs"
                    : isDark
                    ? "border-white/[0.08] text-zinc-400 hover:border-zinc-700 bg-white/[0.02]"
                    : "border-slate-200 text-slate-600 hover:border-slate-300 bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <Cpu className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="font-semibold text-xs">D-Wave</span>
                  </div>
                  {framework === "dwave" && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                </div>
                <span className="text-[10px] opacity-75 font-sans leading-tight">
                  Annealing • QUBO & Ising Solver
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFramework("qiskit")}
                className={`p-3 rounded-xl border text-left flex flex-col space-y-1 transition-all cursor-pointer ${
                  framework === "qiskit"
                    ? "border-purple-500/80 bg-purple-500/10 text-purple-400 shadow-xs"
                    : isDark
                    ? "border-white/[0.08] text-zinc-400 hover:border-zinc-700 bg-white/[0.02]"
                    : "border-slate-200 text-slate-600 hover:border-slate-300 bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <Layers className="w-3.5 h-3.5 text-purple-400" />
                    <span className="font-semibold text-xs">Qiskit</span>
                  </div>
                  {framework === "qiskit" && <Check className="w-3.5 h-3.5 text-purple-400" />}
                </div>
                <span className="text-[10px] opacity-75 font-sans leading-tight">
                  Gate Model • Circuits & Aer Sim
                </span>
              </button>
            </div>
          </div>

          {/* Doorway Card to Algorithm Studio */}
          {onOpenAlgorithmStudio && (
            <div
              onClick={() => {
                onClose();
                onOpenAlgorithmStudio();
              }}
              className={`p-3 rounded-xl border transition-all cursor-pointer group ${
                isDark
                  ? "bg-gradient-to-r from-purple-950/25 via-indigo-950/20 to-transparent border-purple-500/25 hover:border-purple-500/40 hover:bg-purple-950/35"
                  : "bg-gradient-to-r from-purple-50/70 via-indigo-50/40 to-white border-purple-200 hover:border-purple-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-purple-500/15 text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/25">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center space-x-1.5">
                      <span className="font-semibold text-xs">Algorithm Vault</span>
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-300">
                        26 Verified
                      </span>
                    </div>
                    <p className={`text-[11px] truncate ${isDark ? "text-zinc-400" : "text-slate-500"}`}>
                      Pull verified algorithms directly into your project
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-1 text-xs font-mono text-purple-400 group-hover:text-purple-300 shrink-0 ml-2 font-medium">
                  <span>Browse</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Footer */}
        <div
          className={`px-5 py-3 border-t flex items-center justify-between gap-3 shrink-0 ${
            isDark ? "border-white/[0.08] bg-[#0E0F13]" : "border-slate-200 bg-slate-50"
          }`}
        >
          <span className={`text-[11px] font-mono ${isDark ? "text-zinc-500" : "text-slate-500"}`}>
            Blank {framework === "dwave" ? "D-Wave" : "Qiskit"} workspace
          </span>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                isDark ? "text-zinc-400 hover:text-zinc-200" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={!name.trim()}
              className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white font-mono font-semibold text-xs shadow-sm transition-all cursor-pointer flex items-center space-x-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Project</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
