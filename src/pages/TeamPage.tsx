import React, { useState, useMemo } from "react";
import { 
  Users, 
  Mail, 
  Shield, 
  UserCheck, 
  Calendar,
  Search,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  UserPlus
} from "lucide-react";
import { client } from "../lib/lemma";
import { useMembers } from "lemma-sdk/react";

export const TeamPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const { members, isLoading, error, refresh } = useMembers({
    client,
    limit: 50
  });

  const filteredMembers = useMemo(() => {
    if (!members) return [];
    return members.filter((member) => {
      const name = String(member.user_name || "").toLowerCase();
      const email = String(member.email || member.user_email || "").toLowerCase();
      const query = searchQuery.toLowerCase();
      const role = String(member.role || "").toUpperCase();

      const matchesSearch = name.includes(query) || email.includes(query);
      const matchesRole = roleFilter === "all" || role === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [members, searchQuery, roleFilter]);

  const getRoleIcon = (role: string) => {
    switch (role.toUpperCase()) {
      case "POD_ADMIN":
        return <ShieldAlert style={{ width: "16px", height: "16px", color: "hsl(var(--danger))" }} />;
      case "POD_EDITOR":
        return <ShieldCheck style={{ width: "16px", height: "16px", color: "hsl(var(--primary))" }} />;
      case "POD_USER":
        return <UserCheck style={{ width: "16px", height: "16px", color: "hsl(var(--success))" }} />;
      default:
        return <Shield style={{ width: "16px", height: "16px", color: "hsl(var(--text-muted))" }} />;
    }
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role.toUpperCase()) {
      case "POD_ADMIN":
        return "badge-high";
      case "POD_EDITOR":
        return "badge-medium";
      case "POD_USER":
        return "badge-low";
      default:
        return "badge-low";
    }
  };

  const formatRoleLabel = (role: string) => {
    return role.replace("POD_", "").toUpperCase();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Top filter and actions bar */}
      <div 
        className="glass-card" 
        style={{ 
          display: "flex", 
          flexWrap: "wrap", 
          alignItems: "center", 
          justifyContent: "space-between", 
          gap: "16px",
          padding: "16px 24px"
        }}
      >
        <div style={{ display: "flex", flex: 1, gap: "12px", minWidth: "280px" }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Search 
              style={{ 
                position: "absolute", 
                left: "12px", 
                top: "50%", 
                transform: "translateY(-50%)", 
                width: "16px", 
                height: "16px", 
                color: "hsl(var(--text-muted))" 
              }} 
            />
            <input 
              id="team-search-input"
              type="text" 
              className="form-input" 
              placeholder="Search team members by name or email..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: "38px" }}
            />
          </div>
          <select 
            id="team-role-filter"
            className="form-input" 
            style={{ width: "160px" }}
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">All Roles</option>
            <option value="POD_ADMIN">Admin</option>
            <option value="POD_EDITOR">Editor</option>
            <option value="POD_USER">User</option>
            <option value="POD_VIEWER">Viewer</option>
          </select>
        </div>

        <div style={{ display: "flex", gap: "12px" }}>
          <button 
            id="team-refresh-btn"
            onClick={() => refresh()} 
            className="btn btn-outline" 
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
          >
            <RefreshCw style={{ width: "16px", height: "16px" }} />
            <span>Sync</span>
          </button>
          <button 
            id="team-invite-btn"
            className="btn btn-primary" 
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
            onClick={() => alert("To invite team members, configure pod-level invitations in the Lemma Console.")}
          >
            <UserPlus style={{ width: "16px", height: "16px" }} />
            <span>Invite Member</span>
          </button>
        </div>
      </div>

      {/* Main Grid View */}
      {isLoading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}>
          <div className="spinner"></div>
        </div>
      ) : error ? (
        <div className="glass-card" style={{ padding: "24px", textAlign: "center", border: "1px solid hsl(var(--danger) / 0.3)" }}>
          <p style={{ color: "hsl(var(--danger))", marginBottom: "12px" }}>Failed to load team members.</p>
          <button onClick={() => refresh()} className="btn btn-outline btn-sm">Try Again</button>
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="glass-card" style={{ padding: "48px 24px", textAlign: "center" }}>
          <Users style={{ width: "48px", height: "48px", color: "hsl(var(--text-muted))", marginBottom: "16px", opacity: 0.5 }} />
          <p style={{ color: "hsl(var(--text-muted))" }}>No team members match your filters.</p>
        </div>
      ) : (
        <div 
          style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", 
            gap: "20px" 
          }}
        >
          {filteredMembers.map((member) => {
            const displayName = member.user_name || member.email?.split("@")[0] || "Operator";
            const email = member.email || member.user_email || "no-email@lemma.work";
            const initials = displayName.substring(0, 2).toUpperCase();
            
            return (
              <div 
                key={member.pod_member_id}
                className="glass-card animate-fade-in"
                style={{ 
                  padding: "24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                  position: "relative",
                  overflow: "hidden"
                }}
              >
                {/* Background Accent Glow for Admin / Editors */}
                {member.role === "POD_ADMIN" && (
                  <div 
                    style={{ 
                      position: "absolute", 
                      top: 0, 
                      right: 0, 
                      width: "80px", 
                      height: "80px", 
                      background: "radial-gradient(circle, hsl(var(--danger) / 0.15) 0%, transparent 70%)",
                      pointerEvents: "none"
                    }}
                  />
                )}

                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  {/* Avatar */}
                  <div 
                    style={{ 
                      width: "48px", 
                      height: "48px", 
                      borderRadius: "12px", 
                      background: member.role === "POD_ADMIN" 
                        ? "linear-gradient(135deg, hsl(var(--danger) / 0.2), hsl(var(--accent) / 0.2))"
                        : "linear-gradient(135deg, hsl(var(--primary) / 0.2), hsl(var(--accent) / 0.2))",
                      border: member.role === "POD_ADMIN"
                        ? "1px solid hsl(var(--danger) / 0.3)"
                        : "1px solid hsl(var(--primary) / 0.3)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      color: "hsl(var(--text-primary))"
                    }}
                  >
                    {initials}
                  </div>

                  {/* Profile info */}
                  <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
                    <h3 
                      style={{ 
                        fontSize: "1rem", 
                        fontWeight: 600, 
                        whiteSpace: "nowrap", 
                        overflow: "hidden", 
                        textOverflow: "ellipsis",
                        color: "hsl(var(--text-primary))"
                      }}
                    >
                      {displayName}
                    </h3>
                    <span 
                      style={{ 
                        fontSize: "0.8rem", 
                        color: "hsl(var(--text-muted))",
                        whiteSpace: "nowrap", 
                        overflow: "hidden", 
                        textOverflow: "ellipsis",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        marginTop: "2px"
                      }}
                    >
                      <Mail style={{ width: "12px", height: "12px" }} />
                      {email}
                    </span>
                  </div>
                </div>

                {/* Divider */}
                <div style={{ height: "1px", backgroundColor: "hsl(var(--border-color))" }} />

                {/* Details / Meta */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span 
                    className={`badge ${getRoleBadgeClass(member.role)}`}
                    style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                  >
                    {getRoleIcon(member.role)}
                    {formatRoleLabel(member.role)}
                  </span>

                  <span 
                    style={{ 
                      fontSize: "0.75rem", 
                      color: "hsl(var(--text-muted))", 
                      display: "flex", 
                      alignItems: "center", 
                      gap: "6px" 
                    }}
                  >
                    <Calendar style={{ width: "12px", height: "12px" }} />
                    Joined {new Date(member.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
