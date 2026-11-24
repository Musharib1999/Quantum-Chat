"use client";

import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { EnterpriseHeader, HeaderActivityStatus } from "@/components/enterprise/EnterpriseHeader";
import { EnterpriseHistorySidebar, ProjectEntry } from "@/components/enterprise/EnterpriseHistorySidebar";
import { EnterpriseChatPane } from "@/components/enterprise/EnterpriseChatPane";
import { EnterpriseWorkbench } from "@/components/enterprise/EnterpriseWorkbench";
import { EnterpriseProblemLibrary } from "@/components/enterprise/EnterpriseProblemLibrary";
import { EnterpriseNewProjectModal } from "@/components/enterprise/EnterpriseNewProjectModal";
import type { LibraryDetail } from "@/lib/problemLibrary";
import { DeploySolutionModal } from "@/components/optimization/DeploySolutionModal";
import IssueReportModal from "@/components/IssueReportModal";
import UserProfileModal from "@/components/UserProfileModal";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { isDemoRole } from "@/lib/roles";
import {
  ProjectRecord,
  ExecutionRun,
  EnterpriseChatMessage,
  WorkspaceState,
  SolverType,
  SolverComparisonSide,
  SurfaceMode,
} from "@/components/enterprise/types";
import {
  DEFAULT_PENALTY_LAMBDA,
  newProject,
  emptyWorkspace,
  adaptPipelineResult,
  runFromWorkspace,
  buildFallbackOrtoolsCode,
  computeSolverComparison,
  sanitizeLegacyQuboScript,
  sanitizeLegacyOrtoolsScript,
} from "@/components/enterprise/adapters";

const STORAGE_KEY = "qg_enterprise_studio_v1";

/**
 * Keep persisted project payloads compact (avoids multi-MB synchronous JSON.stringify freezes
 * and huge MongoDB uploads caused by duplicating full qMatrix + code inside every historical run).
 */
function compactProjectForStorage(proj: ProjectRecord): ProjectRecord {
  const trimmedRuns = (proj.runs || []).slice(0, 5).map((r, idx) => {
    if (idx === 0 || !r.snapshot) return r;
    return {
      ...r,
      snapshot: {
        ...r.snapshot,
        qMatrix: r.snapshot.qMatrix
          ? { ...r.snapshot.qMatrix, entries: r.snapshot.qMatrix.entries.slice(0, 200), truncated: true }
          : null,
        code: "",
        ortoolsCode: "",
      },
    };
  });
  return {
    ...proj,
    runs: trimmedRuns,
  };
}

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
  surfaceMode?: SurfaceMode;
} | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.projects) && parsed.projects.length > 0) {
      // Auto-clean any interrupted streaming state left over from a page reload or closed tab
      const cleanedProjects: ProjectRecord[] = parsed.projects.map((p: ProjectRecord) => ({
        ...p,
        messages: Array.isArray(p.messages)
          ? p.messages.map((m) =>
              m.isStreaming
                ? {
                    ...m,
                    isStreaming: false,
                    text: m.text && !m.text.startsWith("Decomposing")
                      ? m.text
                      : "Execution was interrupted by page reload.",
                    pipelineSteps: m.pipelineSteps?.map((s) =>
                      s.status === "running"
                        ? { ...s, status: "failed" as const, message: "Interrupted" }
                        : s
                    ),
                  }
                : m
            )
          : [],
      }));
      return {
        projects: cleanedProjects,
        activeProjectId: parsed.activeProjectId || cleanedProjects[0].id,
        surfaceMode:
          parsed.surfaceMode === "workbench"
            ? "workbench"
            : parsed.surfaceMode === "library"
            ? "library"
            : "copilot",
      };
    }
  } catch {
    // Ignore invalid JSON
  }
  return null;
}

export default function EnterpriseStudioPage() {
  const { user, isAuthenticated, isInitializing, logout } = useAuth();
  const { showToast } = useToast();
  const isDemoUser = isDemoRole(user?.role);
  const [isDark, setIsDark] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [hasLoadedFromDb, setHasLoadedFromDb] = useState(false);
  const dbSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Strict client-side auth gate: redirect unauthenticated visitors straight to /login?redirect=/enterprise
  useEffect(() => {
    if (!isInitializing && !isAuthenticated && typeof window !== "undefined") {
      window.location.replace("/login?redirect=/enterprise");
    }
  }, [isInitializing, isAuthenticated]);

  // Synchronize document root data-theme and dark class
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
      document.documentElement.classList.toggle("dark", isDark);
    }
  }, [isDark]);

  const [surfaceMode, setSurfaceMode] = useState<SurfaceMode>("copilot");
  const [mountedSurfaces, setMountedSurfaces] = useState<{ workbench: boolean; library: boolean }>({
    workbench: false,
    library: false,
  });
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [pendingVaultProblem, setPendingVaultProblem] = useState<LibraryDetail | null>(null);
  const [draftProjectName, setDraftProjectName] = useState("");
  const [isSolving, setIsSolving] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isExecutingScript, setIsExecutingScript] = useState(false);
  const [activeSolverMode, setActiveSolverMode] = useState<"dwave" | "ortools" | "parallel" | null>(null);
  const [terminalRunSeq, setTerminalRunSeq] = useState(0);
  const pipelineAbortRef = useRef<AbortController | null>(null);
  const scriptAbortRef = useRef<AbortController | null>(null);
  const scriptInFlightRef = useRef<boolean>(false);
  const compileInFlightRef = useRef<boolean>(false);
  const localSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSyncedUpdatedAtRef = useRef<Record<string, number>>({});
  const timedOutRef = useRef<boolean>(false);

  // Lazy-mount Workbench and Library on first visit, then keep alive with CSS so switching is 0ms instant
  useEffect(() => {
    if (surfaceMode === "workbench" && !mountedSurfaces.workbench) {
      setMountedSurfaces((prev) => ({ ...prev, workbench: true }));
    } else if (surfaceMode === "library" && !mountedSurfaces.library) {
      setMountedSurfaces((prev) => ({ ...prev, library: true }));
    }
  }, [surfaceMode, mountedSurfaces.workbench, mountedSurfaces.library]);

  // Projects state: Initialized with deterministic default to prevent SSR hydration mismatches
  const [projects, setProjects] = useState<ProjectRecord[]>([DEFAULT_INITIAL_PROJECT]);
  const [activeProjectId, setActiveProjectId] = useState<string>("proj_initial");

  // Terminate active pipeline / solver execution on user request
  const handleStopExecution = useCallback((reason: string = "Execution terminated by user.") => {
    if (pipelineAbortRef.current) {
      pipelineAbortRef.current.abort();
      pipelineAbortRef.current = null;
    }
    if (scriptAbortRef.current) {
      scriptAbortRef.current.abort();
      scriptAbortRef.current = null;
    }
    scriptInFlightRef.current = false;
    compileInFlightRef.current = false;
    setIsStreaming(false);
    setIsSolving(false);
    setIsExecutingScript(false);
    setProjects((prev) =>
      prev.map((proj) => {
        if (proj.id !== activeProjectId) return proj;
        const hasStreamingMsg = proj.messages.some((m) => m.isStreaming);
        return {
          ...proj,
          updatedAt: Date.now(),
          workspace: {
            ...proj.workspace,
            terminal: [...proj.workspace.terminal, `[STOPPED] ${reason}`],
          },
          messages: hasStreamingMsg
            ? proj.messages.map((msg) =>
                msg.isStreaming
                  ? {
                      ...msg,
                      text: reason,
                      isStreaming: false,
                      pipelineSteps: msg.pipelineSteps?.map((s) =>
                        s.status === "running"
                          ? { ...s, status: "failed" as const, message: reason }
                          : s
                      ),
                    }
                  : msg
              )
            : proj.messages,
        };
      })
    );
  }, [activeProjectId]);

  // Warm UI immediately from localStorage cache on mount so returning users never flash a blank placeholder while MongoDB responds
  useEffect(() => {
    setIsMounted(true);
    const saved = loadSavedState();
    if (saved && saved.projects.length > 0) {
      const meaningful = saved.projects.some(
        (p) => p.id !== "proj_initial" || p.messages.length > 0 || Boolean(p.workspace?.code)
      );
      if (meaningful) {
        setProjects(saved.projects);
        setActiveProjectId(saved.activeProjectId);
        if (saved.surfaceMode) {
          setSurfaceMode(saved.surfaceMode);
        }
      }
    }
  }, []);

  useEffect(() => {
    if (!isMounted || isInitializing || !isAuthenticated || !user?.email) return;
    let cancelled = false;

    const hydrateProjects = async () => {
      try {
        const res = await fetch("/api/enterprise/projects", { cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;

        if (res.ok && data.success && Array.isArray(data.projects) && data.projects.length > 0) {
          const cleaned: ProjectRecord[] = data.projects.map((p: ProjectRecord) => ({
            ...p,
            messages: Array.isArray(p.messages)
              ? p.messages.map((m) =>
                  m.isStreaming
                    ? {
                        ...m,
                        isStreaming: false,
                        text:
                          m.text && !m.text.startsWith("Decomposing")
                            ? m.text
                            : "Execution was interrupted by page reload.",
                        pipelineSteps: m.pipelineSteps?.map((s) =>
                          s.status === "running"
                            ? { ...s, status: "failed" as const, message: "Interrupted" }
                            : s
                        ),
                      }
                    : m
                )
              : [],
          }));
          setProjects(cleaned);
          for (const p of cleaned) {
            lastSyncedUpdatedAtRef.current[p.id] = p.updatedAt;
          }
          setActiveProjectId(cleaned[0].id);
          setHasLoadedFromDb(true);
          return;
        }
      } catch (err) {
        console.warn("[Enterprise] Failed to hydrate projects from MongoDB:", err);
      }

      if (cancelled) return;

      // For non-demo accounts with no MongoDB projects yet, migrate any existing localStorage projects
      if (!isDemoUser) {
        const saved = loadSavedState();
        if (saved && saved.projects.length > 0) {
          setProjects(saved.projects);
          setActiveProjectId(saved.activeProjectId);
          if (saved.surfaceMode) {
            setSurfaceMode(saved.surfaceMode);
          }
          // Backfill migrated local projects into MongoDB
          const meaningful = saved.projects.filter(
            (p) => p.id !== "proj_initial" || p.messages.length > 0 || Boolean(p.workspace?.code)
          );
          if (meaningful.length > 0) {
            fetch("/api/enterprise/projects", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ projects: meaningful }),
            }).catch(() => {});
          }
        }
      }
      setHasLoadedFromDb(true);
    };

    hydrateProjects();
    return () => {
      cancelled = true;
    };
  }, [isMounted, isInitializing, isAuthenticated, user?.email, isDemoUser]);

  // Current active project record
  const currentProject = useMemo(() => {
    return projects.find((p) => p.id === activeProjectId) || projects[0] || DEFAULT_INITIAL_PROJECT;
  }, [projects, activeProjectId]);

  // Debounced localStorage cache + single-project incremental MongoDB sync (never blocks typing or tab switches)
  useEffect(() => {
    if (!isMounted || !hasLoadedFromDb || isDemoUser || isStreaming) return;

    if (localSaveTimerRef.current) {
      clearTimeout(localSaveTimerRef.current);
    }
    localSaveTimerRef.current = setTimeout(() => {
      try {
        const compacted = projects.map(compactProjectForStorage);
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            projects: compacted,
            activeProjectId,
            surfaceMode,
          })
        );
      } catch (e) {
        console.warn("Failed to persist enterprise workspace to localStorage", e);
      }
    }, 1500);

    // Only sync projects whose `updatedAt` actually advanced since the last MongoDB write
    const dirtyProjects = projects.filter((p) => {
      const meaningful = p.id !== "proj_initial" || p.messages.length > 0 || Boolean(p.workspace?.code);
      if (!meaningful) return false;
      const lastSynced = lastSyncedUpdatedAtRef.current[p.id] ?? 0;
      return p.updatedAt > lastSynced;
    });

    if (dirtyProjects.length > 0) {
      if (dbSyncTimerRef.current) {
        clearTimeout(dbSyncTimerRef.current);
      }
      dbSyncTimerRef.current = setTimeout(() => {
        const payload = dirtyProjects.map(compactProjectForStorage);
        for (const p of payload) {
          lastSyncedUpdatedAtRef.current[p.id] = p.updatedAt;
        }
        fetch("/api/enterprise/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projects: payload }),
        }).catch((err) => {
          console.warn("[Enterprise] Failed to sync projects to MongoDB:", err);
        });
      }, 1500);
    }

    return () => {
      if (localSaveTimerRef.current) clearTimeout(localSaveTimerRef.current);
      if (dbSyncTimerRef.current) clearTimeout(dbSyncTimerRef.current);
    };
  }, [projects, activeProjectId, surfaceMode, isMounted, hasLoadedFromDb, isDemoUser, isStreaming]);

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

  // Open unified New Project modal (choose Blank Project or browse Problem Vault)
  const handleNewProject = () => {
    if (isDemoUser) {
      showToast("Demo mode is view-only. Creating new projects is disabled.", "info");
      return;
    }
    setPendingVaultProblem(null);
    setDraftProjectName("");
    setIsNewProjectModalOpen(true);
  };

  // Confirm creating a Blank Project with user-chosen name
  const handleCreateBlankProject = (projectName: string) => {
    const cleanName = projectName.trim() || "New optimization model";
    const proj = newProject(cleanName, "Custom domain");
    setProjects((prev) => [proj, ...prev]);
    setActiveProjectId(proj.id);
    setIsNewProjectModalOpen(false);
    setPendingVaultProblem(null);
    setDraftProjectName("");
    setSurfaceMode("copilot");
  };

  // Navigate from New Project modal -> Problem Vault (Library) to review & pick a problem
  const handleOpenProblemVaultFromModal = (draftName: string) => {
    setDraftProjectName(draftName);
    setIsNewProjectModalOpen(false);
    setPendingVaultProblem(null);
    setSurfaceMode("library");
  };

  // Step 1 of instantiating from Library: prompt user for project name
  const handleRequestInstantiateLibraryProblem = (problem: LibraryDetail) => {
    if (isDemoUser) {
      showToast("Demo mode is view-only. Instantiating library problems is disabled.", "info");
      return;
    }
    setPendingVaultProblem(problem);
    setIsNewProjectModalOpen(true);
  };

  // Step 2 of instantiating from Library: create named project & open in Copilot
  const handleConfirmInstantiateLibraryProblem = (problem: LibraryDetail, projectName: string) => {
    if (isDemoUser) {
      showToast("Demo mode is view-only. Opening library problems is disabled.", "info");
      return;
    }
    const cleanName = projectName.trim() || problem.title;
    const proj = newProject(cleanName, problem.industry);
    const ts = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    proj.lastProblemText = problem.prompt;
    if (typeof problem.benchmark?.qubo?.bestLambda === "number" && problem.benchmark.qubo.bestLambda > 0) {
      proj.workspace.penaltyLambda = problem.benchmark.qubo.bestLambda;
    }
    proj.libraryRef = {
      slug: problem.slug,
      version: problem.version,
      title: problem.title,
      objectiveSense: problem.objectiveSense,
      bestKnown: problem.bestKnown,
    };
    proj.messages = [
      {
        id: `usr_${Date.now()}`,
        sender: "user",
        timestamp: ts,
        text: problem.prompt,
      },
      {
        id: `bot_${Date.now()}`,
        sender: "assistant",
        timestamp: ts,
        text: `Instantiated "${cleanName}" from Problem Vault template "${problem.title}" (best known value: ${problem.bestKnown.value}). Select Solve > Compile to formulate it, then Run Parallel to compare D-Wave QUBO with Google OR-Tools.`,
      },
    ];
    setProjects((prev) => [proj, ...prev]);
    setActiveProjectId(proj.id);
    setIsNewProjectModalOpen(false);
    setPendingVaultProblem(null);
    setDraftProjectName("");
    setSurfaceMode("copilot");
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
    if (isDemoUser) {
      showToast("Demo mode is view-only. AI optimization pipeline is disabled in preview accounts.", "info");
      return;
    }

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

    // Abort any existing in-flight pipeline stream before starting a new one
    if (pipelineAbortRef.current) {
      pipelineAbortRef.current.abort();
    }
    const controller = new AbortController();
    pipelineAbortRef.current = controller;
    timedOutRef.current = false;

    // 75-second inactivity watchdog timer (reset on every received SSE chunk)
    let watchdogTimer: ReturnType<typeof setTimeout> | null = setTimeout(() => {
      timedOutRef.current = true;
      controller.abort();
    }, 75000);
    const resetWatchdog = () => {
      if (watchdogTimer) clearTimeout(watchdogTimer);
      watchdogTimer = setTimeout(() => {
        timedOutRef.current = true;
        controller.abort();
      }, 75000);
    };

    setIsStreaming(true);

    try {
      const hasExplicitPenalty = typeof penaltyOverride === "number" && Number.isFinite(penaltyOverride) && penaltyOverride > 0;
      const resp = await fetch("/api/ide/pipeline/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          problem: text,
          mode: "qubo",
          penalty_choice: hasExplicitPenalty ? penaltyOverride : 3,
          penalty_lambda: hasExplicitPenalty ? penaltyOverride : null,
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
        resetWatchdog();
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
                        nextWs.execution?.solverComparison?.summary ||
                        (nextWs.execution?.energy !== null && nextWs.execution?.energy !== undefined
                          ? `Optimization converged with ground energy ${nextWs.execution.energy.toFixed(
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
                            solver_comparison: nextWs.execution.solverComparison ?? null,
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
      const isAbort = err?.name === "AbortError" || controller.signal.aborted;
      const stopNote = timedOutRef.current
        ? "Execution timed out (no response from solver for 75s). Please try again or simplify constraints."
        : isAbort
        ? "Execution terminated by user."
        : `Pipeline execution note: ${err.message}`;
      setProjects((prev) =>
        prev.map((proj) => {
          if (proj.id !== activeProjectId) return proj;
          return {
            ...proj,
            messages: proj.messages.map((msg) =>
              msg.id === botMsgId
                ? {
                    ...msg,
                    text: stopNote,
                    isStreaming: false,
                    pipelineSteps: msg.pipelineSteps?.map((s) =>
                      s.status === "running"
                        ? { ...s, status: "failed" as const, message: stopNote }
                        : s
                    ),
                  }
                : msg
            ),
          };
        })
      );
    } finally {
      if (watchdogTimer) clearTimeout(watchdogTimer);
      if (pipelineAbortRef.current === controller) {
        pipelineAbortRef.current = null;
      }
      setIsStreaming(false);
    }
  };

  // Recompile & Solve handler (guarded with synchronous ref lock to prevent double-submit)
  const handleReSolve = async () => {
    if (isDemoUser) {
      showToast("Demo mode is view-only. Recompiling and solving are disabled in preview accounts.", "info");
      return;
    }
    if (compileInFlightRef.current || scriptInFlightRef.current) return;
    compileInFlightRef.current = true;
    try {
      const textToSolve = currentProject.lastProblemText;
      const currentLambda = currentProject.workspace.penaltyLambda;
      const useAutoPenalty = !currentProject.workspace.code && currentLambda === DEFAULT_PENALTY_LAMBDA;
      if (textToSolve) {
        setIsSolving(true);
        try {
          await handleSendMessage(textToSolve, useAutoPenalty ? undefined : currentLambda);
        } finally {
          setIsSolving(false);
        }
      } else if (currentProject.workspace.code) {
        if (pipelineAbortRef.current) {
          pipelineAbortRef.current.abort();
        }
        const controller = new AbortController();
        pipelineAbortRef.current = controller;
        setIsSolving(true);
        try {
          const res = await fetch("/api/ide/execute", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({ code: sanitizeLegacyQuboScript(currentProject.workspace.code) }),
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
          const isAbort = err?.name === "AbortError" || controller.signal.aborted;
          updateActiveWorkspace((prev) => ({
            ...prev,
            terminal: [
              ...prev.terminal,
              isAbort ? `[STOPPED] Re-solve terminated by user.` : `[ERROR] Re-solve failed: ${err.message}`,
            ],
          }));
        } finally {
          if (pipelineAbortRef.current === controller) {
            pipelineAbortRef.current = null;
          }
          setIsSolving(false);
        }
      }
    } finally {
      compileInFlightRef.current = false;
    }
  };

  const ws = currentProject.workspace;

  const resolvedOrtoolsCode = useMemo(() => {
    const existing =
      ws.ortoolsCode ||
      ws.execution?.ortoolsCode ||
      ws.execution?.solverComparison?.classical?.code ||
      "";
    if (existing.trim()) return existing;
    return buildFallbackOrtoolsCode(ws.variables, ws.mathModel);
  }, [ws.ortoolsCode, ws.execution, ws.variables, ws.mathModel]);

  // Unified solver execution triggered from the top navbar Solve menu (synchronous ref lock prevents duplicate runs)
  const handleExecuteSolver = async (mode: "dwave" | "ortools" | "parallel") => {
    if (isDemoUser) {
      showToast("Demo mode is view-only. Simulators and solvers are disabled in preview accounts.", "info");
      return;
    }
    if (scriptInFlightRef.current || compileInFlightRef.current) return;

    const quboToRun =
      mode === "dwave" || mode === "parallel" ? sanitizeLegacyQuboScript(ws.code?.trim() || "") : "";
    const ortoolsToRun =
      mode === "ortools" || mode === "parallel"
        ? sanitizeLegacyOrtoolsScript(resolvedOrtoolsCode?.trim() || "")
        : "";
    if (!quboToRun && !ortoolsToRun) return;

    scriptInFlightRef.current = true;
    if (surfaceMode !== "workbench") {
      setSurfaceMode("workbench");
    }

    if (scriptAbortRef.current) {
      scriptAbortRef.current.abort();
    }
    const controller = new AbortController();
    scriptAbortRef.current = controller;
    setActiveSolverMode(mode);
    setIsExecutingScript(true);
    setTerminalRunSeq((s) => s + 1);

    const modeLabel =
      mode === "dwave"
        ? `D-Wave QUBO (solution.py, λ = ${ws.penaltyLambda})`
        : mode === "ortools"
        ? `Google OR-Tools CP-SAT (ortools_baseline.py)`
        : `Parallel Benchmark: D-Wave QUBO (λ = ${ws.penaltyLambda}) + Google OR-Tools CP-SAT`;

    updateActiveWorkspace((prev) => ({
      ...prev,
      terminal: [
        ...prev.terminal,
        `> Running ${modeLabel}...`,
        `[INFO] Dispatching to sandbox execution engine...`,
      ],
    }));

    const start = performance.now();
    try {
      const [quboRes, ortoolsRes] = await Promise.all([
        quboToRun
          ? fetch("/api/ide/execute", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              signal: controller.signal,
              body: JSON.stringify({ code: quboToRun }),
            }).then(async (r) => ({ data: await r.json(), ms: Math.round(performance.now() - start) }))
          : Promise.resolve(null),
        ortoolsToRun
          ? fetch("/api/ide/execute", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              signal: controller.signal,
              body: JSON.stringify({ code: ortoolsToRun }),
            }).then(async (r) => ({ data: await r.json(), ms: Math.round(performance.now() - start) }))
          : Promise.resolve(null),
      ]);

      const totalElapsed = Math.round(performance.now() - start);
      const logLines: string[] = [];

      if (quboRes?.data) {
        logLines.push(`── D-Wave QUBO Annealer (solution.py · ${quboRes.ms}ms) ──`);
        if (quboRes.data.stdout) logLines.push(...quboRes.data.stdout.trim().split("\n"));
        if (quboRes.data.stderr) {
          logLines.push(...quboRes.data.stderr.trim().split("\n").map((l: string) => `[STDERR] ${l}`));
        }
      }
      if (ortoolsRes?.data) {
        logLines.push(`── Google OR-Tools CP-SAT (ortools_baseline.py · ${ortoolsRes.ms}ms) ──`);
        if (ortoolsRes.data.stdout) logLines.push(...ortoolsRes.data.stdout.trim().split("\n"));
        if (ortoolsRes.data.stderr) {
          logLines.push(...ortoolsRes.data.stderr.trim().split("\n").map((l: string) => `[STDERR] ${l}`));
        }
      }
      logLines.push(`[OK] Completed in ${totalElapsed}ms.`);

      setProjects((prevProjects) =>
        prevProjects.map((proj) => {
          if (proj.id !== activeProjectId) return proj;
          const prev = proj.workspace;
          const totalCons = prev.mathModel?.constraints?.length || 0;
          const prevExec = prev.execution;
          const prevComp = prevExec?.solverComparison;

          // Quantum side: parse fresh run if D-Wave ran, otherwise preserve previous
          let qFeasible: boolean | null = prevExec?.feasible ?? null;
          let qEnergy: number | null = prevExec?.energy ?? null;
          let qObj: number | null = prevExec?.objectiveValue ?? null;
          let fullSolution: Record<string, number> = prevExec?.solution ? { ...prevExec.solution } : {};
          let qSelected: string[] = prevExec?.selectedVariables ? [...prevExec.selectedVariables] : [];
          let qReads: number | null = prevExec?.numReads ?? null;
          let quantumSide: SolverComparisonSide = prevComp?.quantum || {
            solver: "D-Wave Simulated Annealer (QUBO)",
            status: "NOT_RUN",
            feasible: null,
            objective_value: null,
            energy: null,
            selected_variables: [],
            constraints_satisfied: 0,
            constraints_total: totalCons,
            solve_time_ms: null,
            logical_qubits: prev.qMatrix?.size || prev.variables.length,
            penalty_lambda: prev.penaltyLambda,
          };

          if (quboRes?.data) {
            const qOpt = quboRes.data.optimization_results;
            const qStdout = quboRes.data.stdout || "";
            const sampleObj: Record<string, number> =
              qOpt?.sample && typeof qOpt.sample === "object" ? qOpt.sample : {};
            const nextSol: Record<string, number> = {};
            for (const v of prev.variables) {
              nextSol[v.name] = typeof sampleObj[v.name] === "number" ? sampleObj[v.name] : 0;
            }
            for (const [k, val] of Object.entries(sampleObj)) {
              if (!k.startsWith("slack_")) {
                nextSol[k] = Number(val);
              }
            }
            fullSolution = nextSol;
            qSelected = Object.entries(fullSolution)
              .filter(([, val]) => Number(val) > 0)
              .map(([k]) => k);
            const parsedEnergy = typeof qOpt?.energy === "number" ? qOpt.energy : 0;
            qEnergy = parsedEnergy;
            const penMatch = qStdout.match(/Total Penalty:\s*([-+]?\d+(?:\.\d+)?)/);
            const totalPenalty = penMatch ? parseFloat(penMatch[1]) : 0;
            qFeasible = totalPenalty <= 1e-4;
            qObj = Math.round((parsedEnergy - totalPenalty) * 10000) / 10000;
            qReads = typeof qOpt?.num_reads === "number" ? qOpt.num_reads : 1000;
            quantumSide = {
              solver: "D-Wave Simulated Annealer (QUBO)",
              status: qFeasible ? "FEASIBLE" : "SUBOPTIMAL",
              feasible: qFeasible,
              objective_value: qObj,
              energy: qEnergy,
              selected_variables: qSelected,
              constraints_satisfied: qFeasible ? totalCons : 0,
              constraints_total: totalCons,
              solve_time_ms: quboRes.ms,
              logical_qubits: prev.qMatrix?.size || prev.variables.length,
              penalty_lambda: prev.penaltyLambda,
            };
          }

          // Classical side: parse fresh run if OR-Tools ran, otherwise preserve previous
          let classicalSide: SolverComparisonSide = prevComp?.classical || {
            solver: "Google OR-Tools CP-SAT",
            status: "NOT_RUN",
            feasible: null,
            objective_value: null,
            selected_variables: [],
            constraints_satisfied: 0,
            constraints_total: totalCons,
            solve_time_ms: null,
            code: resolvedOrtoolsCode,
          };

          if (ortoolsRes?.data) {
            const cStdout = ortoolsRes.data.stdout || "";
            const statusMatch = cStdout.match(/Google OR-Tools CP-SAT Status\s*:\s*([A-Z_]+)/);
            const objMatch = cStdout.match(/Exact Classical Objective\s*:\s*([-+]?\d+(?:\.\d+)?)/);
            const activeMatch = cStdout.match(/Active Decisions \(\d+\)\s*:\s*\[([^\]]*)\]/);
            const cStatus = statusMatch ? statusMatch[1] : ortoolsRes.data.success ? "OPTIMAL" : "ERROR";
            const cFeasible = cStatus === "OPTIMAL" || cStatus === "FEASIBLE";
            const cObj = objMatch ? parseFloat(objMatch[1]) : null;
            const cSelected = activeMatch
              ? activeMatch[1]
                  .split(",")
                  .map((s: string) => s.trim().replace(/^['"]|['"]$/g, ""))
                  .filter(Boolean)
              : [];

            classicalSide = {
              solver: "Google OR-Tools CP-SAT",
              status: cStatus,
              feasible: cFeasible,
              objective_value: cObj,
              selected_variables: cSelected,
              constraints_satisfied: cFeasible ? totalCons : 0,
              constraints_total: totalCons,
              solve_time_ms: ortoolsRes.ms,
              code: ortoolsToRun || resolvedOrtoolsCode,
            };
          }

          const solverComparison = computeSolverComparison({
            quantum: quantumSide,
            classical: classicalSide,
            totalCons,
            penaltyLambda: prev.penaltyLambda,
            objectiveSense: prev.mathModel?.objectiveSense,
            objectiveExpr: prev.mathModel?.objectiveExpr,
          });

          const nextFeasible = quboRes ? qFeasible : prevExec?.feasible ?? classicalSide.feasible;
          const nextSelected = quboRes ? qSelected : prevExec?.selectedVariables ?? classicalSide.selected_variables;
          const nextEnergy = qEnergy ?? (classicalSide.objective_value ?? null);
          const nextSolution: Record<string, number> =
            Object.keys(fullSolution).length > 0
              ? fullSolution
              : Object.fromEntries((nextSelected || []).map((v) => [v, 1]));

          const nextExecution = {
            feasible: nextFeasible,
            energy: nextEnergy,
            objectiveValue: quboRes ? qObj : prevExec?.objectiveValue ?? classicalSide.objective_value,
            solution: nextSolution,
            selectedVariables: nextSelected,
            numReads: qReads,
            penaltyWeight: prev.penaltyLambda,
            penaltyLabel: `λ = ${prev.penaltyLambda}`,
            ortoolsCode: ortoolsToRun || prev.ortoolsCode || resolvedOrtoolsCode,
            solverComparison,
          };

          // Keep the latest assistant message's Copilot result card in lockstep with the Result tab
          const lastBotIdx = (() => {
            for (let i = proj.messages.length - 1; i >= 0; i--) {
              if (proj.messages[i].sender === "assistant") return i;
            }
            return -1;
          })();
          const nextMessages =
            lastBotIdx >= 0
              ? proj.messages.map((m, idx) =>
                  idx === lastBotIdx
                    ? {
                        ...m,
                        text: solverComparison.summary,
                        executionResult: {
                          feasible: nextExecution.feasible,
                          energy: nextExecution.energy,
                          solution: nextExecution.solution,
                          selected_variables: nextExecution.selectedVariables,
                          num_reads: nextExecution.numReads,
                          interpretation: solverComparison.summary,
                          solver_comparison: solverComparison,
                        },
                      }
                    : m
                )
              : proj.messages;

          return {
            ...proj,
            updatedAt: Date.now(),
            messages: nextMessages,
            workspace: {
              ...prev,
              terminal: [...prev.terminal, ...logLines],
              execution: nextExecution,
            },
          };
        })
      );
    } catch (err: any) {
      const isAbort = err?.name === "AbortError" || controller.signal.aborted;
      updateActiveWorkspace((prev) => ({
        ...prev,
        terminal: [
          ...prev.terminal,
          isAbort ? `[STOPPED] Execution terminated by user.` : `[ERROR] Execution engine error: ${err.message}`,
        ],
      }));
    } finally {
      if (scriptAbortRef.current === controller) {
        scriptAbortRef.current = null;
      }
      scriptInFlightRef.current = false;
      setIsExecutingScript(false);
      setActiveSolverMode(null);
    }
  };

  const canCompile = Boolean(currentProject.lastProblemText?.trim() || ws.code?.trim());
  const canRunDwave = Boolean(ws.code?.trim());
  const canRunOrtools = Boolean(resolvedOrtoolsCode?.trim());

  // Derive live nav-bar progress beam state (Quantum Guru blue while compiling/simulating,
  // emerald green when optimal, amber/orange when suboptimal or constraint violation).
  const isAnyBusy = isSolving || isStreaming || isExecutingScript;
  const { headerActivityStatus, headerActivityProgress, headerActivityLabel } = useMemo<{
    headerActivityStatus: HeaderActivityStatus;
    headerActivityProgress: number | null;
    headerActivityLabel: string | null;
  }>(() => {
    if (isAnyBusy) {
      if (isStreaming) {
        const lastBot = [...currentProject.messages].reverse().find((m) => m.sender === "assistant");
        const steps = lastBot?.pipelineSteps || [];
        if (steps.length > 0) {
          const total = steps.length;
          const doneCount = steps.filter((s) => s.status === "done").length;
          const runningIdx = steps.findIndex((s) => s.status === "running");
          const currentStage = runningIdx >= 0 ? runningIdx + 1 : Math.min(total, doneCount + 1);
          const pct = Math.max(
            10,
            Math.min(94, Math.round(((doneCount + (runningIdx >= 0 ? 0.45 : 0.15)) / total) * 100))
          );
          return {
            headerActivityStatus: "running",
            headerActivityProgress: pct,
            headerActivityLabel: `Compiling ${currentStage}/${total}`,
          };
        }
        return {
          headerActivityStatus: "running",
          headerActivityProgress: null,
          headerActivityLabel: "Compiling",
        };
      }
      const label =
        activeSolverMode === "ortools"
          ? "Running OR-Tools"
          : activeSolverMode === "dwave"
          ? "Annealing"
          : activeSolverMode === "parallel"
          ? "Simulating"
          : "Solving";
      return {
        headerActivityStatus: "running",
        headerActivityProgress: null,
        headerActivityLabel: label,
      };
    }

    const exec = ws.execution;
    const hasResult = Boolean(
      exec &&
        (exec.feasible !== null ||
          typeof exec.energy === "number" ||
          exec.solverComparison != null)
    );
    if (!hasResult || !exec) {
      return {
        headerActivityStatus: "idle",
        headerActivityProgress: null,
        headerActivityLabel: null,
      };
    }

    const isFeasible = exec.feasible === true;
    const gapPct = exec.solverComparison?.optimality_gap_pct;
    const isOptimal = isFeasible && (gapPct == null || Math.abs(gapPct) <= 0.01);

    return {
      headerActivityStatus: isOptimal ? "optimal" : "warning",
      headerActivityProgress: 100,
      headerActivityLabel: null,
    };
  }, [isAnyBusy, isStreaming, activeSolverMode, currentProject.messages, ws.execution]);

  if (!isMounted || isInitializing || !isAuthenticated) {
    return (
      <div
        suppressHydrationWarning
        className="h-screen w-screen flex flex-col items-center justify-center bg-[#090A0D] text-white select-none"
      >
        <div className="flex items-center space-x-2 text-xs font-mono text-zinc-400">
          <div className="w-3.5 h-3.5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
          <span>{!isInitializing && !isAuthenticated ? "Redirecting to Sign In..." : "Verifying Enterprise session..."}</span>
        </div>
      </div>
    );
  }

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
        isSolving={isAnyBusy}
        onStopSolving={() => handleStopExecution()}
        activityStatus={headerActivityStatus}
        activityProgress={headerActivityProgress}
        activityLabel={headerActivityLabel}
        surfaceMode={surfaceMode}
        onSelectSurfaceMode={setSurfaceMode}
        onCompile={handleReSolve}
        onRunDwave={() => handleExecuteSolver("dwave")}
        onRunOrtools={() => handleExecuteSolver("ortools")}
        onRunParallel={() => handleExecuteSolver("parallel")}
        canCompile={canCompile}
        canRunDwave={canRunDwave}
        canRunOrtools={canRunOrtools}
        isDemo={isDemoUser}
      />

      {/* ── WORKSPACE SURFACE AREA ── */}
      <div
        style={{
          backgroundColor: isDark ? "#090A0D" : "#F8FAFC",
        }}
        className="flex-1 flex min-h-0 relative overflow-hidden enterprise-bg-layer-0"
      >
        {/* ── SURFACE 1: Optimization Copilot & Project History (kept mounted, toggled via CSS for 0ms switches) ── */}
        <div
          style={{
            width: "100%",
            minWidth: "100%",
            maxWidth: "100%",
            flexBasis: "100%",
            flexGrow: 0,
            flexShrink: 0,
          }}
          className={`h-full flex-row min-w-0 overflow-hidden ${surfaceMode === "copilot" ? "flex" : "hidden"}`}
        >
          {/* Left Rail Sidebar (balanced compact rail) */}
          <div
            style={{
              width: "268px",
              minWidth: "248px",
              maxWidth: "280px",
              flexBasis: "268px",
              flexShrink: 0,
              backgroundColor: isDark ? "#090A0D" : "#FFFFFF",
            }}
            className="h-full flex flex-col min-w-0 border-r border-white/[0.08] overflow-hidden enterprise-bg-layer-1"
          >
            <EnterpriseHistorySidebar
              isDark={isDark}
              onToggleTheme={() => setIsDark((prev) => !prev)}
              projects={projectEntries}
              activeProjectId={activeProjectId}
              onSelectProject={handleSelectProject}
              onNewProject={handleNewProject}
              executionHistory={currentProject.runs}
              activeRunId={currentProject.activeRunId}
              onSelectRun={handleSelectRun}
            />
          </div>

          {/* Chat Canvas (fluid remaining width with centered reading column) */}
          <div
            style={{
              backgroundColor: isDark ? "#0E0F13" : "#FFFFFF",
            }}
            className="flex-1 h-full flex flex-col min-w-0 overflow-hidden enterprise-bg-layer-2"
          >
            <EnterpriseChatPane
              isDark={isDark}
              messages={currentProject.messages}
              isStreaming={isStreaming}
              isLoadingProjects={
                !hasLoadedFromDb &&
                projects.length === 1 &&
                projects[0].id === "proj_initial" &&
                projects[0].messages.length === 0
              }
              onSendMessage={handleSendMessage}
              onStopStreaming={() => handleStopExecution()}
              onClearChat={() => {
                setProjects((prev) =>
                  prev.map((proj) => (proj.id === activeProjectId ? { ...proj, messages: [] } : proj))
                );
              }}
              onFocusWorkbench={() => setSurfaceMode("workbench")}
              onOpenProblemVault={() => setSurfaceMode("library")}
              onNewProject={handleNewProject}
            />
          </div>
        </div>

        {/* ── SURFACE 3: Verified Industry Problem Library (lazy-mounted on first visit, then kept alive) ── */}
        {(mountedSurfaces.library || surfaceMode === "library") && (
          <div
            style={{ width: "100%", minWidth: "100%", maxWidth: "100%", flexBasis: "100%", flexGrow: 0, flexShrink: 0 }}
            className={`h-full flex-col min-w-0 overflow-hidden ${surfaceMode === "library" ? "flex" : "hidden"}`}
          >
            <EnterpriseProblemLibrary
              isDark={isDark}
              isDemo={isDemoUser}
              onOpenProblem={handleRequestInstantiateLibraryProblem}
            />
          </div>
        )}

        {/* ── SURFACE 2: POC Workbench (lazy-mounted on first visit, kept alive so Monaco never reloads) ── */}
        {(mountedSurfaces.workbench || surfaceMode === "workbench") && (
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
            className={`h-full flex-col min-w-0 max-w-full overflow-hidden enterprise-bg-layer-0 ${
              surfaceMode === "workbench" ? "flex" : "hidden"
            }`}
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
              ortoolsCode={ws.ortoolsCode || ws.execution?.ortoolsCode || ws.execution?.solverComparison?.classical?.code || ""}
              onChangeOrtoolsCode={(ortoolsCode: string) => updateActiveWorkspace((prev) => ({ ...prev, ortoolsCode }))}
              executionHistory={currentProject.runs}
              onRestoreRun={handleSelectRun}
              onReSolve={handleReSolve}
              onStopSolving={() => handleStopExecution()}
              isSolving={isSolving || isStreaming || isExecutingScript}
              isDemo={isDemoUser}
              terminalRunSeq={terminalRunSeq}
              onOpenDeploy={() => setIsDeployModalOpen(true)}
              projectId={activeProjectId}
              problemTitle={currentProject.title}
              qMatrix={ws.qMatrix}
              solverRouting={ws.solverRouting}
              execution={ws.execution}
              libraryReference={currentProject.libraryRef ?? null}
              onUpdateExecution={(updater) =>
                updateActiveWorkspace((prev) => ({
                  ...prev,
                  execution: typeof updater === "function" ? updater(prev.execution) : updater,
                }))
              }
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
      <EnterpriseNewProjectModal
        isOpen={isNewProjectModalOpen}
        isDark={isDark}
        initialName={draftProjectName}
        templateProblem={pendingVaultProblem}
        onClose={() => {
          setIsNewProjectModalOpen(false);
          setPendingVaultProblem(null);
        }}
        onCreateBlank={handleCreateBlankProject}
        onOpenProblemVault={handleOpenProblemVaultFromModal}
        onConfirmInstantiate={handleConfirmInstantiateLibraryProblem}
      />

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
