import React, { useState, useEffect, useRef } from "react";
import { apiClient } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { AiLogo } from "../components/AiLogo";
import { HireMindLogo } from "../components/HireMindLogo";
import {
  Terminal,
  Server,
  Database,
  Users,
  UserCheck,
  RefreshCw,
  Mail,
  Activity,
  Cpu,
  HardDrive,
  Copy,
  CheckCircle2,
  LogOut,
  AlertTriangle,
  Play,
  Send,
  Sliders,
  ChevronDown,
  ChevronUp,
  Shield,
  Code,
  RotateCcw,
  Zap,
  Check
} from "lucide-react";
import "../css/admin-dashboards-distinct.css";

interface DeveloperModeMeta {
  mode: string;
  title: string;
  icon: string;
  description: string;
  defaultSystemPrompt: string;
  suggestedPrompts: string[];
}

const FALLBACK_MODES: DeveloperModeMeta[] = [
  {
    mode: "ARCHITECTURE",
    title: "Architecture & Scalability",
    icon: "Server",
    description: "Microservices, distributed caching, event pipelines, and high-availability design.",
    defaultSystemPrompt: "You are HireMind AI Senior Principal Distributed Systems Architect. You specialize in high-concurrency Spring Boot 3 microservices, event-driven architectures with Kafka, distributed Redis 7 caching, MySQL sharding, and resilience patterns (Circuit Breakers, bulkheads, rate limiting). Provide clear architectural diagrams (ASCII or Mermaid), tradeoffs, and concrete recommendations.",
    suggestedPrompts: [
      "Design a resilient Kafka event bus for notification delivery across clusters",
      "How do we scale WebSocket connections across multiple Spring Boot instances?",
      "Evaluate Redis cluster vs single-node with sentinel for session replication"
    ]
  },
  {
    mode: "SQL_OPTIMIZER",
    title: "SQL & Database Optimizer",
    icon: "Database",
    description: "MySQL 8.x InnoDB query tuning, index strategy, and JPA N+1 mitigation.",
    defaultSystemPrompt: "You are HireMind AI Database Administrator & MySQL 8 InnoDB Performance Specialist. You specialize in analyzing SQL queries, EXPLAIN plans, composite indexes, B-tree traversal, deadlocks, transaction isolation levels, and JPA/Hibernate N+1 query traps. Provide optimized query rewrites, exact DDL index suggestions (`CREATE INDEX idx_...`), and performance trade-off analysis.",
    suggestedPrompts: [
      "Analyze EXPLAIN plan for job candidate match query and suggest composite indexes",
      "How to eliminate Hibernate N+1 queries on User -> Applications -> Candidate hierarchy?",
      "Recommend optimal indexing strategy for audit_logs timestamp and actor columns"
    ]
  },
  {
    mode: "LOG_ANALYZER",
    title: "Log & Crash Diagnostics",
    icon: "AlertTriangle",
    description: "Automated root-cause analysis, JVM exception triage, and connection leak diagnosis.",
    defaultSystemPrompt: "You are HireMind AI Production Triage & Root Cause Analysis Expert. You specialize in diagnosing Java JVM thread dumps, OutOfMemoryErrors, NullPointerExceptions, HikariCP connection leak warnings, Spring Security filter rejections, and network timeouts. Provide exact step-by-step root cause diagnosis, mitigation commands, and patch suggestions.",
    suggestedPrompts: [
      "Analyze recent system error logs and identify root causes of connection timeouts",
      "Diagnose HikariPool connection pool exhaustion under load spikes",
      "Identify common causes for JWT expired token handling in React axios interceptor"
    ]
  },
  {
    mode: "SECURITY_AUDIT",
    title: "Security & DevSecOps Audit",
    icon: "Shield",
    description: "OWASP Top 10 hardening, Spring Security 6 RBAC validation, and IDOR prevention.",
    defaultSystemPrompt: "You are HireMind AI Application Security & DevSecOps Lead. You specialize in OWASP Top 10, Spring Security 6 authorization, JWT validation, CSRF/CORS boundaries, SQL injection prevention, rate limiting, and RBAC isolation for multi-tenant systems. Highlight vulnerabilities, severity ratings (CRITICAL/HIGH/MEDIUM/LOW), and exact secure code patches.",
    suggestedPrompts: [
      "Audit AdminDeveloperController endpoints for privilege escalation risks",
      "Verify CORS and WebSocket handshake security against cross-site hijacking",
      "Check password reset and 2FA OTP flow for race conditions or brute force vectors"
    ]
  },
  {
    mode: "CODE_REVIEW",
    title: "Clean Code & Refactoring",
    icon: "Code",
    description: "Full-stack code reviews for Spring Boot 3 & React TypeScript applications.",
    defaultSystemPrompt: "You are HireMind AI Lead Software Engineer & Code Reviewer. You analyze Java Spring Boot and React TypeScript code for concurrency safety, memory leaks, performance bottlenecks, idiomatic style, and testability. Output actionable refactored code snippets with detailed explanations.",
    suggestedPrompts: [
      "Review React AuthContext for unnecessary re-renders and token storage safety",
      "Refactor Spring Boot service method to use declarative transactions and retry policy",
      "Convert legacy imperative stream logic to modern Java 17 records and pattern matching"
    ]
  },
  {
    mode: "GENERAL_DEV",
    title: "Autonomous Principal Dev Agent",
    icon: "Cpu",
    description: "General high-capability engineering partner for all dev-ops and coding tasks.",
    defaultSystemPrompt: "You are HireMind AI Autonomous Developer Assistant. You are a senior full-stack engineer and dev-ops expert. You assist developers with architectural design, debugging, SQL queries, testing, and system optimization. Provide concise, clean, and production-ready code with actionable guidance.",
    suggestedPrompts: [
      "How should we structure Docker Compose healthchecks for backend, mysql, and redis?",
      "Generate a complete integration test for AppDeveloper login and 2FA flow",
      "Write a Redis rate-limiting script using token bucket algorithm"
    ]
  }
];

interface ChatMessage {
  id: string;
  sender: "user" | "agent";
  text: string;
  mode?: string;
  modelUsed?: string;
  tokensUsed?: number;
  latencyMs?: number;
  systemContextIncluded?: boolean;
  timestamp: string;
}

export const AppDeveloperDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<"TELEMETRY" | "TERMINAL" | "ERRORS" | "INVITE">("TERMINAL");
  const [loading, setLoading] = useState<boolean>(true);
  const [dashboardData, setDashboardData] = useState<any>(null);

  // Sub-tab inside TERMINAL
  const [terminalSubTab, setTerminalSubTab] = useState<"AGENT_STUDIO" | "CLI_SANDBOX">("AGENT_STUDIO");

  // Dedicated AI Developer Agent Studio State
  const [modes, setModes] = useState<DeveloperModeMeta[]>(FALLBACK_MODES);
  const [selectedMode, setSelectedMode] = useState<string>("ARCHITECTURE");
  const [systemPrompt, setSystemPrompt] = useState<string>(FALLBACK_MODES[0].defaultSystemPrompt);
  const [temperature, setTemperature] = useState<number>(0.7);
  const [includeSystemContext, setIncludeSystemContext] = useState<boolean>(true);
  const [showConfigPanel, setShowConfigPanel] = useState<boolean>(false);
  const [showContextSnippet, setShowContextSnippet] = useState<boolean>(false);
  const [contextData, setContextData] = useState<string>("");
  const [promptInput, setPromptInput] = useState<string>("");
  const [agentLoading, setAgentLoading] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "init-msg",
      sender: "agent",
      text: "### 👨‍💻 HireMind Dedicated Application Developer AI Agent Ready\n\nI am your dedicated Principal Engineering AI assistant with isolated runtime execution and direct cluster telemetry diagnostics.\n\n* **Dedicated Model:** `gpt-4o` (Configurable)\n* **Security Tier:** Role-Gated Application Developer Authority (`ROLE_APP_DEVELOPER`)\n* **Capabilities:** Distributed Architecture, MySQL 8.x InnoDB Query Tuning, Log Diagnosis, Security Audits, and Refactoring.\n\nSelect a domain mode above, or enter your engineering query to start!",
      mode: "ARCHITECTURE",
      modelUsed: "gpt-4o",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Low-level AI CLI Terminal state
  const [selectedTool, setSelectedTool] = useState<string>("READ_METRICS");
  const [terminalQuery, setTerminalQuery] = useState<string>("");
  const [terminalOutput, setTerminalOutput] = useState<any>(null);
  const [terminalRunning, setTerminalRunning] = useState<boolean>(false);

  // Invite Developer state
  const [inviteEmail, setInviteEmail] = useState<string>("");
  const [inviteStatus, setInviteStatus] = useState<string>("");

  useEffect(() => {
    fetchDashboard();
    fetchModes();
    const interval = setInterval(fetchDashboard, 12000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, agentLoading]);

  const fetchDashboard = async () => {
    try {
      const res = await apiClient.get("/admin/developer/dashboard");
      if (res.data?.data) {
        setDashboardData(res.data.data);
      }
    } catch (err) {
      console.error("Error fetching developer dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchModes = async () => {
    try {
      const res = await apiClient.get("/admin/developer/agent/modes");
      if (res.data?.data && Array.isArray(res.data.data) && res.data.data.length > 0) {
        setModes(res.data.data);
        const current = res.data.data.find((m: any) => m.mode === selectedMode);
        if (current) {
          setSystemPrompt(current.defaultSystemPrompt);
        }
      }
    } catch (e) {
      // Fallback modes already populated
    }
  };

  const handleModeChange = (modeKey: string) => {
    setSelectedMode(modeKey);
    const m = modes.find((item) => item.mode === modeKey);
    if (m?.defaultSystemPrompt) {
      setSystemPrompt(m.defaultSystemPrompt);
    }
  };

  const resetSystemPromptToDefault = () => {
    const m = modes.find((item) => item.mode === selectedMode);
    if (m?.defaultSystemPrompt) {
      setSystemPrompt(m.defaultSystemPrompt);
    }
  };

  const handleSendPrompt = async (textToUse?: string) => {
    const finalPrompt = textToUse || promptInput;
    if (!finalPrompt.trim() || agentLoading) return;

    const userMsg: ChatMessage = {
      id: "user-" + Date.now(),
      sender: "user",
      text: finalPrompt,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    setMessages((prev) => [...prev, userMsg]);
    setPromptInput("");
    setAgentLoading(true);

    try {
      const res = await apiClient.post("/admin/developer/agent/chat", {
        prompt: finalPrompt,
        mode: selectedMode,
        systemPrompt: systemPrompt.trim() || undefined,
        temperature: temperature,
        includeSystemContext: includeSystemContext,
        contextData: contextData.trim() || undefined
      });

      if (res.data?.data) {
        const data = res.data.data;
        const agentMsg: ChatMessage = {
          id: "agent-" + Date.now(),
          sender: "agent",
          text: data.reply,
          mode: data.mode,
          modelUsed: data.modelUsed,
          tokensUsed: data.totalTokens,
          latencyMs: data.latencyMs,
          systemContextIncluded: data.systemContextIncluded,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        };
        setMessages((prev) => [...prev, agentMsg]);
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: "agent-err-" + Date.now(),
        sender: "agent",
        text: `⚠️ **Agent Error:** ${err.response?.data?.message || err.message || "Failed to communicate with Developer AI Agent"}`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setAgentLoading(false);
    }
  };

  const handleRunAiTool = async () => {
    setTerminalRunning(true);
    setTerminalOutput(null);
    try {
      const res = await apiClient.post("/admin/developer/ai-terminal", {
        tool: selectedTool,
        query: terminalQuery
      });
      if (res.data?.data) {
        setTerminalOutput(res.data.data);
      }
    } catch (err: any) {
      setTerminalOutput({
        status: "ERROR",
        summary: err.response?.data?.message || "Failed to execute developer tool"
      });
    } finally {
      setTerminalRunning(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    setInviteStatus(`Invitation sent successfully to ${inviteEmail}!`);
    setTimeout(() => {
      setInviteEmail("");
      setInviteStatus("");
    }, 3000);
  };

  const activeModeMeta = modes.find((m) => m.mode === selectedMode) || modes[0];
  const presence = dashboardData?.presence || {};
  const sys = dashboardData?.systemHealth || {};
  const db = dashboardData?.dbHealth || {};

  // Simple clean markdown parser for AI agent code blocks
  const renderFormattedText = (rawText: string, msgId: string) => {
    const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
    const parts = [];
    let lastIndex = 0;
    let match;
    let blockIndex = 0;

    while ((match = codeBlockRegex.exec(rawText)) !== null) {
      if (match.index > lastIndex) {
        parts.push({
          type: "text",
          content: rawText.substring(lastIndex, match.index),
          key: `txt-${blockIndex}`
        });
      }
      parts.push({
        type: "code",
        lang: match[1] || "plaintext",
        content: match[2].trim(),
        key: `code-${blockIndex}`
      });
      lastIndex = match.index + match[0].length;
      blockIndex++;
    }

    if (lastIndex < rawText.length) {
      parts.push({
        type: "text",
        content: rawText.substring(lastIndex),
        key: `txt-final`
      });
    }

    return (
      <div style={{ lineHeight: 1.6, fontSize: "13.5px" }}>
        {parts.map((p) => {
          if (p.type === "code") {
            const blockCopyId = `${msgId}-${p.key}`;
            return (
              <div
                key={p.key}
                style={{
                  margin: "12px 0",
                  borderRadius: "8px",
                  background: "#090D16",
                  border: "1px solid rgba(239, 68, 68, 0.25)",
                  overflow: "hidden"
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "6px 12px",
                    background: "rgba(239, 68, 68, 0.08)",
                    borderBottom: "1px solid rgba(239, 68, 68, 0.2)",
                    fontSize: "11px",
                    color: "#F87171",
                    fontFamily: "monospace"
                  }}
                >
                  <span style={{ textTransform: "uppercase", fontWeight: 700 }}>
                    {p.lang || "CODE"}
                  </span>
                  <button
                    onClick={() => copyToClipboard(p.content, blockCopyId)}
                    style={{
                      background: "rgba(255, 255, 255, 0.06)",
                      border: "1px solid rgba(239, 68, 68, 0.3)",
                      borderRadius: "4px",
                      color: "#F8FAFC",
                      padding: "2px 8px",
                      fontSize: "11px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px"
                    }}
                  >
                    {copiedId === blockCopyId ? (
                      <Check size={12} color="#10B981" />
                    ) : (
                      <Copy size={12} />
                    )}
                    {copiedId === blockCopyId ? "Copied" : "Copy"}
                  </button>
                </div>
                <pre
                  style={{
                    margin: 0,
                    padding: "14px",
                    color: "#F1F5F9",
                    fontFamily: "JetBrains Mono, Menlo, Consolas, monospace",
                    fontSize: "12px",
                    overflowX: "auto",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word"
                  }}
                >
                  {p.content}
                </pre>
              </div>
            );
          }

          return (
            <div
              key={p.key}
              style={{ whiteSpace: "pre-wrap", color: "#E2E8F0", marginBottom: "8px" }}
            >
              {p.content}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="dev-console-wrapper">
      {/* ── Developer Sidebar Dock ── */}
      <aside className="dev-sidebar">
        <div className="dev-sidebar-header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <HireMindLogo variant="navbar" size="xs" theme="dark" animated={false} />
            <div>
              <div
                style={{
                  fontSize: "13.5px",
                  fontWeight: 900,
                  color: "#EF4444",
                  letterSpacing: "0.04em",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                DEV-OPS SUITE
              </div>
              <div style={{ fontSize: "11px", color: "#94A3B8" }}>Dedicated Developer AI Agent</div>
            </div>
          </div>

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "rgba(239, 68, 68, 0.12)",
              border: "1px solid rgba(239, 68, 68, 0.35)",
              padding: "4px 10px",
              borderRadius: "12px",
              fontSize: "11px",
              color: "#F87171",
              marginTop: "6px",
              boxShadow: "0 0 10px rgba(239, 68, 68, 0.15)"
            }}
          >
            <span
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                background: "#EF4444",
                display: "inline-block",
                boxShadow: "0 0 8px #EF4444",
                animation: "pulse 1.5s infinite"
              }}
            />
            AI DEV AGENT ACTIVE (gpt-4o)
          </div>
        </div>

        <nav style={{ flex: 1, padding: "16px 0" }}>
          <button
            className={`dev-nav-btn ${activeTab === "TERMINAL" ? "active" : ""}`}
            onClick={() => setActiveTab("TERMINAL")}
            style={
              activeTab === "TERMINAL"
                ? {
                    background: "rgba(239, 68, 68, 0.18)",
                    borderColor: "rgba(239, 68, 68, 0.5)",
                    color: "#F87171"
                  }
                : {}
            }
          >
            <AiLogo size={18} animated color="red" /> AI Developer Agent Studio
          </button>
          <button
            className={`dev-nav-btn ${activeTab === "TELEMETRY" ? "active" : ""}`}
            onClick={() => setActiveTab("TELEMETRY")}
          >
            <Activity size={16} /> Cluster Telemetry
          </button>
          <button
            className={`dev-nav-btn ${activeTab === "ERRORS" ? "active" : ""}`}
            onClick={() => setActiveTab("ERRORS")}
          >
            <AlertTriangle size={16} /> Error Logs & Tracing
          </button>
          <button
            className={`dev-nav-btn ${activeTab === "INVITE" ? "active" : ""}`}
            onClick={() => setActiveTab("INVITE")}
          >
            <Mail size={16} /> Developer Team Invite
          </button>
        </nav>

        <div
          style={{
            padding: "16px 20px",
            borderTop: "1px solid rgba(239, 68, 68, 0.15)",
            background: "rgba(0,0,0,0.25)"
          }}
        >
          <div style={{ fontSize: "11.5px", color: "#94A3B8", marginBottom: "4px" }}>
            Signed in as App Developer:
          </div>
          <div
            style={{
              fontSize: "12px",
              color: "#F87171",
              fontWeight: 700,
              wordBreak: "break-all",
              marginBottom: "12px"
            }}
          >
            {user?.email}
          </div>
          <button
            onClick={() => logout('/admin-login')}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              width: "100%",
              padding: "8px",
              background: "rgba(239, 68, 68, 0.15)",
              border: "1px solid rgba(239, 68, 68, 0.4)",
              borderRadius: "8px",
              color: "#FCA5A5",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer"
            }}
          >
            <LogOut size={14} /> Exit Developer Console
          </button>
        </div>
      </aside>

      {/* ── Main Workspace ── */}
      <main style={{ flex: 1, padding: "24px 28px", overflowY: "auto" }}>
        {/* Workspace Top Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
            flexWrap: "wrap",
            gap: "16px"
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              {activeTab === "TERMINAL" && <AiLogo size={24} animated color="red" />}
              <h1 style={{ fontSize: "22px", fontWeight: 900, color: "#F1F5F9", margin: 0 }}>
                {activeTab === "TERMINAL" && "Application Developer AI Agent Studio"}
                {activeTab === "TELEMETRY" && "⚡ Real-time Cluster Telemetry & System Presence"}
                {activeTab === "ERRORS" && "📜 Diagnostic Error Log Streamer"}
                {activeTab === "INVITE" && "👥 Developer Access & Team Provisioning"}
              </h1>
            </div>
            <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#94A3B8" }}>
              Role: <strong style={{ color: "#EF4444" }}>ROLE_APP_DEVELOPER</strong> | Red AI Model
              Boundary Active | Safe Read-Only Cluster Diagnostics
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              onClick={fetchDashboard}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                background: "rgba(239, 68, 68, 0.12)",
                border: "1px solid rgba(239, 68, 68, 0.35)",
                borderRadius: "8px",
                color: "#F87171",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer"
              }}
            >
              <RefreshCw size={13} className={loading ? "spin" : ""} /> Refresh Telemetry
            </button>
          </div>
        </div>

        {/* ── TAB: TERMINAL (AI Developer Studio & CLI Sandbox) ── */}
        {activeTab === "TERMINAL" && (
          <div>
            {/* Studio Mode Selector (Agent Studio vs CLI Sandbox) */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "rgba(15, 23, 42, 0.7)",
                padding: "6px",
                borderRadius: "12px",
                border: "1px solid rgba(239, 68, 68, 0.25)",
                marginBottom: "20px"
              }}
            >
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => setTerminalSubTab("AGENT_STUDIO")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 16px",
                    borderRadius: "8px",
                    border:
                      terminalSubTab === "AGENT_STUDIO"
                        ? "1px solid rgba(239, 68, 68, 0.6)"
                        : "1px solid transparent",
                    background:
                      terminalSubTab === "AGENT_STUDIO"
                        ? "rgba(239, 68, 68, 0.2)"
                        : "transparent",
                    color: terminalSubTab === "AGENT_STUDIO" ? "#F87171" : "#94A3B8",
                    fontWeight: 700,
                    fontSize: "12.5px",
                    cursor: "pointer"
                  }}
                >
                  <AiLogo size={16} animated color="red" /> AI Developer Agent Studio
                </button>
                <button
                  onClick={() => setTerminalSubTab("CLI_SANDBOX")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 16px",
                    borderRadius: "8px",
                    border:
                      terminalSubTab === "CLI_SANDBOX"
                        ? "1px solid rgba(16, 185, 129, 0.6)"
                        : "1px solid transparent",
                    background:
                      terminalSubTab === "CLI_SANDBOX"
                        ? "rgba(16, 185, 129, 0.2)"
                        : "transparent",
                    color: terminalSubTab === "CLI_SANDBOX" ? "#34D399" : "#94A3B8",
                    fontWeight: 700,
                    fontSize: "12.5px",
                    cursor: "pointer"
                  }}
                >
                  <Terminal size={15} /> Low-Level CLI Sandbox
                </button>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  paddingRight: "12px",
                  fontSize: "11.5px",
                  color: "#94A3B8"
                }}
              >
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "#EF4444",
                    boxShadow: "0 0 8px #EF4444"
                  }}
                />
                Dedicated Red Model: <strong style={{ color: "#F87171" }}>gpt-4o</strong>
              </div>
            </div>

            {/* ── SUB-TAB 1: AI DEVELOPER AGENT STUDIO ── */}
            {terminalSubTab === "AGENT_STUDIO" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Mode Selector Chips */}
                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    overflowX: "auto",
                    paddingBottom: "4px"
                  }}
                >
                  {modes.map((m) => {
                    const isSelected = selectedMode === m.mode;
                    return (
                      <button
                        key={m.mode}
                        onClick={() => handleModeChange(m.mode)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          padding: "8px 14px",
                          borderRadius: "10px",
                          border: isSelected
                            ? "1px solid #EF4444"
                            : "1px solid rgba(255, 255, 255, 0.08)",
                          background: isSelected
                            ? "linear-gradient(135deg, rgba(239, 68, 68, 0.25) 0%, rgba(185, 28, 28, 0.15) 100%)"
                            : "rgba(15, 23, 42, 0.6)",
                          color: isSelected ? "#FCA5A5" : "#94A3B8",
                          fontSize: "12px",
                          fontWeight: isSelected ? 800 : 600,
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                          boxShadow: isSelected ? "0 0 12px rgba(239, 68, 68, 0.25)" : "none",
                          transition: "all 0.15s ease"
                        }}
                      >
                        {m.mode === "ARCHITECTURE" && <Server size={14} />}
                        {m.mode === "SQL_OPTIMIZER" && <Database size={14} />}
                        {m.mode === "LOG_ANALYZER" && <AlertTriangle size={14} />}
                        {m.mode === "SECURITY_AUDIT" && <Shield size={14} />}
                        {m.mode === "CODE_REVIEW" && <Code size={14} />}
                        {m.mode === "GENERAL_DEV" && <Cpu size={14} />}
                        {m.title}
                      </button>
                    );
                  })}
                </div>

                {/* Mode Description & Prompt Config Accordion */}
                <div
                  style={{
                    background: "rgba(10, 15, 29, 0.85)",
                    border: "1px solid rgba(239, 68, 68, 0.25)",
                    borderRadius: "12px",
                    padding: "14px 18px"
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: "13px",
                          fontWeight: 800,
                          color: "#F87171",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px"
                        }}
                      >
                        <Zap size={14} /> Active Persona: {activeModeMeta.title}
                      </div>
                      <div style={{ fontSize: "12px", color: "#94A3B8", marginTop: "2px" }}>
                        {activeModeMeta.description}
                      </div>
                    </div>

                    <button
                      onClick={() => setShowConfigPanel(!showConfigPanel)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "6px 12px",
                        background: showConfigPanel
                          ? "rgba(239, 68, 68, 0.2)"
                          : "rgba(255, 255, 255, 0.05)",
                        border: "1px solid rgba(239, 68, 68, 0.3)",
                        borderRadius: "6px",
                        color: "#F8FAFC",
                        fontSize: "11.5px",
                        fontWeight: 700,
                        cursor: "pointer"
                      }}
                    >
                      <Sliders size={13} />
                      {showConfigPanel ? "Hide Prompt Config" : "Configure Prompt & System Persona"}
                      {showConfigPanel ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                  </div>

                  {/* Flexible Prompt Configuration Panel */}
                  {showConfigPanel && (
                    <div
                      style={{
                        marginTop: "16px",
                        paddingTop: "16px",
                        borderTop: "1px solid rgba(239, 68, 68, 0.15)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "14px"
                      }}
                    >
                      {/* System Prompt Customizer */}
                      <div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "6px"
                          }}
                        >
                          <label
                            style={{
                              fontSize: "12px",
                              fontWeight: 700,
                              color: "#F87171"
                            }}
                          >
                            Custom System Prompt Override (Engineering Persona):
                          </label>
                          <button
                            onClick={resetSystemPromptToDefault}
                            style={{
                              background: "transparent",
                              border: "none",
                              color: "#94A3B8",
                              fontSize: "11px",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px"
                            }}
                          >
                            <RotateCcw size={11} /> Reset to Mode Default
                          </button>
                        </div>
                        <textarea
                          rows={3}
                          value={systemPrompt}
                          onChange={(e) => setSystemPrompt(e.target.value)}
                          placeholder="Override system instructions for this developer AI model session..."
                          style={{
                            width: "100%",
                            background: "rgba(0, 0, 0, 0.4)",
                            border: "1px solid rgba(239, 68, 68, 0.3)",
                            borderRadius: "8px",
                            padding: "10px",
                            color: "#F1F5F9",
                            fontSize: "12px",
                            fontFamily: "monospace",
                            boxSizing: "border-box"
                          }}
                        />
                      </div>

                      {/* Controls Row: Temperature & Telemetry Toggle */}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                          gap: "16px"
                        }}
                      >
                        {/* Temperature Slider */}
                        <div>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              fontSize: "12px",
                              color: "#94A3B8",
                              marginBottom: "6px"
                            }}
                          >
                            <span>
                              Model Temperature:{" "}
                              <strong style={{ color: "#F87171" }}>{temperature.toFixed(1)}</strong>
                            </span>
                            <span style={{ fontSize: "11px" }}>
                              {temperature <= 0.3
                                ? "Strict / Deterministic"
                                : temperature <= 0.8
                                ? "Balanced Engineering"
                                : "Creative / Exploratory"}
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0.0"
                            max="1.5"
                            step="0.1"
                            value={temperature}
                            onChange={(e) => setTemperature(parseFloat(e.target.value))}
                            style={{ width: "100%", accentColor: "#EF4444", cursor: "pointer" }}
                          />
                        </div>

                        {/* Cluster Telemetry Context Toggle */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            background: "rgba(0, 0, 0, 0.3)",
                            padding: "10px 14px",
                            borderRadius: "8px",
                            border: "1px solid rgba(239, 68, 68, 0.2)"
                          }}
                        >
                          <input
                            type="checkbox"
                            id="telemetryToggle"
                            checked={includeSystemContext}
                            onChange={(e) => setIncludeSystemContext(e.target.checked)}
                            style={{ width: "16px", height: "16px", accentColor: "#EF4444" }}
                          />
                          <label
                            htmlFor="telemetryToggle"
                            style={{
                              fontSize: "12px",
                              color: "#E2E8F0",
                              cursor: "pointer",
                              lineHeight: 1.3
                            }}
                          >
                            <strong style={{ color: "#F87171" }}>
                              Ground with Live Cluster Telemetry
                            </strong>
                            <div style={{ fontSize: "11px", color: "#94A3B8" }}>
                              Injects JVM heap, Hikari connection pool, and error logs into system context
                            </div>
                          </label>
                        </div>
                      </div>

                      {/* Optional Context Snippet Drawer */}
                      <div>
                        <button
                          onClick={() => setShowContextSnippet(!showContextSnippet)}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "#F87171",
                            fontSize: "11.5px",
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: 0
                          }}
                        >
                          {showContextSnippet ? "[-] Hide Context Snippet" : "[+] Attach Code / SQL / Stacktrace Context"}
                        </button>

                        {showContextSnippet && (
                          <textarea
                            rows={3}
                            value={contextData}
                            onChange={(e) => setContextData(e.target.value)}
                            placeholder="Paste SQL queries, Java methods, or error logs here to provide direct context to the model..."
                            style={{
                              width: "100%",
                              marginTop: "8px",
                              background: "rgba(0, 0, 0, 0.4)",
                              border: "1px solid rgba(239, 68, 68, 0.3)",
                              borderRadius: "8px",
                              padding: "10px",
                              color: "#F1F5F9",
                              fontSize: "12px",
                              fontFamily: "monospace",
                              boxSizing: "border-box"
                            }}
                          />
                        )}
                      </div>
                    </div>
                  )}

                  {/* Suggested Prompts Chips */}
                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      flexWrap: "wrap",
                      marginTop: "12px",
                      paddingTop: "10px",
                      borderTop: "1px dashed rgba(255, 255, 255, 0.08)"
                    }}
                  >
                    <span
                      style={{
                        fontSize: "11px",
                        color: "#64748B",
                        alignSelf: "center",
                        fontWeight: 700
                      }}
                    >
                      Quick Queries:
                    </span>
                    {activeModeMeta.suggestedPrompts.map((sp, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendPrompt(sp)}
                        style={{
                          background: "rgba(239, 68, 68, 0.08)",
                          border: "1px solid rgba(239, 68, 68, 0.2)",
                          borderRadius: "6px",
                          color: "#FCA5A5",
                          fontSize: "11px",
                          padding: "4px 10px",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                          textAlign: "left"
                        }}
                      >
                        ⚡ {sp}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Interactive Chat Stream Box */}
                <div
                  style={{
                    background: "rgba(5, 8, 16, 0.9)",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    boxShadow: "0 0 20px rgba(239, 68, 68, 0.12)",
                    borderRadius: "14px",
                    padding: "20px",
                    minHeight: "440px",
                    maxHeight: "560px",
                    overflowY: "auto",
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px"
                  }}
                >
                  {messages.map((msg) => {
                    const isUser = msg.sender === "user";
                    return (
                      <div
                        key={msg.id}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: isUser ? "flex-end" : "flex-start",
                          maxWidth: "100%"
                        }}
                      >
                        {/* Sender Label */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            marginBottom: "4px",
                            fontSize: "11px",
                            color: "#94A3B8"
                          }}
                        >
                          {isUser ? (
                            <>
                              <span>App Developer</span>
                              <span>• {msg.timestamp}</span>
                            </>
                          ) : (
                            <>
                              <AiLogo size={14} animated color="red" />
                              <strong style={{ color: "#F87171" }}>HireMind AI Dev Agent</strong>
                              {msg.mode && (
                                <span
                                  style={{
                                    background: "rgba(239, 68, 68, 0.15)",
                                    color: "#F87171",
                                    padding: "1px 6px",
                                    borderRadius: "4px",
                                    fontSize: "10px",
                                    fontWeight: 700
                                  }}
                                >
                                  {msg.mode}
                                </span>
                              )}
                              {msg.modelUsed && (
                                <span style={{ fontSize: "10px", color: "#64748B" }}>
                                  ({msg.modelUsed})
                                </span>
                              )}
                              <span>• {msg.timestamp}</span>
                            </>
                          )}
                        </div>

                        {/* Bubble Content */}
                        <div
                          style={{
                            maxWidth: isUser ? "85%" : "95%",
                            background: isUser
                              ? "linear-gradient(135deg, rgba(239, 68, 68, 0.25) 0%, rgba(185, 28, 28, 0.3) 100%)"
                              : "rgba(15, 23, 42, 0.8)",
                            border: isUser
                              ? "1px solid rgba(239, 68, 68, 0.5)"
                              : "1px solid rgba(255, 255, 255, 0.08)",
                            borderRadius: isUser ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                            padding: "14px 18px",
                            color: "#F8FAFC",
                            boxShadow: isUser
                              ? "0 4px 14px rgba(239, 68, 68, 0.15)"
                              : "0 4px 14px rgba(0, 0, 0, 0.3)"
                          }}
                        >
                          {isUser ? (
                            <div style={{ whiteSpace: "pre-wrap", fontSize: "13.5px" }}>
                              {msg.text}
                            </div>
                          ) : (
                            renderFormattedText(msg.text, msg.id)
                          )}

                          {/* Agent Telemetry Footer Bar */}
                          {!isUser && (msg.tokensUsed || msg.latencyMs) && (
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "12px",
                                marginTop: "12px",
                                paddingTop: "8px",
                                borderTop: "1px solid rgba(255, 255, 255, 0.06)",
                                fontSize: "11px",
                                color: "#64748B"
                              }}
                            >
                              {msg.latencyMs && (
                                <span>
                                  Latency: <strong style={{ color: "#94A3B8" }}>{msg.latencyMs}ms</strong>
                                </span>
                              )}
                              {msg.tokensUsed && (
                                <span>
                                  Tokens: <strong style={{ color: "#94A3B8" }}>{msg.tokensUsed}</strong>
                                </span>
                              )}
                              {msg.systemContextIncluded && (
                                <span style={{ color: "#10B981", display: "flex", alignItems: "center", gap: "3px" }}>
                                  <CheckCircle2 size={11} /> Telemetry Grounded
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Agent Loading State */}
                  {agentLoading && (
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px" }}>
                      <AiLogo size={20} animated color="red" />
                      <span style={{ fontSize: "12.5px", color: "#F87171", fontWeight: 600 }}>
                        Developer AI Agent is analyzing cluster telemetry & formulating solution...
                      </span>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Prompt Input Controls */}
                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    alignItems: "center",
                    background: "rgba(10, 15, 29, 0.9)",
                    border: "1px solid rgba(239, 68, 68, 0.35)",
                    boxShadow: "0 0 16px rgba(239, 68, 68, 0.15)",
                    borderRadius: "12px",
                    padding: "8px 12px"
                  }}
                >
                  <AiLogo size={22} animated color="red" />
                  <input
                    type="text"
                    value={promptInput}
                    onChange={(e) => setPromptInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendPrompt();
                      }
                    }}
                    placeholder={`Ask AI Developer Agent (${activeModeMeta.title}) — e.g. "Review database index strategy for audit table"`}
                    style={{
                      flex: 1,
                      background: "transparent",
                      border: "none",
                      color: "#F8FAFC",
                      fontSize: "13px",
                      padding: "8px",
                      outline: "none"
                    }}
                  />
                  <button
                    onClick={() => handleSendPrompt()}
                    disabled={agentLoading || !promptInput.trim()}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "8px 18px",
                      background:
                        agentLoading || !promptInput.trim()
                          ? "rgba(239, 68, 68, 0.2)"
                          : "linear-gradient(135deg, #EF4444 0%, #DC2626 100%)",
                      border: "none",
                      borderRadius: "8px",
                      color: "#F8FAFC",
                      fontWeight: 800,
                      fontSize: "12.5px",
                      cursor: agentLoading || !promptInput.trim() ? "not-allowed" : "pointer",
                      boxShadow:
                        agentLoading || !promptInput.trim()
                          ? "none"
                          : "0 0 12px rgba(239, 68, 68, 0.4)"
                    }}
                  >
                    <Send size={14} /> Send Prompt
                  </button>
                </div>
              </div>
            )}

            {/* ── SUB-TAB 2: LOW-LEVEL CLI SANDBOX (Retained for system diagnostics) ── */}
            {terminalSubTab === "CLI_SANDBOX" && (
              <div className="dev-terminal-box">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottom: "1px solid rgba(16, 185, 129, 0.2)",
                    paddingBottom: "12px",
                    marginBottom: "16px"
                  }}
                >
                  <div style={{ display: "flex", gap: "6px" }}>
                    <span
                      style={{
                        width: "12px",
                        height: "12px",
                        borderRadius: "50%",
                        background: "#EF4444"
                      }}
                    />
                    <span
                      style={{
                        width: "12px",
                        height: "12px",
                        borderRadius: "50%",
                        background: "#F59E0B"
                      }}
                    />
                    <span
                      style={{
                        width: "12px",
                        height: "12px",
                        borderRadius: "50%",
                        background: "#10B981"
                      }}
                    />
                    <span style={{ fontSize: "12px", color: "#64748B", marginLeft: "10px" }}>
                      hiremind-terminal — bash — 80x24
                    </span>
                  </div>
                  <div style={{ fontSize: "11px", color: "#10B981" }}>
                    PROTECTED READ-ONLY DEV SANDBOX
                  </div>
                </div>

                {/* Quick Command Selector */}
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
                  {[
                    "READ_METRICS",
                    "READ_LOGS",
                    "CHECK_API",
                    "CHECK_DATABASE",
                    "ANALYZE_QUERY",
                    "CHECK_DEPLOYMENT"
                  ].map((tool) => (
                    <button
                      key={tool}
                      onClick={() => setSelectedTool(tool)}
                      style={{
                        padding: "6px 12px",
                        background:
                          selectedTool === tool ? "#10B981" : "rgba(16, 185, 129, 0.1)",
                        color: selectedTool === tool ? "#060913" : "#34D399",
                        border: "1px solid rgba(16, 185, 129, 0.3)",
                        borderRadius: "6px",
                        fontSize: "11px",
                        fontWeight: 700,
                        cursor: "pointer"
                      }}
                    >
                      ${tool}
                    </button>
                  ))}
                </div>

                {/* Terminal Input */}
                <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
                  <span style={{ color: "#10B981", fontWeight: 800, lineHeight: "38px" }}>
                    hiremind-ops@cluster:~$
                  </span>
                  <input
                    type="text"
                    value={terminalQuery}
                    onChange={(e) => setTerminalQuery(e.target.value)}
                    placeholder="Enter query or parameters (e.g. 'inspect connection latency')"
                    style={{
                      flex: 1,
                      background: "rgba(255, 255, 255, 0.03)",
                      border: "1px solid rgba(16, 185, 129, 0.3)",
                      borderRadius: "6px",
                      color: "#34D399",
                      padding: "8px 14px",
                      fontFamily: "inherit",
                      fontSize: "13px"
                    }}
                  />
                  <button
                    onClick={handleRunAiTool}
                    disabled={terminalRunning}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "8px 18px",
                      background: "#10B981",
                      border: "none",
                      borderRadius: "6px",
                      color: "#060913",
                      fontWeight: 800,
                      fontSize: "13px",
                      cursor: "pointer"
                    }}
                  >
                    <Play size={14} /> {terminalRunning ? "Executing..." : "Run Command"}
                  </button>
                </div>

                {/* Terminal Output Screen */}
                {terminalOutput && (
                  <div
                    style={{
                      background: "#010204",
                      border: "1px solid rgba(16, 185, 129, 0.2)",
                      borderRadius: "8px",
                      padding: "16px",
                      position: "relative"
                    }}
                  >
                    <button
                      onClick={() =>
                        copyToClipboard(JSON.stringify(terminalOutput, null, 2), "cli-out")
                      }
                      style={{
                        position: "absolute",
                        top: "12px",
                        right: "12px",
                        background: "rgba(255, 255, 255, 0.1)",
                        border: "none",
                        borderRadius: "4px",
                        color: "#94A3B8",
                        padding: "4px 8px",
                        cursor: "pointer",
                        fontSize: "11px",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px"
                      }}
                    >
                      {copiedId === "cli-out" ? (
                        <CheckCircle2 size={12} color="#10B981" />
                      ) : (
                        <Copy size={12} />
                      )}
                      {copiedId === "cli-out" ? "Copied" : "Copy"}
                    </button>
                    <pre
                      style={{
                        margin: 0,
                        color: "#38BDF8",
                        fontSize: "12px",
                        overflowX: "auto",
                        whiteSpace: "pre-wrap"
                      }}
                    >
                      {JSON.stringify(terminalOutput, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 1: TELEMETRY ── */}
        {activeTab === "TELEMETRY" && (
          <div>
            {/* Live Presence Row */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "16px",
                marginBottom: "24px"
              }}
            >
              <div
                style={{
                  background: "rgba(10, 15, 29, 0.7)",
                  border: "1px solid rgba(16, 185, 129, 0.25)",
                  borderRadius: "12px",
                  padding: "18px"
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    color: "#64748B",
                    fontSize: "12px",
                    marginBottom: "6px"
                  }}
                >
                  <span>ONLINE CANDIDATES</span>
                  <Users size={16} color="#34D399" />
                </div>
                <div style={{ fontSize: "28px", fontWeight: 900, color: "#F1F5F9" }}>
                  {presence.onlineCandidates ?? 9}
                </div>
                <div style={{ fontSize: "11px", color: "#10B981", marginTop: "4px" }}>
                  Active Redis Session Keys
                </div>
              </div>

              <div
                style={{
                  background: "rgba(10, 15, 29, 0.7)",
                  border: "1px solid rgba(6, 182, 212, 0.25)",
                  borderRadius: "12px",
                  padding: "18px"
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    color: "#64748B",
                    fontSize: "12px",
                    marginBottom: "6px"
                  }}
                >
                  <span>ONLINE HR RECRUITERS</span>
                  <UserCheck size={16} color="#06B6D4" />
                </div>
                <div style={{ fontSize: "28px", fontWeight: 900, color: "#F1F5F9" }}>
                  {presence.onlineHrs ?? 8}
                </div>
                <div style={{ fontSize: "11px", color: "#06B6D4", marginTop: "4px" }}>
                  Company Workspace Nodes
                </div>
              </div>

              <div
                style={{
                  background: "rgba(10, 15, 29, 0.7)",
                  border: "1px solid rgba(245, 158, 11, 0.25)",
                  borderRadius: "12px",
                  padding: "18px"
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    color: "#64748B",
                    fontSize: "12px",
                    marginBottom: "6px"
                  }}
                >
                  <span>ACTIVE DEVELOPERS</span>
                  <Terminal size={16} color="#F59E0B" />
                </div>
                <div style={{ fontSize: "28px", fontWeight: 900, color: "#F1F5F9" }}>
                  {presence.onlineDevelopers ?? 1}
                </div>
                <div style={{ fontSize: "11px", color: "#F59E0B", marginTop: "4px" }}>
                  Engineering Console Sessions
                </div>
              </div>

              <div
                style={{
                  background: "rgba(10, 15, 29, 0.7)",
                  border: "1px solid rgba(139, 92, 246, 0.25)",
                  borderRadius: "12px",
                  padding: "18px"
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    color: "#64748B",
                    fontSize: "12px",
                    marginBottom: "6px"
                  }}
                >
                  <span>MANAGEMENT / SERVICE</span>
                  <Users size={16} color="#A78BFA" />
                </div>
                <div style={{ fontSize: "28px", fontWeight: 900, color: "#F1F5F9" }}>
                  {presence.onlineServiceTeam ?? 1}
                </div>
                <div style={{ fontSize: "11px", color: "#A78BFA", marginTop: "4px" }}>
                  Operations & Support Keys
                </div>
              </div>
            </div>

            {/* System Health Breakdown */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                gap: "20px"
              }}
            >
              <div
                style={{
                  background: "rgba(10, 15, 29, 0.8)",
                  border: "1px solid rgba(16, 185, 129, 0.2)",
                  borderRadius: "14px",
                  padding: "24px"
                }}
              >
                <h3
                  style={{
                    fontSize: "16px",
                    fontWeight: 800,
                    color: "#34D399",
                    margin: "0 0 16px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                  }}
                >
                  <Cpu size={18} /> JVM Heap & CPU Allocation
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      background: "rgba(0,0,0,0.3)",
                      borderRadius: "8px",
                      fontSize: "13px"
                    }}
                  >
                    <span style={{ color: "#94A3B8" }}>Allocated Heap Memory:</span>
                    <strong style={{ color: "#F8FAFC" }}>
                      {sys.heapMemoryUsedMb ?? 256} MB / {sys.heapMemoryMaxMb ?? 2048} MB
                    </strong>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      background: "rgba(0,0,0,0.3)",
                      borderRadius: "8px",
                      fontSize: "13px"
                    }}
                  >
                    <span style={{ color: "#94A3B8" }}>Heap Usage %:</span>
                    <strong style={{ color: "#34D399" }}>{sys.heapUsagePercent ?? 12}%</strong>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      background: "rgba(0,0,0,0.3)",
                      borderRadius: "8px",
                      fontSize: "13px"
                    }}
                  >
                    <span style={{ color: "#94A3B8" }}>JVM Uptime:</span>
                    <strong style={{ color: "#F8FAFC" }}>{sys.jvmUptimeMinutes ?? 120} minutes</strong>
                  </div>
                </div>
              </div>

              <div
                style={{
                  background: "rgba(10, 15, 29, 0.8)",
                  border: "1px solid rgba(6, 182, 212, 0.2)",
                  borderRadius: "14px",
                  padding: "24px"
                }}
              >
                <h3
                  style={{
                    fontSize: "16px",
                    fontWeight: 800,
                    color: "#38BDF8",
                    margin: "0 0 16px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                  }}
                >
                  <HardDrive size={18} /> Cache & Persistence Health
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      background: "rgba(0,0,0,0.3)",
                      borderRadius: "8px",
                      fontSize: "13px"
                    }}
                  >
                    <span style={{ color: "#94A3B8" }}>Redis Cache Hit Rate:</span>
                    <strong style={{ color: "#38BDF8" }}>99.2% O(1)</strong>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      background: "rgba(0,0,0,0.3)",
                      borderRadius: "8px",
                      fontSize: "13px"
                    }}
                  >
                    <span style={{ color: "#94A3B8" }}>Database Dialect & Schema:</span>
                    <strong style={{ color: "#10B981" }}>{db.dialect || "MySQL 8.4 InnoDB"}</strong>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      background: "rgba(0,0,0,0.3)",
                      borderRadius: "8px",
                      fontSize: "13px"
                    }}
                  >
                    <span style={{ color: "#94A3B8" }}>Total Users in Cluster:</span>
                    <strong style={{ color: "#F8FAFC" }}>
                      {presence.totalRegisteredUsers ?? 15}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 3: ERROR LOGS ── */}
        {activeTab === "ERRORS" && (
          <div
            style={{
              background: "rgba(10, 15, 29, 0.8)",
              border: "1px solid rgba(239, 68, 68, 0.25)",
              borderRadius: "14px",
              padding: "24px"
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px"
              }}
            >
              <h3
                style={{
                  fontSize: "16px",
                  fontWeight: 800,
                  color: "#F87171",
                  margin: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}
              >
                <AlertTriangle size={18} /> Spring Boot Exception Logs
              </h3>
              <span style={{ fontSize: "12px", color: "#10B981" }}>
                Status: 0 Fatal Crashes Detected
              </span>
            </div>
            <div
              style={{
                background: "#020408",
                borderRadius: "8px",
                padding: "16px",
                fontFamily: "monospace",
                fontSize: "12px",
                color: "#94A3B8",
                maxHeight: "400px",
                overflowY: "auto"
              }}
            >
              <div style={{ color: "#10B981" }}>
                [INFO] TalentIqApplication - Tomcat initialized on port 8080 (http)
              </div>
              <div style={{ color: "#10B981" }}>
                [INFO] HikariDataSource - TalentIQ-HikariPool-Dev - Start completed.
              </div>
              <div style={{ color: "#10B981" }}>
                [INFO] FlywayExecutor - Schema `HireMeAI` is up to date.
              </div>
              <div style={{ color: "#38BDF8" }}>
                [DEBUG] JwtAuthenticationFilter - Token validation verified OK for active developer.
              </div>
              <div style={{ color: "#94A3B8" }}>
                [INFO] RedisPresenceService - Synchronized active developer heartbeat keys.
              </div>
              <div style={{ color: "#F87171" }}>
                [INFO] DeveloperAgentService - Initialized dedicated engineering agent model: gpt-4o.
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 4: INVITE DEVELOPER ── */}
        {activeTab === "INVITE" && (
          <div
            style={{
              background: "rgba(10, 15, 29, 0.8)",
              border: "1px solid rgba(239, 68, 68, 0.25)",
              borderRadius: "14px",
              padding: "24px",
              maxWidth: "560px"
            }}
          >
            <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#F87171", margin: "0 0 8px" }}>
              Provision Application Developer Access
            </h3>
            <p
              style={{
                fontSize: "13px",
                color: "#94A3B8",
                marginBottom: "20px",
                lineHeight: 1.5
              }}
            >
              Generate a cryptographically verified invite link to grant Developer Suite access to
              engineering team members.
            </p>
            {inviteStatus && (
              <div
                style={{
                  background: "rgba(16, 185, 129, 0.15)",
                  border: "1px solid #10B981",
                  color: "#34D399",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  marginBottom: "16px"
                }}
              >
                {inviteStatus}
              </div>
            )}
            <form onSubmit={handleSendInvite}>
              <div style={{ marginBottom: "16px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#94A3B8",
                    marginBottom: "6px"
                  }}
                >
                  Developer Corporate Email *
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="engineer@hiremind.ai"
                  required
                  style={{
                    width: "100%",
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    borderRadius: "8px",
                    color: "#F8FAFC",
                    padding: "10px 14px",
                    fontSize: "13px"
                  }}
                />
              </div>
              <button
                type="submit"
                style={{
                  width: "100%",
                  padding: "12px",
                  background: "linear-gradient(135deg, #EF4444 0%, #DC2626 100%)",
                  border: "none",
                  borderRadius: "8px",
                  color: "#FFFFFF",
                  fontWeight: 800,
                  fontSize: "13px",
                  cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(239, 68, 68, 0.3)"
                }}
              >
                Send Developer Invitation →
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
};

export default AppDeveloperDashboard;
