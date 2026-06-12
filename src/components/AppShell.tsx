import React from "react";
import { NavLink } from "react-router-dom";
import { 
  Inbox, 
  Bot, 
  GitBranch, 
  Users, 
  Sparkles, 
  Bug,
  LogOut,
  Sliders
} from "lucide-react";
import { client, POD_ID, ASSISTANT_NAME, API_URL } from "../lib/lemma";
import { useCurrentUser } from "lemma-sdk/react";

interface AppShellProps {
  children: React.ReactNode;
  title: string;
  description: string;
}

const NAV_ITEMS = [
  { to: "/triage", label: "Triage Intake", icon: Inbox },
  { to: "/issues", label: "Active Issues", icon: Bug },
  { to: "/assistant", label: "Copilot Chat", icon: Bot },
  { to: "/release", label: "Release Notes", icon: Sparkles },
  { to: "/team", label: "Pod Team", icon: Users },
];

export const AppShell: React.FC<AppShellProps> = ({ children, title, description }) => {
  const { user, isLoading } = useCurrentUser({ client });

  const handleLogout = async () => {
    try {
      await client.auth.signOut();
      // Force reload or redirect to check auth state
      window.location.reload();
    } catch (err) {
      console.error("Sign out failed", err);
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-logo">
            <GitBranch />
          </div>
          <div>
            <h1 className="sidebar-title">Lumina AI</h1>
            <span style={{ fontSize: "0.75rem", color: "hsl(var(--text-muted))" }}>Bug & Release Desk</span>
          </div>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
            >
              <item.icon style={{ width: "16px", height: "16px" }} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Sidebar Footer - Runtime Details */}
        <div className="sidebar-footer">
          <div className="glass-card" style={{ padding: "12px", fontSize: "0.75rem", backgroundColor: "rgba(3, 7, 18, 0.3)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px", fontWeight: 600 }}>
              <Sliders style={{ width: "12px", height: "12px", color: "hsl(var(--primary))" }} />
              <span>POD CONFIG</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <div>
                <span style={{ color: "hsl(var(--text-muted))" }}>Pod ID: </span>
                <span style={{ fontFamily: "monospace", color: "hsl(var(--primary))", wordBreak: "break-all" }}>{POD_ID.slice(0, 8)}...</span>
              </div>
              <div>
                <span style={{ color: "hsl(var(--text-muted))" }}>Copilot: </span>
                <span style={{ color: "hsl(var(--text-primary))" }}>{ASSISTANT_NAME}</span>
              </div>
              <div>
                <span style={{ color: "hsl(var(--text-muted))" }}>Server: </span>
                <span style={{ color: "hsl(var(--text-primary))" }}>{API_URL.replace("https://", "")}</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Viewport content */}
      <div className="main-viewport">
        <header className="main-header">
          <div className="header-title-section">
            <h1>{title}</h1>
            <p>{description}</p>
          </div>

          <div className="header-actions">
            {/* User Profile and Sign out */}
            {!isLoading && user && (
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                    {user.first_name ? `${user.first_name} ${user.last_name || ""}`.trim() : user.email.split("@")[0]}
                  </span>
                  <span style={{ fontSize: "0.75rem", color: "hsl(var(--text-muted))" }}>{user.email}</span>
                </div>
                <div 
                  style={{ 
                    width: "36px", 
                    height: "36px", 
                    borderRadius: "50%", 
                    backgroundColor: "hsl(var(--accent) / 0.2)", 
                    border: "1px solid hsl(var(--accent) / 0.5)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: "0.9rem",
                    color: "hsl(var(--text-primary))"
                  }}
                >
                  {(user.first_name || user.email || "O").substring(0, 1).toUpperCase()}
                </div>
                <button 
                  onClick={handleLogout}
                  className="btn btn-outline" 
                  style={{ padding: "8px", borderRadius: "8px" }}
                  title="Logout"
                >
                  <LogOut style={{ width: "16px", height: "16px" }} />
                </button>
              </div>
            )}
          </div>
        </header>

        <div className="main-content-scroll">
          <div className="animate-fade-in" style={{ height: "100%" }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
