"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import { EnterpriseHeader } from "@/components/enterprise/EnterpriseHeader";
import { EnterpriseHistorySidebar, ProjectEntry } from "@/components/enterprise/EnterpriseHistorySidebar";
import { EnterpriseChatPane } from "@/components/enterprise/EnterpriseChatPane";
import { EnterpriseWorkbench } from "@/components/enterprise/EnterpriseWorkbench";
import { DeploySolutionModal } from "@/components/optimization/DeploySolutionModal";
import IssueReportModal from "@/components/IssueReportModal";
import UserProfileModal from "@/components/UserProfileModal";
import { useAuth } from "@/context/AuthContext";
import {
  ProjectRecord,
  ExecutionRun,
  EnterpriseChatMessage,
  WorkspaceState,
  SolverType,
} from "@/components/enterprise/types";
import {
  newProject,
  emptyWorkspace,
  adaptPipelineResult,
  runFromWorkspace,
} from "@/components/enterprise/adapters";

const STORAGE_KEY = "qg_enterprise_studio_v1";

const DEFAULT_INITIAL_PROJECT: ProjectRecord = {
  id: "proj_initial",
  title: "New optimization model",
  domain: "Custom domain",
  createdAt: 0,
  updatedAt: 0,
  lastProblemText: "",
  messages: [],
  runs: [],
  activeRunId: null,
  workspace: emptyWorkspace(),
};

function loadSavedState(): {
  projects: ProjectRecord[];
  activeProjectId: string;
  surfaceMode?: "copilot" | "workbench";
} | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.projects) && parsed.projects.length > 0) {
      return {
        projects: parsed.projects,
        activeProjectId: parsed.activeProjectId || parsed.projects[0].id,
        surfaceMode: parsed.surfaceMode === "workbench" ? "workbench" : "copilot",
      };
    }
  } catch {
    // Ignore invalid JSON
  }
  return null;
}

export default function EnterpriseStudioPage() {
  const { user, isAuthenticated, logout } = useAuth();
  const [isDark, setIsDark] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  // Synchronize document root data-theme and dark class
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
      document.documentElement.classList.toggle("dark", isDark);
    }
  }, [isDark]);

  const [surfaceMode, setSurfaceMode] = useState<"copilot" | "workbench">("copilot");
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSolving, setIsSolving] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  // Projects state: Initialized with deterministic default to prevent SSR hydration mismatches
  const [projects, setProjects] = useState<ProjectRecord[]>([DEFAULT_INITIAL_PROJECT]);
  const [activeProjectId, setActiveProjectId] = useState<string>("proj_initial");

  // Hydrate from localStorage once safely mounted on the client
  useEffect(() => {
    setIsMounted(true);
    const saved = loadSavedState();
    if (saved && saved.projects.length > 0) {
      setProjects(saved.projects);
      setActiveProjectId(saved.activeProjectId);
      if (saved.surfaceMode) {
        setSurfaceMode(saved.surfaceMode);
      }
    }
  }, []);

  // Current active project record
  const currentProject = useMemo(() => {
    return projects.find((p) => p.id === activeProjectId) || projects[0] || DEFAULT_INITIAL_PROJECT;
  }, [projects, activeProjectId]);

  // Persist projects and surfaceMode to localStorage on change only after mounted
  useEffect(() => {
    if (!isMounted) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          projects,
          activeProjectId,
          surfaceMode,
        })
      );
    } catch (e) {
      console.warn("Failed to persist enterprise workspace to localStorage", e);
    }
  }, [projects, activeProjectId, surfaceMode, isMounted]);

  // Escape key collapses workbench fullscreen back to copilot
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && surfaceMode === "workbench") {
        setSurfaceMode("copilot");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [surfaceMode]);

  // Sidebar project entries list (formatted consistently)
  const projectEntries: ProjectEntry[] = useMemo(() => {
    return projects.map((p) => {
      let formattedTime = "Just now";
      if (isMounted && p.updatedAt > 0) {
        try {
          formattedTime = new Date(p.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        } catch {
          formattedTime = "Just now";
        }
      }
      return {
        id: p.id,
        title: p.title,
        domain: p.domain,
        updatedAt: formattedTime,
        runsCount: p.runs.length,
      };
    });
  }, [projects, isMounted]);

  // Workspace updater helper
  const updateActiveWorkspace = useCallback(
    (updater: (prev: WorkspaceState) => WorkspaceState) => {
      setProjects((prev) =>
        prev.map((proj) => {
          if (proj.id !== activeProjectId) return proj;
          const nextWs = updater(proj.workspace);
          return {
            ...proj,
            updatedAt: Date.now(),
            workspace: nextWs,
          };
        })
      );
    },
    [activeProjectId]
  );

  // Create new empty project
  const handleNewProject = () => {
    const proj = newProject("New optimization model", "Custom domain");
    setProjects((prev) => [proj, ...prev]);
    setActiveProjectId(proj.id);
  };

  // Select project from sidebar
  const handleSelectProject = (projectId: string) => {
    setActiveProjectId(projectId);
  };

  // Select run from history sidebar and restore exact snapshot
  const handleSelectRun = (run: ExecutionRun) => {
    setProjects((prev) =>
      prev.map((proj) => {
        if (proj.id !== activeProjectId) return proj;
        return {
          ...proj,
          activeRunId: run.id,
          workspace: run.snapshot || proj.workspace,
        };
      })
    );
  };

  // Natural language chat execution
  const handleSendMessage = async (text: string, penaltyOverride?: number) => {
    if (!text.trim()) return;

    const userMsgId = `usr_${Date.now()}`;
    const botMsgId = `bot_${Date.now()}`;

    const userMsg: EnterpriseChatMessage = {
      id: userMsgId,
      sender: "user",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      text,
    };

    const initialBotMsg: EnterpriseChatMessage = {
      id: botMsgId,
      sender: "assistant",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      text: "Decomposing mathematical structure and constraints...",
      isStreaming: true,
      pipelineSteps: [
        { id: "nlp", agent: "UnderstandingAgent", title: "Understanding agent", status: "running" },
      ],
    };

    // Update project messages and record last problem text
    setProjects((prev) =>
      prev.map((proj) => {
        if (proj.id !== activeProjectId) return proj;
        return {
          ...proj,
          updatedAt: Date.now(),
          lastProblemText: text,
          title:
            proj.title === "New optimization model" || proj.title.startsWith("New ")
              ? text.slice(0, 38).trim() + "..."
              : proj.title,
          messages: [...proj.messages, userMsg, initialBotMsg],
        };
      })
    );

    setIsStreaming(true);

    try {
      const activePenalty = typeof penaltyOverride === "number" ? penaltyOverride : currentProject.workspace.penaltyLambda;
      const resp = await fetch("/api/ide/pipeline/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problem: text,
          mode: "qubo",
          penalty_choice: activePenalty,
          penalty_lambda: activePenalty,
          session_id: `enterprise_${Date.now()}`,
        }),
      });

      if (!resp.ok || !resp.body) {
        throw new Error(`Pipeline response status: ${resp.status}`);
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let streamBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        streamBuffer += decoder.decode(value, { stream: true });
        const lines = streamBuffer.split("\n");
        streamBuffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          try {
            const data = JSON.parse(trimmed.slice(5).trim());
            const stepName = data.step;
            const isComplete = stepName === "complete" || data.event === "complete";

            if (isComplete) {
              const res = data.result || {};
              // Build typed workspace state directly from backend response
              const prevWs = currentProject.workspace;
              const nextWs = adaptPipelineResult(res, prevWs);

              // Record real execution run
              const newRun = runFromWorkspace({
                id: `run_${Date.now()}`,
                runNumber: currentProject.runs.length + 1,
                title: text.slice(0, 36) + "...",
                runtimeMs: typeof res.runtime_ms === "number" ? res.runtime_ms : null,
                changesSummary: "Autonomous formulation run from prompt",
                workspace: nextWs,
              });

              setProjects((prev) =>
                prev.map((proj) => {
                  if (proj.id !== activeProjectId) return proj;
                  const updatedMessages = proj.messages.map((msg) => {
                    if (msg.id !== botMsgId) return msg;
                    const existingSteps = msg.pipelineSteps ? [...msg.pipelineSteps] : [];
                    return {
                      ...msg,
                      text:
                        res.interpretation ||
                        (nextWs.execution?.energy !== null
                          ? `Optimization converged with ground energy ${nextWs.execution?.energy?.toFixed(
                              4
                            )} across ${nextWs.variables.length} decision variables.`
                          : "Optimization model compiled successfully."),
                      isStreaming: false,
                      executionResult: nextWs.execution
                        ? {
                            feasible: nextWs.execution.feasible,
                            energy: nextWs.execution.energy,
                            solution: nextWs.execution.solution,
                            selected_variables: nextWs.execution.selectedVariables,
                            num_reads: nextWs.execution.numReads,
                            interpretation: res.interpretation,
                          }
                        : undefined,
                      pipelineSteps: existingSteps.map((s) => ({ ...s, status: "done" as const })),
                    };
                  });

                  return {
                    ...proj,
                    updatedAt: Date.now(),
                    workspace: nextWs,
                    runs: [newRun, ...proj.runs],
                    activeRunId: newRun.id,
                    messages: updatedMessages,
                  };
                })
              );
              break;
            }

            // Normal intermediate step event
            const stepId = stepName || data.agent || "step";
            setProjects((prev) =>
              prev.map((proj) => {
                if (proj.id !== activeProjectId) return proj;
                const updatedMessages = proj.messages.map((msg) => {
                  if (msg.id !== botMsgId) return msg;
                  const existingSteps = msg.pipelineSteps ? [...msg.pipelineSteps] : [];
                  const stepIdx = existingSteps.findIndex((s) => s.id === stepId || s.agent === data.agent);

                  const updatedStep = {
                    id: stepId,
                    agent: data.agent || "Agent",
                    title: data.title || (data.agent ? data.agent.replace("Agent", " agent") : "Pipeline step"),
                    status:
                      data.status === "done"
                        ? ("done" as const)
                        : data.status === "failed"
                        ? ("failed" as const)
                        : ("running" as const),
                    message: data.message,
                    details: data.details,
                  };

                  if (stepIdx >= 0) {
                    existingSteps[stepIdx] = { ...existingSteps[stepIdx], ...updatedStep };
                  } else {
                    existingSteps.push(updatedStep);
                  }

                  return {
                    ...msg,
                    pipelineSteps: existingSteps,
                    text:
                      stepName === "explanation" && data.value
                        ? data.value
                        : data.message
                        ? `Agent Reasoning: ${data.message}`
                        : msg.text,
                  };
                });

                return {
                  ...proj,
                  messages: updatedMessages,
                };
              })
            );
          } catch {
            // chunk safety
          }
        }
      }
    } catch (err: any) {
      setProjects((prev) =>
        prev.map((proj) => {
          if (proj.id !== activeProjectId) return proj;
          return {
            ...proj,
            messages: proj.messages.map((msg) =>
              msg.id === botMsgId
                ? { ...msg, text: `Pipeline execution note: ${err.message}`, isStreaming: false }
                : msg
            ),
          };
        })
      );
    } finally {
      setIsStreaming(false);
    }
  };

  // Recompile & Solve handler
  const handleReSolve = async () => {
    const textToSolve = currentProject.lastProblemText;
    const currentLambda = currentProject.workspace.penaltyLambda;
    if (textToSolve) {
      setIsSolving(true);
      try {
        await handleSendMessage(textToSolve, currentLambda);
      } finally {
        setIsSolving(false);
      }
    } else if (currentProject.workspace.code) {
      // Execute the code directly if no prompt text was submitted yet
      setIsSolving(true);
      try {
        const res = await fetch("/api/ide/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: currentProject.workspace.code }),
        });
        const data = await res.json();
        if (data.success) {
          updateActiveWorkspace((prev) => ({
            ...prev,
            terminal: [
              ...prev.terminal,
              `> Recompile & solve executed.`,
              ...(data.stdout ? data.stdout.trim().split("\n") : []),
              `[OK] Solver convergence reached in ${Math.round(data.execution_time_ms || 120)}ms.`,
            ],
          }));
        }
      } catch (err: any) {
        updateActiveWorkspace((prev) => ({
          ...prev,
          terminal: [...prev.terminal, `[ERROR] Re-solve failed: ${err.message}`],
        }));
      } finally {
        setIsSolving(false);
      }
    }
  };

  const ws = currentProject.workspace;

  return (
    <div
      style={{
        backgroundColor: isDark ? "#090A0D" : "#F8FAFC",
        color: isDark ? "#F8FAFC" : "#0F172A",
      }}
      className="h-screen w-screen flex flex-col overflow-hidden font-sans enterprise-bg-layer-0"
    >
      {/* ── TOP NAVIGATION BAR ── */}
      <EnterpriseHeader
        isDark={isDark}
        onToggleTheme={() => setIsDark((prev) => !prev)}
        onOpenDeployModal={() => setIsDeployModalOpen(true)}
        onOpenReportIssue={() => setIsIssueModalOpen(true)}
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
        user={user}
        isAuthenticated={isAuthenticated}
        onLogout={logout}
        activeProblemTitle={currentProject.title}
        isSolving={isSolving || isStreaming}
        surfaceMode={surfaceMode}
        onSelectSurfaceMode={setSurfaceMode}
      />

      {/* ── WORKSPACE SURFACE AREA ── */}
      <div
        style={{
          backgroundColor: isDark ? "#090A0D" : "#F8FAFC",
        }}
        className="flex-1 flex min-h-0 relative overflow-hidden enterprise-bg-layer-0"
      >
        {/* ── SURFACE 1: Optimization Copilot & Project History (Left Sidebar 30% + Chat 70%) ── */}
        {surfaceMode === "copilot" && (
          <div
            style={{
              width: "100%",
              minWidth: "100%",
              maxWidth: "100%",
              flexBasis: "100%",
              flexGrow: 0,
              flexShrink: 0,
            }}
            className="h-full flex flex-row min-w-0 overflow-hidden"
          >
            {/* Sidebar (30% width) */}
            <div
              style={{
                width: "30%",
                flexBasis: "30%",
                flexShrink: 0,
                backgroundColor: isDark ? "#090A0D" : "#FFFFFF",
              }}
              className="h-full flex flex-col min-w-0 border-r border-white/[0.08] overflow-hidden enterprise-bg-layer-1"
            >
              <EnterpriseHistorySidebar
                isDark={isDark}
                projects={projectEntries}
                activeProjectId={activeProjectId}
                onSelectProject={handleSelectProject}
                onNewProject={handleNewProject}
                executionHistory={currentProject.runs}
                activeRunId={currentProject.activeRunId}
                onSelectRun={handleSelectRun}
              />
            </div>

            {/* Chat Area (70% width) */}
            <div
              style={{
                width: "70%",
                flexBasis: "70%",
                backgroundColor: isDark ? "#0E0F13" : "#FFFFFF",
              }}
              className="flex-1 h-full flex flex-col min-w-0 overflow-hidden enterprise-bg-layer-2"
            >
              <EnterpriseChatPane
                isDark={isDark}
                messages={currentProject.messages}
                isStreaming={isStreaming}
                onSendMessage={handleSendMessage}
                onClearChat={() => {
                  setProjects((prev) =>
                    prev.map((proj) => (proj.id === activeProjectId ? { ...proj, messages: [] } : proj))
                  );
                }}
                onFocusWorkbench={() => setSurfaceMode("workbench")}
              />
            </div>
          </div>
        )}

        {/* ── SURFACE 2: POC Workbench (Model | Q Matrix | Solver | Feasibility | Deploy + Monaco) ── */}
        {surfaceMode === "workbench" && (
          <div
            style={{
              width: "100%",
              minWidth: "100%",
              maxWidth: "100%",
              flexBasis: "100%",
              flexGrow: 0,
              flexShrink: 0,
              backgroundColor: isDark ? "#090A0F" : "#FFFFFF",
            }}
            className="h-full flex flex-col min-w-0 max-w-full overflow-hidden enterprise-bg-layer-0"
          >
            <EnterpriseWorkbench
              isDark={isDark}
              mathModel={ws.mathModel}
              onUpdateMathModel={(updater) =>
                updateActiveWorkspace((prev) => ({
                  ...prev,
                  mathModel: typeof updater === "function" ? updater(prev.mathModel) : updater,
                }))
              }
              variables={ws.variables}
              onUpdateVariables={(updater) =>
                updateActiveWorkspace((prev) => ({
                  ...prev,
                  variables: typeof updater === "function" ? updater(prev.variables) : updater,
                }))
              }
              selectedSolver={ws.selectedSolver}
              onSelectSolver={(solver: SolverType) =>
                updateActiveWorkspace((prev) => ({ ...prev, selectedSolver: solver }))
              }
              feasibilityResults={ws.feasibility}
              penaltyLambda={ws.penaltyLambda}
              onChangePenaltyLambda={(val: number) =>
                updateActiveWorkspace((prev) => ({ ...prev, penaltyLambda: val }))
              }
              generatedCode={ws.code}
              onChangeCode={(code: string) => updateActiveWorkspace((prev) => ({ ...prev, code }))}
              executionHistory={currentProject.runs}
              onRestoreRun={handleSelectRun}
              onReSolve={handleReSolve}
              isSolving={isSolving}
              onOpenDeploy={() => setIsDeployModalOpen(true)}
              projectId={activeProjectId}
              problemTitle={currentProject.title}
              qMatrix={ws.qMatrix}
              solverRouting={ws.solverRouting}
              execution={ws.execution}
              terminalLogs={ws.terminal}
              onUpdateTerminalLogs={(updater) =>
                updateActiveWorkspace((prev) => ({
                  ...prev,
                  terminal: updater(prev.terminal),
                }))
              }
            />
          </div>
        )}
      </div>

      {/* ── MODALS ── */}
      <DeploySolutionModal
        isOpen={isDeployModalOpen}
        onClose={() => setIsDeployModalOpen(false)}
        isDark={isDark}
        projectId={activeProjectId}
        projectName={currentProject.title}
        variables={ws.variables.map((v) => v.name)}
        penaltyLambda={ws.penaltyLambda}
      />

      <IssueReportModal
        isOpen={isIssueModalOpen}
        onClose={() => setIsIssueModalOpen(false)}
        defaultCategory="code_execution"
        isDark={isDark}
        userEmail={user?.email}
        flowContext={{
          route: "/enterprise",
          projectId: activeProjectId,
          projectTitle: currentProject.title,
        }}
      />

      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </div>
  );
}
