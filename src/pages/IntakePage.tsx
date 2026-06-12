import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Sparkles, 
  Check, 
  Terminal, 
  HelpCircle,
  FileText,
  AlertCircle,
  Clock,
  ArrowRight
} from "lucide-react";
import { client, ASSISTANT_NAME } from "../lib/lemma";
import { useConversationMessages, useCreateRecord } from "lemma-sdk/react";
import { usePodSchema } from "../hooks/usePodSchema";

// Predefined mock templates to test the AI Triage
const MOCK_TEMPLATES = [
  {
    title: "Safari Checkout Crash",
    icon: Terminal,
    text: "User report from Safari 17.4:\nWhenever I try to click the 'Pay Now' button at checkout, the page freezes and throws a TypeError: Cannot read properties of undefined (reading 'paymentMethodId') in checkout-flow.js line 242. This only happens on Safari, Chrome works fine. I'm trying to buy the premium subscription."
  },
  {
    title: "Feature: PDF Export",
    icon: FileText,
    text: "Request from customer support:\nSeveral enterprise accounts (specifically Acme Corp) are asking for a way to bulk export monthly invoices to PDF. Right now they have to print to PDF manually from the browser, which looks messy. Ideally, we should add an 'Export to PDF' button on the Billing History page."
  },
  {
    title: "Database Slowdown Alert",
    icon: AlertCircle,
    text: "Slack alert from Prometheus:\n[WARN] High DB connection pool saturation detected on prod-db-01. Average response time for GET /api/v1/workspace/records spiked to 4.2 seconds between 02:00 AM and 03:00 AM UTC. Looks like an unindexed query on referencing foreign keys."
  }
];

export const IntakePage: React.FC = () => {
  const navigate = useNavigate();
  const [inputText, setInputText] = useState("");
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  
  const schema = usePodSchema();

  // Suggested form fields (once AI parses output)
  const [suggestedFields, setSuggestedFields] = useState<{
    title: string;
    description: string;
    priority: "low" | "medium" | "high" | "urgent";
    reproduction_steps?: string;
    estimate: number;
    project_slug: string;
  } | null>(null);

  // Initialize Lemma's conversation hook
  const conversation = useConversationMessages({
    client,
    agentName: ASSISTANT_NAME,
    conversationId: activeThreadId,
    autoLoad: false,
    autoResume: true,
  });

  // Initialize Lemma's create record hook
  const { create, isSubmitting: isFiling, error: fileError } = useCreateRecord({
    client,
    tableName: schema.issuesTable,
    onSuccess: () => {
      console.log("Filing ticket successful, navigating to /issues");
      navigate("/issues");
    },
    onError: (err) => {
      console.error("Filing ticket failed with error:", err);
    }
  });

  const handleTriage = async () => {
    if (!inputText.trim()) return;
    
    setSuggestedFields(null);
    try {
      // Create a new triage conversation thread
      const thread = await conversation.createConversation({
        title: `Triage: ${inputText.trim().substring(0, 30)}...`,
        instructions: "You are a professional software engineering triage assistant. Analyze feedback and return structured JSON.",
        setActive: true,
      });
      
      setActiveThreadId(thread.id);

      const prompt = `You are Lumina Triage Copilot. Analyze the raw feedback below and extract:
1. Title: Short, concise summary (e.g. [Safari] Checkout throws TypeError)
2. Description: Clean formatting, including markdown bullets summarizing the issue
3. Priority: Suggest either low, medium, high, or urgent
4. Reproduction Steps: List of steps if applicable
5. Project Slug: Suggest a suitable category like "frontend", "backend", "database", or "general"

Output the structured output in a JSON code block exactly like this:
\`\`\`json
{
  "title": "...",
  "description": "...",
  "priority": "low" | "medium" | "high" | "urgent",
  "reproduction_steps": "...",
  "project_slug": "..."
}
\`\`\`
Make sure to output ONLY this JSON block.

Here is the feedback:
${inputText}`;

      await conversation.sendMessage(prompt, {
        conversationId: thread.id,
      });
    } catch (e) {
      console.error("Failed to start triage conversation:", e);
    }
  };

  // Listen for conversation end and try to parse JSON
  useEffect(() => {
    if (activeThreadId && !conversation.isRunning && conversation.outputText) {
      const text = conversation.outputText;
      // Extract json block from ```json ... ```
      const match = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/({[\s\S]*?})/);
      if (match) {
        try {
          const parsed = JSON.parse(match[1].trim());
          const parsedPriority = String(parsed.priority || "").toLowerCase();
          setSuggestedFields({
            title: parsed.title || "Triaged Issue",
            description: parsed.description || "",
            priority: ["low", "medium", "high", "urgent"].includes(parsedPriority) ? (parsedPriority as any) : "medium",
            reproduction_steps: parsed.reproduction_steps || "",
            estimate: 2, // Default story points
            project_slug: parsed.project_slug || "general"
          });
        } catch (err) {
          console.error("Failed to parse AI suggested JSON:", err);
        }
      }
    }
  }, [conversation.isRunning, conversation.outputText, activeThreadId]);

  const fileIssue = async () => {
    if (!suggestedFields) return;
    
    console.log("Attempting to file issue into table:", schema.issuesTable);
    
    // Generate a unique identifier like Lumina-101
    const randId = Math.floor(100 + Math.random() * 900);
    const issuePayload: Record<string, any> = {
      title: suggestedFields.title,
      description: suggestedFields.description + 
        (suggestedFields.reproduction_steps ? `\n\n### Reproduction Steps\n${suggestedFields.reproduction_steps}` : ""),
      priority: suggestedFields.priority,
      status: "backlog", // Default to backlog
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (schema.hasIdentifier) {
      issuePayload.identifier = `LUM-${randId}`;
    }
    if (schema.hasEstimate) {
      issuePayload.estimate = suggestedFields.estimate;
    }
    if (schema.hasProjectSlug) {
      issuePayload.project_slug = suggestedFields.project_slug;
    }

    console.log("Filing payload:", issuePayload);
    try {
      const result = await create(issuePayload);
      console.log("Create record result:", result);
    } catch (e) {
      console.error("Caught error in fileIssue call:", e);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div className="triage-grid">
        {/* Left Side: Feedback Intake */}
        <div className="triage-input-panel">
          <div className="glass-card">
            <h2 className="card-title" style={{ display: "flex", alignSelf: "center", gap: "8px" }}>
              <Terminal style={{ color: "hsl(var(--primary))", width: "20px", height: "20px" }} />
              Feedback Intake
            </h2>
            <p className="card-description">
              Paste raw bug logs, Slack support channels, or emails. Lumina's AI Copilot will classify it instantly.
            </p>

            {/* Template Buttons */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
              {MOCK_TEMPLATES.map((tmpl, idx) => (
                <button
                  key={idx}
                  onClick={() => setInputText(tmpl.text)}
                  className="btn btn-outline"
                  style={{ fontSize: "0.75rem", padding: "6px 12px", borderRadius: "20px" }}
                  id={`template-btn-${idx}`}
                >
                  <tmpl.icon style={{ width: "12px", height: "12px", color: "hsl(var(--accent))" }} />
                  {tmpl.title}
                </button>
              ))}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="feedback-text">Raw Feedback Log</label>
              <textarea
                id="feedback-text"
                rows={12}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Paste customer complaints, traceback logs, or Slack transcripts here..."
                className="form-textarea"
                style={{ fontSize: "0.85rem", lineHeight: "1.5" }}
              />
            </div>

            <button
              onClick={handleTriage}
              disabled={conversation.isRunning || !inputText.trim()}
              className="btn btn-primary"
              style={{ width: "100%" }}
              id="run-triage-btn"
            >
              <Sparkles style={{ width: "16px", height: "16px" }} />
              {conversation.isRunning ? "AI Triaging Feedback..." : "Analyze & Triage Feedback"}
            </button>
          </div>
        </div>

        {/* Right Side: Preview & Triage Stream */}
        <div className="triage-preview-panel">
          {/* AI Thinking Stream */}
          {conversation.isRunning && (
            <div className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <h3 style={{ fontSize: "0.9rem", color: "hsl(var(--primary))", display: "flex", alignItems: "center", gap: "8px" }}>
                <Clock className="animate-pulse" style={{ width: "14px", height: "14px" }} />
                Copilot is triaging...
              </h3>
              <div 
                style={{ 
                  maxHeight: "150px", 
                  overflowY: "auto", 
                  fontSize: "0.8rem", 
                  color: "hsl(var(--text-muted))", 
                  fontFamily: "monospace",
                  backgroundColor: "rgba(0,0,0,0.2)",
                  padding: "10px",
                  borderRadius: "8px"
                }}
              >
                {conversation.outputText || "Reading raw logs..."}
              </div>
            </div>
          )}

          {/* Triaged Form Preview */}
          {suggestedFields ? (
            <div className="glass-card animate-fade-in" style={{ borderColor: "hsl(var(--primary) / 0.3)" }}>
              <h2 className="card-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Check style={{ color: "hsl(var(--success))", width: "20px", height: "20px" }} />
                Suggested Issue Draft
              </h2>
              <p className="card-description">
                AI suggested issue classification. You can customize the fields before filing the ticket.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="triage-title">Issue Title</label>
                  <input
                    id="triage-title"
                    type="text"
                    value={suggestedFields.title}
                    onChange={(e) => setSuggestedFields({ ...suggestedFields, title: e.target.value })}
                    className="form-input"
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: schema.hasProjectSlug ? "1fr 1fr" : "1fr", gap: "12px" }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="triage-priority">Priority</label>
                    <select
                      id="triage-priority"
                      value={suggestedFields.priority}
                      onChange={(e) => setSuggestedFields({ ...suggestedFields, priority: e.target.value as any })}
                      className="form-select"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>

                  {schema.hasProjectSlug && (
                    <div className="form-group">
                      <label className="form-label" htmlFor="triage-project">Project Scope</label>
                      <select
                        id="triage-project"
                        value={suggestedFields.project_slug}
                        onChange={(e) => setSuggestedFields({ ...suggestedFields, project_slug: e.target.value })}
                        className="form-select"
                      >
                        <option value="frontend">Frontend</option>
                        <option value="backend">Backend</option>
                        <option value="database">Database</option>
                        <option value="general">General</option>
                      </select>
                    </div>
                  )}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: schema.hasEstimate ? "1fr 1fr" : "1fr", gap: "12px" }}>
                  {schema.hasEstimate && (
                    <div className="form-group">
                      <label className="form-label" htmlFor="triage-estimate">Estimate (Points)</label>
                      <input
                        id="triage-estimate"
                        type="number"
                        min={1}
                        max={13}
                        value={suggestedFields.estimate}
                        onChange={(e) => setSuggestedFields({ ...suggestedFields, estimate: parseInt(e.target.value) || 1 })}
                        className="form-input"
                      />
                    </div>
                  )}
                  <div className="form-group">
                    <label className="form-label">Triage status</label>
                    <span style={{ 
                      padding: "8px 12px", 
                      fontSize: "0.85rem",
                      backgroundColor: "rgba(255,255,255,0.03)", 
                      border: "1px solid hsl(var(--border-color))",
                      borderRadius: "8px", 
                      color: "hsl(var(--success))",
                      fontWeight: 600,
                      display: "block"
                    }}>
                      ✓ Backlog Ready
                    </span>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="triage-desc">Description</label>
                  <textarea
                    id="triage-desc"
                    rows={4}
                    value={suggestedFields.description}
                    onChange={(e) => setSuggestedFields({ ...suggestedFields, description: e.target.value })}
                    className="form-textarea"
                    style={{ fontSize: "0.85rem" }}
                  />
                </div>

                {suggestedFields.reproduction_steps && (
                  <div className="form-group">
                    <label className="form-label" htmlFor="triage-repro">Reproduction Steps</label>
                    <textarea
                      id="triage-repro"
                      rows={3}
                      value={suggestedFields.reproduction_steps}
                      onChange={(e) => setSuggestedFields({ ...suggestedFields, reproduction_steps: e.target.value })}
                      className="form-textarea"
                      style={{ fontSize: "0.85rem" }}
                    />
                  </div>
                )}

                {fileError && (
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "12px",
                    backgroundColor: "rgba(239, 68, 68, 0.1)",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    borderRadius: "8px",
                    color: "#f87171",
                    fontSize: "0.85rem",
                    marginTop: "10px",
                    lineHeight: "1.4"
                  }}>
                    <AlertCircle style={{ width: "16px", height: "16px", flexShrink: 0, color: "#ef4444" }} />
                    <div style={{ flex: 1, wordBreak: "break-word" }}>
                      <strong>Filing failed:</strong> {fileError.message}
                    </div>
                  </div>
                )}

                <button
                  onClick={fileIssue}
                  disabled={isFiling}
                  className="btn btn-primary"
                  style={{ width: "100%", marginTop: "10px" }}
                  id="file-bug-btn"
                >
                  {isFiling ? "Filing Ticket..." : "Approve & File Ticket"}
                  <ArrowRight style={{ width: "16px", height: "16px" }} />
                </button>
              </div>
            </div>
          ) : (
            !conversation.isRunning && (
              <div className="glass-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", minHeight: "350px", borderStyle: "dashed" }}>
                <HelpCircle style={{ width: "48px", height: "48px", color: "hsl(var(--text-muted) / 0.5)", marginBottom: "16px" }} />
                <h3 style={{ marginBottom: "8px", color: "hsl(var(--text-muted))" }}>Waiting for Feedback</h3>
                <p style={{ fontSize: "0.8rem", color: "hsl(var(--text-muted))", textAlign: "center", maxWidth: "250px" }}>
                  Paste feedback on the left and click 'Analyze' to generate suggested issue fields.
                </p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};
