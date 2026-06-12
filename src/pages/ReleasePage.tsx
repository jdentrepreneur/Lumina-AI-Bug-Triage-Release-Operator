import React, { useState, useEffect, useMemo } from "react";
import { 
  Sparkles, 
  CheckSquare, 
  Copy, 
  Download, 
  RefreshCw, 
  FileCheck,
  Cpu,
  Clock
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { client, ASSISTANT_NAME } from "../lib/lemma";
import { useRecords, useConversationMessages, useConversations } from "lemma-sdk/react";
import { usePodSchema } from "../hooks/usePodSchema";

export const ReleasePage: React.FC = () => {
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [releaseNotesText, setReleaseNotesText] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);

  const schema = usePodSchema();

  // Fetch issues (we will filter client-side for safety)
  const { records: allIssues, isLoading: isLoadingIssues } = useRecords({
    client,
    tableName: schema.issuesTable,
    limit: 100,
    sortBy: "updated_at",
    order: "desc"
  });

  const completedIssues = useMemo(() => {
    if (!allIssues) return [];
    return allIssues.filter(issue => String(issue.status).toLowerCase() === "done");
  }, [allIssues]);

  // Manage all conversation sessions for issue-copilot
  const conversationsState = useConversations({
    client,
    agentName: ASSISTANT_NAME,
  });

  // Setup Lemma agent conversation for release generation
  const conversation = useConversationMessages({
    client,
    agentName: ASSISTANT_NAME,
    conversationId: activeThreadId,
    autoLoad: false,
    autoResume: true,
  });

  const handleGenerateReleaseNotes = async () => {
    if (completedIssues.length === 0) return;

    setReleaseNotesText("");
    try {
      // Create a new release generation thread using conversationsState
      const thread = await conversationsState.createConversation({
        title: `Release Notes Generator`,
        instructions: "You are a product management assistant. Write beautiful, engaging Release Notes in markdown.",
      });

      setActiveThreadId(thread.id);

      const issuesList = completedIssues
        .map((issue, idx) => `${idx + 1}. **${String(issue.identifier || issue.id)}**: ${String(issue.title)} - ${String(issue.description || "No description provided")}`)
        .join("\n");

      const prompt = `Write a professional, structured Release Notes document for the following completed tasks. Categorize them into Highlights (new features), Performance Upgrades, and Bug Fixes:

${issuesList}

Ensure the formatting is clean, includes bullet points, uses bolding, and is written in an exciting, developer-friendly tone. Formatting should be in Markdown.`;

      await conversation.sendMessage(prompt, {
        conversationId: thread.id,
      });
    } catch (e) {
      console.error("Failed to generate release notes:", e);
    }
  };

  // Sync the generated text once the streaming ends
  useEffect(() => {
    if (activeThreadId && !conversation.isRunning && conversation.outputText) {
      setReleaseNotesText(conversation.outputText);
    }
  }, [conversation.isRunning, conversation.outputText, activeThreadId]);

  // Copy to clipboard helper
  const handleCopy = async () => {
    const textToCopy = releaseNotesText || conversation.outputText;
    if (!textToCopy) return;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  };

  // Trigger file download helper
  const handleDownload = () => {
    const textToDownload = releaseNotesText || conversation.outputText;
    if (!textToDownload) return;

    const blob = new Blob([textToDownload], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `release-notes-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const currentOutput = conversation.streamingText || conversation.outputText || releaseNotesText;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div className="triage-grid">
        {/* Left Side: Resolved Issues List */}
        <div className="triage-input-panel">
          <div className="glass-card">
            <h2 className="card-title" style={{ display: "flex", alignSelf: "center", gap: "8px" }}>
              <CheckSquare style={{ color: "hsl(var(--success))", width: "20px", height: "20px" }} />
              Completed Issues Queue
            </h2>
            <p className="card-description">
              Select finished work items to package into the next deployment release notes.
            </p>

            {isLoadingIssues ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
                <RefreshCw className="animate-spin" style={{ width: "24px", height: "24px", color: "hsl(var(--primary))" }} />
              </div>
            ) : completedIssues.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "400px", overflowY: "auto", marginBottom: "20px" }}>
                {completedIssues.map((issue) => (
                  <div 
                    key={String(issue.id)} 
                    style={{ 
                      padding: "12px", 
                      borderRadius: "8px", 
                      border: "1px solid hsl(var(--border-color))",
                      backgroundColor: "rgba(255, 255, 255, 0.02)",
                      display: "flex",
                      alignItems: "center",
                      gap: "12px"
                    }}
                  >
                    <div style={{ 
                      width: "18px", 
                      height: "18px", 
                      borderRadius: "4px", 
                      backgroundColor: "hsl(var(--success-bg))",
                      border: "1px solid hsl(var(--success) / 0.3)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "hsl(var(--success))",
                      fontSize: "0.7rem",
                      fontWeight: 700
                    }}>
                      ✓
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "hsl(var(--text-primary))", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                        {String(issue.title)}
                      </div>
                      <span style={{ fontSize: "0.7rem", fontFamily: "monospace", color: "hsl(var(--primary))" }}>
                        {String(issue.identifier || issue.id)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ 
                padding: "40px 12px", 
                textAlign: "center", 
                fontSize: "0.8rem", 
                color: "hsl(var(--text-muted))",
                border: "1px dashed hsl(var(--border-color))",
                borderRadius: "8px",
                marginBottom: "20px"
              }}>
                No completed issues found in this pod. Move some issues to 'Done' on the Issues board to see them here!
              </div>
            )}

            <button
              onClick={handleGenerateReleaseNotes}
              disabled={completedIssues.length === 0 || conversation.isRunning}
              className="btn btn-primary"
              style={{ width: "100%" }}
              id="generate-release-btn"
            >
              <Sparkles style={{ width: "16px", height: "16px" }} />
              {conversation.isRunning ? "AI Compiling Release Notes..." : "Compile AI Release Notes"}
            </button>
          </div>
        </div>

        {/* Right Side: Generated Release Notes Viewport */}
        <div className="triage-preview-panel">
          <div className="glass-card" style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: "450px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "between", borderBottom: "1px solid hsl(var(--border-color))", paddingBottom: "12px", marginBottom: "16px", width: "100%" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <FileCheck style={{ color: "hsl(var(--primary))", width: "20px", height: "20px" }} />
                <h2 className="card-title" style={{ margin: 0 }}>Drafted Notes</h2>
              </div>
              
              {/* Copy / Download buttons */}
              {currentOutput && (
                <div style={{ display: "flex", gap: "8px", marginLeft: "auto" }}>
                  <button 
                    onClick={handleCopy}
                    className="btn btn-outline" 
                    style={{ padding: "6px 10px", fontSize: "0.75rem" }}
                    title="Copy Markdown"
                    id="copy-release-notes-btn"
                  >
                    {copySuccess ? "Copied!" : <Copy style={{ width: "14px", height: "14px" }} />}
                  </button>
                  <button 
                    onClick={handleDownload}
                    className="btn btn-outline" 
                    style={{ padding: "6px 10px", fontSize: "0.75rem" }}
                    title="Download File"
                    id="download-release-notes-btn"
                  >
                    <Download style={{ width: "14px", height: "14px" }} />
                  </button>
                </div>
              )}
            </div>

            {/* Display notes content */}
            <div style={{ flex: 1, overflowY: "auto", fontSize: "0.85rem", lineHeight: "1.6", color: "hsl(var(--text-primary))" }}>
              {conversation.isRunning && !conversation.outputText && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "12px" }}>
                  <Clock className="animate-spin" style={{ width: "24px", height: "24px", color: "hsl(var(--primary))" }} />
                  <span style={{ fontSize: "0.8rem", color: "hsl(var(--text-muted))" }}>AI is preparing release summary...</span>
                </div>
              )}

              {currentOutput ? (
                <div className="markdown-body animate-fade-in" style={{ padding: "4px" }}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {currentOutput}
                  </ReactMarkdown>
                </div>
              ) : (
                !conversation.isRunning && (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", border: "1px dashed hsl(var(--border-color))", borderRadius: "8px", padding: "40px 10px" }}>
                    <Cpu style={{ width: "40px", height: "40px", color: "hsl(var(--text-muted) / 0.5)", marginBottom: "16px" }} />
                    <h3 style={{ fontSize: "0.9rem", color: "hsl(var(--text-muted))", marginBottom: "8px" }}>No Notes Compiled</h3>
                    <p style={{ fontSize: "0.75rem", color: "hsl(var(--text-muted))", textAlign: "center", maxWidth: "250px" }}>
                      Compile release notes on the left to see the AI's summary of bug fixes and enhancements.
                    </p>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
