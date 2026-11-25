"use client";

import React, { useState, useEffect, Suspense } from "react";
import { Mail, Lock, ArrowRight, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { useRouter, useSearchParams } from "next/navigation";
import {
  canAccessEnterprise,
  canAccessIde,
  getDefaultRouteForRole,
  normalizeRole,
} from "@/lib/roles";
import { LatexMath } from "@/components/optimization/LatexMath";

const HERO_HAMILTONIAN_LATEX =
  "\\min_{\\mathbf{x} \\in \\{0,1\\}^{n}} \\;\\; \\mathcal{H}_{\\text{obj}}(\\mathbf{x}) + \\lambda \\sum_{k=1}^{m} P_k(\\mathbf{x})";

function LoginForm() {
  const { login } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";
  const initialMode = searchParams.get("mode") === "signup" ? "signup" : "login";

  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Align document background with Obsidian Studio theme to eliminate white flash
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.add("dark");
      document.documentElement.setAttribute("data-theme", "dark");
      document.documentElement.style.backgroundColor = "#090A0D";
      document.body.style.backgroundColor = "#090A0D";
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setLoading(true);

    if (mode === "login" && (!email.trim() || !password)) {
      setError("Please enter your email and password.");
      setLoading(false);
      return;
    }

    if (mode === "signup" && (!firstName.trim() || !lastName.trim() || !email.trim())) {
      setError("Please provide your first name, last name, and email.");
      setLoading(false);
      return;
    }

    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/signup";
      const bodyPayload =
        mode === "login"
          ? { email: email.trim(), password }
          : {
              firstName: firstName.trim(),
              lastName: lastName.trim(),
              company: company.trim(),
              email: email.trim(),
              role: "learner",
            };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error || `${mode === "login" ? "Sign in" : "Access request"} failed`
        );
      }

      if (mode === "login") {
        login(data);
        showToast("Login Successful", "success");

        const params =
          typeof window !== "undefined"
            ? new URLSearchParams(window.location.search)
            : null;
        const rawRedirect = params?.get("redirect") || redirect;
        const activeRedirect =
          rawRedirect &&
          rawRedirect.startsWith("/") &&
          !rawRedirect.startsWith("//")
            ? rawRedirect
            : "/";

        const userRole = normalizeRole(data.role ?? data.user?.role);
        let targetRedirect = getDefaultRouteForRole(userRole);
        if (activeRedirect !== "/" && activeRedirect !== "/industry") {
          if (activeRedirect.startsWith("/enterprise")) {
            if (canAccessEnterprise(userRole)) targetRedirect = activeRedirect;
          } else if (activeRedirect.startsWith("/ide")) {
            if (canAccessIde(userRole)) targetRedirect = activeRedirect;
          } else if (activeRedirect.startsWith("/admin")) {
            if (userRole === "admin") targetRedirect = activeRedirect;
          } else {
            targetRedirect = activeRedirect;
          }
        }

        router.push(targetRedirect);
      } else {
        setSuccessMsg(
          data.message ||
            "Access request submitted. Our team will review your request and share your credentials once approved."
        );
        setMode("login");
        setPassword("");
      }
    } catch (err: any) {
      setError(
        err.message || "Authentication failed. Please check your connection."
      );
    } finally {
      setLoading(false);
    }
  };

  const isPendingApproval = error.toLowerCase().includes("pending admin approval");

  return (
    <div
      style={{ backgroundColor: "#090A0D" }}
      className="min-h-screen w-full flex flex-col lg:flex-row text-zinc-100 relative overflow-hidden font-sans selection:bg-white/20"
    >
      {/* ── LEFT 55%: Layered Obsidian-Navy Brand Showcase Canvas ── */}
      <section
        style={{
          background:
            "linear-gradient(155deg, #0B101C 0%, #090A0D 48%, #07080A 100%)",
        }}
        className="hidden lg:flex lg:w-[55%] flex-col justify-between p-10 xl:p-14 relative overflow-hidden shrink-0"
      >
        {/* Layer 2: Crisp Subtle Dotted Grid */}
        <div
          aria-hidden="true"
          style={{
            backgroundImage:
              "radial-gradient(rgba(255,255,255,0.075) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
          className="pointer-events-none absolute inset-0"
        />

        {/* Layer 3: Soft Ambient Quantum Guru Blue Depth Behind Hero & Equation Card */}
        <div
          aria-hidden="true"
          style={{
            background:
              "radial-gradient(620px circle at 28% 50%, rgba(46, 101, 191, 0.14), transparent 72%)",
          }}
          className="pointer-events-none absolute inset-0"
        />

        {/* Top-Left Brand Lockup (aligned to hero left edge) */}
        <div className="relative z-10 min-h-[36px] flex items-center">
          <a
            href="https://www.quantumcomputers.guru/"
            className="inline-flex items-center space-x-3 select-none group"
          >
            <div className="w-9 h-9 rounded-lg bg-white p-1.5 flex items-center justify-center shadow-xs shrink-0 overflow-hidden border border-slate-200/60 group-hover:scale-105 transition-transform">
              <img
                src="/qg-logo.png"
                alt="Quantum Guru"
                className="w-full h-full object-contain"
              />
            </div>
            <span className="text-[13px] font-mono font-bold tracking-[0.12em] uppercase text-white">
              QUANTUM GURU
            </span>
          </a>
        </div>

        {/* Center: Optically Lifted Hero Headline + Live-Feeling KaTeX QUBO Card */}
        <div className="relative z-10 max-w-[540px] space-y-7 my-auto pb-6">
          <div className="space-y-3">
            <div className="text-[11px] font-mono tracking-[0.16em] uppercase text-zinc-400">
              Quantum IDE &middot; Enterprise Optimization
            </div>
            <h1 className="text-[34px] xl:text-[38px] font-semibold tracking-tight text-zinc-100 leading-[1.12] text-balance">
              A Unified Workspace for Quantum &amp; Optimization.
            </h1>
          </div>

          {/* Live-Feeling KaTeX QUBO Hamiltonian Preview Card */}
          <div
            style={{ backgroundColor: "rgba(14, 15, 19, 0.92)" }}
            className="rounded-xl border border-white/[0.09] p-5 sm:p-6 space-y-5 shadow-[0_18px_50px_-20px_rgba(0,0,0,0.75)] backdrop-blur-xs animate-in fade-in duration-500"
          >
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/[0.07] text-[11px] font-mono">
              <span className="text-zinc-400">QUBO Hamiltonian Formulation</span>
              <span className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.1] text-zinc-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse shrink-0" />
                <span>Verified Equivalence</span>
              </span>
            </div>

            <div className="py-1.5 overflow-x-auto custom-scrollbar text-zinc-100">
              <LatexMath
                math={HERO_HAMILTONIAN_LATEX}
                inline={false}
                isDark={true}
                className="text-left text-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/[0.07] font-mono">
              <div
                style={{ backgroundColor: "#090A0D" }}
                className="px-3.5 py-2.5 rounded-lg border border-white/[0.08] space-y-0.5"
              >
                <div className="text-[10.5px] text-zinc-400">Annealing Engine</div>
                <div className="text-xs font-medium text-zinc-100">
                  D-Wave SA (QUBO)
                </div>
              </div>
              <div
                style={{ backgroundColor: "#090A0D" }}
                className="px-3.5 py-2.5 rounded-lg border border-white/[0.08] space-y-0.5"
              >
                <div className="text-[10.5px] text-zinc-400">Exact Baseline</div>
                <div className="text-xs font-medium text-zinc-100">
                  Google OR-Tools CP-SAT
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom: Structured 3-Metric Technical Credibility Strip */}
        <div className="relative z-10 flex items-center gap-8 pt-4 border-t border-white/[0.06] max-w-[540px]">
          <div className="space-y-0.5">
            <div className="text-base font-mono font-semibold text-zinc-100 tabular-nums">
              48
            </div>
            <div className="text-[11px] font-mono text-zinc-400">
              Verified benchmarks
            </div>
          </div>
          <div className="h-7 w-[1px] bg-white/[0.08]" aria-hidden="true" />
          <div className="space-y-0.5">
            <div className="text-base font-mono font-semibold text-zinc-100 tabular-nums">
              16
            </div>
            <div className="text-[11px] font-mono text-zinc-400">
              Problem families
            </div>
          </div>
          <div className="h-7 w-[1px] bg-white/[0.08]" aria-hidden="true" />
          <div className="space-y-0.5">
            <div className="text-base font-mono font-semibold text-zinc-100 tabular-nums">
              3
            </div>
            <div className="text-[11px] font-mono text-zinc-400">
              Solver engines
            </div>
          </div>
        </div>
      </section>

      {/* ── RIGHT 45%: Borderless Auth Pane (aligned top baseline + optical centering) ── */}
      <main
        style={{ backgroundColor: "#0E0F13" }}
        className="relative flex-1 lg:w-[45%] min-h-screen flex flex-col justify-between p-6 sm:p-10 xl:p-14 lg:border-l border-white/[0.08]"
      >
        {/* Signature 2px Quantum Guru Top Progress & Status Hairline */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-[2px] overflow-hidden"
        >
          {loading && (
            <div className="relative h-full w-full bg-[#2E65BF]/20">
              <div
                style={{
                  width: "36%",
                  background:
                    "linear-gradient(90deg, transparent 0%, #2E65BF 20%, #1BB0CE 62%, #38BDF8 90%, transparent 100%)",
                  boxShadow: "0 0 12px rgba(27, 176, 206, 0.85)",
                }}
                className="h-full qg-nav-beam-sweep"
              />
            </div>
          )}
          {!loading && successMsg && (
            <div
              style={{
                background:
                  "linear-gradient(90deg, #059669 0%, #10B981 50%, #34D399 100%)",
              }}
              className="h-full w-full opacity-80"
            />
          )}
          {!loading && error && (
            <div
              style={{
                background:
                  "linear-gradient(90deg, #D97706 0%, #F59E0B 50%, #FBBF24 100%)",
              }}
              className="h-full w-full opacity-80"
            />
          )}
        </div>

        {/* Top Bar: Mobile Logo (left) + Invite-only Access Pill (right, aligned to desktop logo baseline) */}
        <div className="min-h-[36px] flex items-center justify-between lg:justify-end">
          <a
            href="https://www.quantumcomputers.guru/"
            className="lg:hidden inline-flex items-center space-x-2.5 select-none"
          >
            <div className="w-8 h-8 rounded-lg bg-white p-1 flex items-center justify-center shrink-0 overflow-hidden border border-slate-200/50">
              <img
                src="/qg-logo.png"
                alt="Quantum Guru"
                className="w-full h-full object-contain"
              />
            </div>
            <span className="text-xs font-mono font-bold tracking-wider uppercase text-white">
              QUANTUM GURU
            </span>
          </a>

          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono text-zinc-300 bg-white/[0.04] border border-white/[0.1] select-none">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 shrink-0" />
            <span>Invite-only access</span>
          </span>
        </div>

        {/* Optically Centered Borderless Auth Form */}
        <div className="w-full max-w-[380px] mx-auto my-auto pb-8 space-y-7">
          <div className="space-y-1.5">
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-100 font-sans">
              {mode === "login"
                ? "Sign in to Quantum Guru"
                : "Request workspace access"}
            </h2>
            <p className="text-sm text-zinc-400 font-sans leading-relaxed">
              {mode === "login"
                ? "Enter your credentials to open your workspace."
                : "Submit your details below. An administrator will provision your account once approved."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-mono text-zinc-300">
                      First name
                    </label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      style={{ backgroundColor: "#090A0D" }}
                      className="w-full border border-white/[0.12] focus:border-white/[0.3] rounded-lg py-3 px-3.5 text-[13px] font-mono text-zinc-100 placeholder:text-zinc-500 focus:outline-none transition-colors"
                      placeholder="Jane"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-mono text-zinc-300">
                      Last name
                    </label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      style={{ backgroundColor: "#090A0D" }}
                      className="w-full border border-white/[0.12] focus:border-white/[0.3] rounded-lg py-3 px-3.5 text-[13px] font-mono text-zinc-100 placeholder:text-zinc-500 focus:outline-none transition-colors"
                      placeholder="Doe"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-mono text-zinc-300">
                    Organization / University
                  </label>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    style={{ backgroundColor: "#090A0D" }}
                    className="w-full border border-white/[0.12] focus:border-white/[0.3] rounded-lg py-3 px-3.5 text-[13px] font-mono text-zinc-100 placeholder:text-zinc-500 focus:outline-none transition-colors"
                    placeholder="Institution or company"
                  />
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-mono text-zinc-300">
                Email
              </label>
              <div className="relative group">
                <Mail className="w-4 h-4 text-zinc-500 group-focus-within:text-zinc-300 transition-colors pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ backgroundColor: "#090A0D" }}
                  className="w-full border border-white/[0.12] focus:border-white/[0.3] rounded-lg py-3 pl-10 pr-3.5 text-[13px] font-mono text-zinc-100 placeholder:text-zinc-500 focus:outline-none transition-colors"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            {mode === "login" && (
              <div className="space-y-1.5">
                <label className="block text-xs font-mono text-zinc-300">
                  Password
                </label>
                <div className="relative group">
                  <Lock className="w-4 h-4 text-zinc-500 group-focus-within:text-zinc-300 transition-colors pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ backgroundColor: "#090A0D" }}
                    className="w-full border border-white/[0.12] focus:border-white/[0.3] rounded-lg py-3 pl-10 pr-10 text-[13px] font-mono text-zinc-100 placeholder:text-zinc-500 focus:outline-none transition-colors"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="text-zinc-500 hover:text-zinc-200 transition-colors cursor-pointer absolute right-3.5 top-1/2 -translate-y-1/2"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div
                className={`p-3 rounded-lg text-xs font-sans border leading-relaxed ${
                  isPendingApproval
                    ? "bg-amber-500/10 border-amber-500/25 text-amber-200"
                    : "bg-rose-500/10 border-rose-500/25 text-rose-300"
                }`}
              >
                {isPendingApproval ? (
                  <div className="space-y-1">
                    <p className="font-semibold text-amber-200">
                      Account pending admin approval
                    </p>
                    <p className="text-xs text-amber-200/85">
                      Your request was received and is awaiting administrator
                      review. You can sign in once activated.
                    </p>
                  </div>
                ) : (
                  error
                )}
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-lg text-xs font-sans bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 leading-relaxed">
                {successMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-zinc-200 hover:bg-white text-zinc-950 py-3 mt-2 rounded-lg text-sm font-sans font-semibold tracking-tight transition-all active:scale-[0.98] shadow-sm flex items-center justify-center gap-2 group cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span>
                  {mode === "login" ? "Signing in..." : "Submitting request..."}
                </span>
              ) : (
                <>
                  <span>
                    {mode === "login" ? "Sign in" : "Request access"}
                  </span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Quiet Footer Mode Switch */}
          <div className="pt-5 border-t border-white/[0.08] text-center text-sm font-sans text-zinc-400">
            {mode === "login" ? (
              <>
                No account yet?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("signup");
                    setError("");
                    setSuccessMsg("");
                  }}
                  className="text-zinc-100 hover:text-white font-medium underline underline-offset-4 decoration-white/30 hover:decoration-white transition-colors cursor-pointer"
                >
                  Request access
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setError("");
                    setSuccessMsg("");
                  }}
                  className="text-zinc-100 hover:text-white font-medium underline underline-offset-4 decoration-white/30 hover:decoration-white transition-colors cursor-pointer"
                >
                  Sign in
                </button>
              </>
            )}
          </div>
        </div>

        {/* Empty balancing spacer so optical centering stays exact */}
        <div className="hidden lg:block h-4" aria-hidden="true" />
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
