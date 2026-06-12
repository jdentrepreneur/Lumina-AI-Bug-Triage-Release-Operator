import React, { useState, useEffect } from "react";
import { 
  X, 
  MessageSquare, 
  Send, 
  Clock, 
  User
} from "lucide-react";
import { client } from "../lib/lemma";
import { 
  useRecord, 
  useUpdateRecord, 
  useReferencingRecords, 
  useCreateRecord 
} from "lemma-sdk/react";
import { usePodSchema } from "../hooks/usePodSchema";

interface IssueDetailPageProps {
  recordId: string;
  onClose: () => void;
}

const STATUSES = ["backlog", "todo", "in_progress", "in_review", "done"];

export const IssueDetailPage: React.FC<IssueDetailPageProps> = ({ recordId, onClose }) => {
  const schema = usePodSchema();

  // Fetch issue details
  const { record: issue, isLoading, refresh: refreshIssue } = useRecord({
    client,
    tableName: schema.issuesTable,
    recordId,
    enabled: Boolean(recordId)
  });

  // Setup update record hook
  const { update: updateIssue, isSubmitting: isUpdating, error: updateError } = useUpdateRecord({
    client,
    tableName: schema.issuesTable,
    recordId
  });

  // Fetch comments linked to this issue
  const commentsState = useReferencingRecords({
    client,
    table: schema.commentsTable,
    foreignKey: schema.commentsForeignKey,
    recordId,
    enabled: Boolean(recordId),
    sortBy: "created_at",
    order: "asc"
  });

  // Setup create comment hook
  const { create: createComment, isSubmitting: isPostingComment, error: commentError } = useCreateRecord({
    client,
    tableName: schema.commentsTable
  });

  // Local form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [estimate, setEstimate] = useState(2);
  const [projectSlug, setProjectSlug] = useState("general");
  const [newComment, setNewComment] = useState("");

  // Sync database issue details with local form state
  useEffect(() => {
    if (issue) {
      setTitle(String(issue.title || ""));
      setDescription(String(issue.description || ""));
      setPriority((["low", "medium", "high", "urgent"].includes(String(issue.priority)) ? issue.priority : "medium") as any);
      setEstimate(Number(issue.estimate ?? 2));
      setProjectSlug(String(issue.project_slug || "general"));
    }
  }, [issue]);

  // Handle status update
  const handleStatusChange = async (status: string) => {
    if (!issue) return;
    try {
      await updateIssue({ status });
      refreshIssue();
    } catch (e) {
      console.error("Failed to update status", e);
    }
  };

  // Handle general save
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: Record<string, any> = {
        title,
        description,
        priority,
        updated_at: new Date().toISOString()
      };
      if (schema.hasEstimate) {
        payload.estimate = estimate;
      }
      if (schema.hasProjectSlug) {
        payload.project_slug = projectSlug;
      }
      await updateIssue(payload);
      refreshIssue();
    } catch (e) {
      console.error("Failed to save changes", e);
    }
  };

  // Handle posting a comment
  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    try {
      const commentPayload: Record<string, any> = {
        body: newComment.trim(),
        created_at: new Date().toISOString()
      };
      commentPayload[schema.commentsForeignKey] = recordId;
      await createComment(commentPayload);
      setNewComment("");
      commentsState.refresh();
    } catch (e) {
      console.error("Failed to add comment", e);
    }
  };

  const formatTime = (isoString?: unknown) => {
    if (!isoString || typeof isoString !== "string") return "just now";
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="slide-sheet-overlay" onClick={onClose} id="slide-sheet-overlay">
      <div className="slide-sheet animate-slide-in" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="slide-sheet-header">
          <div>
            <span style={{ 
              fontFamily: "monospace", 
              fontSize: "0.8rem", 
              color: "hsl(var(--primary))",
              fontWeight: 600
            }}>
              {issue ? (schema.hasIdentifier ? String(issue.identifier) : String(issue.id).substring(0, 8).toUpperCase()) : "LUM-XXX"}
            </span>
            <h2 style={{ fontSize: "1.1rem", color: "hsl(var(--text-primary))", marginTop: "4px" }}>
              Issue Details
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="btn btn-outline" 
            style={{ padding: "6px", borderRadius: "50%" }}
            id="close-details-btn"
          >
            <X style={{ width: "16px", height: "16px" }} />
          </button>
        </div>

        {/* Content Body */}
        <div className="slide-sheet-body">
          {isLoading || !issue ? (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "200px" }}>
              <Clock className="animate-spin" style={{ width: "24px", height: "24px", color: "hsl(var(--primary))" }} />
            </div>
          ) : (
            <>
              {/* Lifecycle Status Flow */}
              <div className="glass-card" style={{ padding: "12px", backgroundColor: "rgba(0, 0, 0, 0.15)" }}>
                <div style={{ display: "flex", gap: "6px" }}>
                  {STATUSES.map((st) => {
                    const isActive = String(issue.status).toLowerCase() === st.toLowerCase();
                    return (
                      <button
                        key={st}
                        onClick={() => handleStatusChange(st)}
                        className="btn"
                        style={{
                          flex: 1,
                          fontSize: "0.75rem",
                          padding: "6px 4px",
                          borderRadius: "6px",
                          backgroundColor: isActive 
                            ? `hsl(var(--primary))` 
                            : "rgba(255,255,255,0.03)",
                          color: isActive ? "#fff" : "hsl(var(--text-muted))",
                          border: isActive ? "none" : "1px solid hsl(var(--border-color))",
                          fontWeight: isActive ? 600 : 400
                        }}
                        id={`status-btn-${st}`}
                      >
                        {st.replace("_", " ")}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Edit Form */}
              <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="edit-title">Title</label>
                  <input
                    id="edit-title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: schema.hasProjectSlug ? "1fr 1fr" : "1fr", gap: "12px" }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="edit-priority">Priority</label>
                    <select
                      id="edit-priority"
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as any)}
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
                      <label className="form-label" htmlFor="edit-project">Scope</label>
                      <select
                        id="edit-project"
                        value={projectSlug}
                        onChange={(e) => setProjectSlug(e.target.value)}
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

                {schema.hasEstimate && (
                  <div className="form-group">
                    <label className="form-label" htmlFor="edit-estimate">Story Estimate (Points)</label>
                    <input
                      id="edit-estimate"
                      type="number"
                      min={1}
                      max={13}
                      value={estimate}
                      onChange={(e) => setEstimate(parseInt(e.target.value) || 1)}
                      className="form-input"
                    />
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label" htmlFor="edit-desc">Description</label>
                  <textarea
                    id="edit-desc"
                    rows={6}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="form-textarea"
                    style={{ fontSize: "0.85rem", lineHeight: "1.5" }}
                  />
                </div>

                {updateError && (
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "10px",
                    backgroundColor: "rgba(239, 68, 68, 0.1)",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    borderRadius: "8px",
                    color: "#f87171",
                    fontSize: "0.8rem",
                    width: "100%",
                    lineHeight: "1.4"
                  }}>
                    <span style={{ color: "#ef4444", fontWeight: "bold" }}>⚠</span>
                    <div style={{ flex: 1, wordBreak: "break-word" }}>
                      Failed to save changes: {updateError.message}
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isUpdating}
                  className="btn btn-primary"
                  style={{ alignSelf: "flex-end" }}
                  id="save-issue-btn"
                >
                  {isUpdating ? "Saving..." : "Save Changes"}
                </button>
              </form>

              {/* Comments Section */}
              <div className="comments-section">
                <h3 style={{ 
                  fontSize: "0.85rem", 
                  color: "hsl(var(--text-muted))", 
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: "12px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}>
                  <MessageSquare style={{ width: "14px", height: "14px" }} />
                  Discussion ({commentsState.records.length})
                </h3>

                {/* Comments List */}
                <div className="comments-list">
                  {commentsState.records.length > 0 ? (
                    commentsState.records.map((c) => (
                      <div key={String(c.id)} className="comment-bubble">
                        <div className="comment-meta">
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 600 }}>
                            <User style={{ width: "12px", height: "12px", color: "hsl(var(--accent))" }} />
                            <span>Developer</span>
                          </div>
                          <span>{formatTime(c.created_at)}</span>
                        </div>
                        <div style={{ color: "hsl(var(--text-primary))", fontSize: "0.8rem", whiteSpace: "pre-wrap" }}>
                          {String(c.body)}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p style={{ fontSize: "0.8rem", color: "hsl(var(--text-muted))", padding: "12px 0", textAlign: "center" }}>
                      No comments yet. Start the conversation!
                    </p>
                  )}
                </div>

                {commentError && (
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 10px",
                    backgroundColor: "rgba(239, 68, 68, 0.1)",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    borderRadius: "8px",
                    color: "#f87171",
                    fontSize: "0.75rem",
                    marginBottom: "8px",
                    lineHeight: "1.4"
                  }}>
                    <span style={{ color: "#ef4444", fontWeight: "bold" }}>⚠</span>
                    <div style={{ flex: 1, wordBreak: "break-word" }}>
                      Failed to add comment: {commentError.message}
                    </div>
                  </div>
                )}

                {/* Add Comment Input */}
                <div className="comment-input-row">
                  <textarea
                    rows={1}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="form-textarea"
                    style={{ fontSize: "0.8rem", height: "38px", minHeight: "38px" }}
                    id="new-comment-textarea"
                  />
                  <button
                    onClick={handleAddComment}
                    disabled={isPostingComment || !newComment.trim()}
                    className="btn btn-primary"
                    style={{ padding: "0 14px", height: "38px" }}
                    id="submit-comment-btn"
                  >
                    <Send style={{ width: "14px", height: "14px" }} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
