import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, NavLink, useLocation } from "react-router-dom";
import Today from "./pages/Today";
import DayView from "./pages/DayView";
import WeekView from "./pages/WeekView";
import Todos from "./pages/Todos";
import WeekendSummary from "./pages/WeekendSummary";
import SprintSummaries from "./pages/SprintSummaries";
import ProjectConfig from "./pages/ProjectConfig";
import ProjectsDashboard from "./pages/ProjectsDashboard";
import ProjectDataView from "./pages/ProjectDataView";
import Activity from "./pages/Activity";
import { CopilotBlade } from "./components/CopilotBlade";

// ── Nav items ─────────────────────────────────────────────────────────────────

const NAV = [
  {
    group: "Daily",
    items: [
      { to: "/",       label: "Today",    icon: "◎" },
      { to: "/todos",  label: "Todos",    icon: "✓" },
      { to: "/day",    label: "Day",      icon: "▦" },
    ],
  },
  {
    group: "Sprint",
    items: [
      { to: "/week",    label: "Sprint",    icon: "⎇" },
      { to: "/sprints", label: "Summaries", icon: "≡" },
      { to: "/weekend", label: "Review",    icon: "◈" },
      { to: "/activity",label: "Activity",  icon: "⌁" },
    ],
  },
  {
    group: "Projects",
    items: [
      { to: "/projects/dashboard", label: "Dashboard", icon: "⊞" },
      { to: "/project",            label: "Config",     icon: "⚙" },
    ],
  },
];

// ── Sidebar ───────────────────────────────────────────────────────────────────

function Sidebar({ onCopilot }: { onCopilot: () => void }) {
  const location = useLocation();

  return (
    <aside
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "var(--sidebar-w)",
        height: "100vh",
        background: "var(--surface)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        zIndex: 30,
        overflow: "hidden",
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: "16px 16px 12px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span style={{ color: "var(--accent)", fontSize: 16, fontWeight: 700 }}>✦</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", letterSpacing: "-0.01em" }}>
          Process Dash
        </span>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: "auto", padding: "8px 8px" }}>
        {NAV.map((group) => (
          <div key={group.group} style={{ marginBottom: 4 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--text-3)",
                padding: "8px 8px 4px",
              }}
            >
              {group.group}
            </div>
            {group.items.map((item) => {
              const active =
                item.to === "/"
                  ? location.pathname === "/"
                  : location.pathname.startsWith(item.to);
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 8px",
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: active ? 500 : 400,
                    color: active ? "var(--text)" : "var(--text-2)",
                    background: active ? "var(--surface-2)" : "transparent",
                    textDecoration: "none",
                    transition: "background 0.1s, color 0.1s",
                    marginBottom: 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      (e.currentTarget as HTMLElement).style.background = "var(--surface-2)";
                      (e.currentTarget as HTMLElement).style.color = "var(--text)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      (e.currentTarget as HTMLElement).style.background = "transparent";
                      (e.currentTarget as HTMLElement).style.color = "var(--text-2)";
                    }
                  }}
                >
                  <span style={{ fontSize: 13, width: 16, textAlign: "center", flexShrink: 0 }}>
                    {item.icon}
                  </span>
                  {item.label}
                  {active && (
                    <span
                      style={{
                        marginLeft: "auto",
                        width: 4,
                        height: 4,
                        borderRadius: "50%",
                        background: "var(--accent)",
                        flexShrink: 0,
                      }}
                    />
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Copilot button */}
      <div style={{ padding: "8px", borderTop: "1px solid var(--border)" }}>
        <button
          onClick={onCopilot}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            width: "100%",
            padding: "8px 10px",
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 500,
            color: "var(--accent)",
            background: "var(--accent-bg)",
            border: "1px solid rgba(129,140,248,0.2)",
            cursor: "pointer",
            fontFamily: "inherit",
            transition: "opacity 0.15s",
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = "0.8")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = "1")}
          title="Open Copilot (⌘K)"
        >
          <span style={{ fontSize: 14 }}>✦</span>
          <span style={{ flex: 1, textAlign: "left" }}>Copilot</span>
          <kbd
            style={{
              fontSize: 10,
              background: "rgba(129,140,248,0.15)",
              border: "1px solid rgba(129,140,248,0.2)",
              borderRadius: 3,
              padding: "1px 4px",
              color: "var(--accent)",
              fontFamily: "inherit",
            }}
          >
            ⌘K
          </kbd>
        </button>
      </div>
    </aside>
  );
}

// ── Layout wrapper ────────────────────────────────────────────────────────────

function Layout({ children, onCopilot }: { children: React.ReactNode; onCopilot: () => void }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar onCopilot={onCopilot} />
      <main
        style={{
          marginLeft: "var(--sidebar-w)",
          flex: 1,
          minWidth: 0,
          overflowX: "hidden",
        }}
      >
        {children}
      </main>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────

function AppInner() {
  const [bladeOpen, setBladeOpen] = useState(false);

  // ⌘K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setBladeOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <Layout onCopilot={() => setBladeOpen(true)}>
      <Routes>
        <Route path="/"                    element={<Today />} />
        <Route path="/todos"               element={<Todos />} />
        <Route path="/day"                 element={<DayView />} />
        <Route path="/week"                element={<WeekView />} />
        <Route path="/activity"            element={<Activity />} />
        <Route path="/weekend"             element={<WeekendSummary />} />
        <Route path="/sprints"             element={<SprintSummaries />} />
        <Route path="/projects/dashboard"  element={<ProjectsDashboard />} />
        <Route path="/projects/:id/data"   element={<ProjectDataView />} />
        <Route path="/project"             element={<ProjectConfig />} />
      </Routes>
      <CopilotBlade open={bladeOpen} onClose={() => setBladeOpen(false)} />
    </Layout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  );
}
