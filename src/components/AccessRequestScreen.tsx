import React, { useState } from "react";
import { 
  ShieldAlert, 
  Settings, 
  ArrowRight, 
  Copy, 
  Check, 
  RefreshCw
} from "lucide-react";
import { usePodAccess } from "lemma-sdk/react";
import { client, POD_ID } from "../lib/lemma";

const DEFAULT_PODS = [
  {
    name: "Issue Tracker (Default)",
    id: "019daa51-1be6-71bc-ac34-7da96cd10c6a",
    desc: "Linear/Jira-style issue tracker recipe pod"
  },
  {
    name: "Linear Copy",
    id: "019daa7d-ad11-7039-a95f-5443203c7083",
    desc: "Linear-style product delivery workspace with AI copilot"
  },
  {
    name: "Triage Inbox",
    id: "019daa51-6b9c-71d2-8a70-46da8604fc07",
    desc: "Shared triage and incoming operations feedback queue"
  }
];

export const AccessRequestScreen: React.FC = () => {
  const { status, requestAccess, isRequestingAccess, error } = usePodAccess({ 
    client, 
    podId: POD_ID 
  });
  
  const [customPodId, setCustomPodId] = useState(POD_ID);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleSavePod = (id: string) => {
    if (id.trim()) {
      localStorage.setItem("lemma_pod_id", id.trim());
      window.location.reload();
    }
  };

  const handleCopy = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRequestAccess = async () => {
    try {
      await requestAccess();
      alert("Access request submitted successfully!");
    } catch (err) {
      console.error("Failed to request access", err);
    }
  };

  return (
    <div 
      style={{ 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center", 
        minHeight: "100vh", 
        padding: "20px",
        background: "radial-gradient(circle at 50% 0%, rgba(34, 211, 238, 0.08) 0%, transparent 45%), radial-gradient(circle at 100% 100%, rgba(139, 92, 246, 0.06) 0%, transparent 45%)"
      }}
    >
      <div 
        className="glass-card animate-fade-in" 
        style={{ 
          maxWidth: "480px", 
          width: "100%", 
          padding: "32px",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
          boxShadow: "var(--shadow)"
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
          <div 
            style={{ 
              width: "48px", 
              height: "48px", 
              borderRadius: "12px", 
              backgroundColor: "hsl(var(--warning) / 0.1)", 
              border: "1px solid hsl(var(--warning) / 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "hsl(var(--warning))"
            }}
          >
            <ShieldAlert style={{ width: "24px", height: "24px" }} />
          </div>
          <div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "hsl(var(--text-primary))" }}>
              Request Pod Access
            </h2>
            <p style={{ fontSize: "0.85rem", color: "hsl(var(--text-muted))", marginTop: "4px" }}>
              You are signed in, but you need access to this pod or configuration.
            </p>
          </div>
        </div>

        {/* Current Pod Status */}
        <div 
          style={{ 
            backgroundColor: "rgba(3, 7, 18, 0.4)", 
            padding: "16px", 
            borderRadius: "8px", 
            border: "1px solid hsl(var(--border-color))",
            display: "flex",
            flexDirection: "column",
            gap: "8px"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "hsl(var(--text-muted))" }}>
            <span>TARGETED POD:</span>
            <span style={{ 
              color: status === "member" ? "hsl(var(--success))" : "hsl(var(--warning))", 
              fontWeight: 600 
            }}>
              {status.toUpperCase()}
            </span>
          </div>
          <div style={{ fontFamily: "monospace", fontSize: "0.8rem", wordBreak: "break-all", color: "hsl(var(--text-primary))" }}>
            {POD_ID}
          </div>
          {error && (
            <div style={{ fontSize: "0.75rem", color: "hsl(var(--danger))", marginTop: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{ display: "inline-block", width: "4px", height: "4px", borderRadius: "50%", backgroundColor: "hsl(var(--danger))" }}></span>
              Error: {error.message || String(error)}
            </div>
          )}
        </div>

        {/* Request Access Button */}
        <button 
          onClick={handleRequestAccess} 
          disabled={isRequestingAccess}
          className="btn btn-primary"
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", width: "100%" }}
        >
          {isRequestingAccess ? (
            <>
              <RefreshCw className="spinner" style={{ width: "16px", height: "16px" }} />
              <span>Sending Request...</span>
            </>
          ) : (
            <>
              <span>Request Access to this Pod</span>
              <ArrowRight style={{ width: "16px", height: "16px" }} />
            </>
          )}
        </button>

        {/* Configuration Override */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Settings style={{ width: "14px", height: "14px", color: "hsl(var(--primary))" }} />
            <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "hsl(var(--text-muted))", letterSpacing: "0.05em" }}>
              CUSTOM POD OVERRIDE
            </span>
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Paste custom Pod ID (019da...)" 
              value={customPodId}
              onChange={(e) => setCustomPodId(e.target.value)}
              style={{ fontSize: "0.8rem", fontFamily: "monospace" }}
            />
            <button 
              onClick={() => handleSavePod(customPodId)}
              className="btn btn-outline"
              style={{ padding: "8px 16px", whiteSpace: "nowrap" }}
            >
              Apply
            </button>
          </div>
        </div>

        {/* Default Recipes Grid */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "hsl(var(--text-muted))", letterSpacing: "0.05em" }}>
            SWITCH TO POPULAR RECIPES
          </span>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {DEFAULT_PODS.map((pod) => (
              <div 
                key={pod.id}
                style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "space-between",
                  padding: "10px 12px",
                  borderRadius: "6px",
                  border: "1px solid hsl(var(--border-color))",
                  backgroundColor: "rgba(255, 255, 255, 0.01)"
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "2px", minWidth: 0, paddingRight: "8px" }}>
                  <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "hsl(var(--text-primary))", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {pod.name}
                  </span>
                  <span style={{ fontSize: "0.7rem", color: "hsl(var(--text-muted))", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {pod.id.substring(0, 8)}... ( {pod.desc} )
                  </span>
                </div>
                <div style={{ display: "flex", gap: "4px" }}>
                  <button
                    onClick={() => handleCopy(pod.id)}
                    className="btn btn-outline btn-sm"
                    style={{ padding: "4px 8px" }}
                    title="Copy ID"
                  >
                    {copiedId === pod.id ? <Check style={{ width: "12px", height: "12px", color: "hsl(var(--success))" }} /> : <Copy style={{ width: "12px", height: "12px" }} />}
                  </button>
                  <button
                    onClick={() => handleSavePod(pod.id)}
                    className="btn btn-primary btn-sm"
                    style={{ padding: "4px 8px", fontSize: "0.7rem" }}
                  >
                    Load
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
export default AccessRequestScreen;
