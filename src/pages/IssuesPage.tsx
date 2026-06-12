import React, { useState, useMemo } from "react";
import { 
  Search, 
  RefreshCw
} from "lucide-react";
import { client } from "../lib/lemma";
import { useRecords, useUpdateRecord } from "lemma-sdk/react";
import { usePodSchema } from "../hooks/usePodSchema";
import { IssueDetailPage } from "./IssueDetailPage";

const COLUMNS = [
  { status: "backlog", label: "Backlog" },
  { status: "todo", label: "To Do" },
  { status: "in_progress", label: "In Progress" },
  { status: "in_review", label: "In Review" },
  { status: "done", label: "Done" }
];

export const IssuesPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);

  // Drag and drop states
  const [activeDragCol, setActiveDragCol] = useState<string | null>(null);
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);

  const schema = usePodSchema();

  // Fetch issues from Lemma
  const { records: issues, isLoading, error, refresh } = useRecords({
    client,
    tableName: schema.issuesTable,
    limit: 100,
    sortBy: "updated_at",
    order: "desc"
  });

  // Setup update record hook for changing status via drag and drop
  const { update: updateIssueStatus } = useUpdateRecord({
    client,
    tableName: schema.issuesTable
  });

  const handleDragStart = (e: React.DragEvent, issueId: string) => {
    setDraggedCardId(issueId);
    e.dataTransfer.setData("text/plain", issueId);
  };

  const handleDragEnd = () => {
    setDraggedCardId(null);
    setActiveDragCol(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragEnter = (status: string) => {
    setActiveDragCol(status);
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    const issueId = e.dataTransfer.getData("text/plain");
    if (!issueId) return;

    const issueToUpdate = issues.find((i) => String(i.id) === issueId);
    if (!issueToUpdate || String(issueToUpdate.status).toLowerCase() === targetStatus.toLowerCase()) return;

    try {
      await updateIssueStatus({ status: targetStatus }, { recordId: issueId });
      refresh();
    } catch (err) {
      console.error("Failed to update status on drop:", err);
    }
  };

  // Filter issues based on search and selected options
  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      const title = String(issue.title || "").toLowerCase();
      const identifier = schema.hasIdentifier 
        ? String(issue.identifier || "").toLowerCase() 
        : String(issue.id || "").toLowerCase();
      const query = searchQuery.toLowerCase();
      
      const matchesSearch = title.includes(query) || identifier.includes(query);
      const matchesPriority = priorityFilter === "all" || String(issue.priority).toLowerCase() === priorityFilter.toLowerCase();
      const matchesProject = !schema.hasProjectSlug || projectFilter === "all" || String(issue.project_slug || "general").toLowerCase() === projectFilter.toLowerCase();

      return matchesSearch && matchesPriority && matchesProject;
    });
  }, [issues, searchQuery, priorityFilter, projectFilter, schema]);

  // Group issues by status
  const columnsData = useMemo(() => {
    const grouped: Record<string, typeof issues> = {
      backlog: [],
      todo: [],
      in_progress: [],
      in_review: [],
      done: []
    };

    filteredIssues.forEach((issue) => {
      const status = String(issue.status || "backlog").toLowerCase();
      if (grouped[status]) {
        grouped[status].push(issue);
      } else {
        grouped.backlog.push(issue);
      }
    });

    return grouped;
  }, [filteredIssues]);

  const getPriorityBadgeClass = (priority: string) => {
    switch (String(priority).toLowerCase()) {
      case "low": return "badge-low";
      case "medium": return "badge-medium";
      case "high": return "badge-high";
      case "urgent": return "badge-urgent";
      default: return "badge-low";
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Top Filter Bar */}
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
              type="text"
              placeholder="Search issues..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
              style={{ paddingLeft: "36px" }}
              id="issues-search-input"
            />
          </div>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="form-select"
            style={{ width: "140px" }}
            id="priority-filter-select"
          >
            <option value="all">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>

          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="form-select"
            style={{ width: "140px" }}
            id="project-filter-select"
          >
            <option value="all">All Scopes</option>
            <option value="frontend">Frontend</option>
            <option value="backend">Backend</option>
            <option value="database">Database</option>
            <option value="general">General</option>
          </select>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button 
            onClick={() => refresh()}
            className="btn btn-outline" 
            style={{ padding: "10px" }}
            disabled={isLoading}
            id="refresh-issues-btn"
          >
            <RefreshCw className={isLoading ? "animate-spin" : ""} style={{ width: "16px", height: "16px" }} />
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="glass-card" style={{ borderColor: "hsl(var(--danger) / 0.3)", backgroundColor: "hsl(var(--danger-bg))" }}>
          <p style={{ color: "hsl(var(--danger))", fontSize: "0.9rem" }}>
            Failed to fetch issues: {error.message}. Please verify Pod configuration.
          </p>
        </div>
      )}

      {/* Kanban Board */}
      {isLoading ? (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "300px" }}>
          <RefreshCw className="animate-spin" style={{ width: "32px", height: "32px", color: "hsl(var(--primary))" }} />
        </div>
      ) : (
        <div className="kanban-board">
          {COLUMNS.map((col) => {
            const list = columnsData[col.status] || [];
            return (
              <div 
                key={col.status} 
                className={`kanban-column ${activeDragCol === col.status ? "drag-over" : ""}`}
                onDragOver={handleDragOver}
                onDragEnter={() => handleDragEnter(col.status)}
                onDrop={(e) => handleDrop(e, col.status)}
              >
                <div className="kanban-column-header">
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span 
                      style={{ 
                        width: "8px", 
                        height: "8px", 
                        borderRadius: "50%", 
                        backgroundColor: `var(--badge-${col.status}, hsl(var(--text-muted)))` 
                      }}
                      className={`badge-${col.status}`}
                    />
                    <h3 className="column-title">{col.label}</h3>
                  </div>
                  <span className="column-count">{list.length}</span>
                </div>

                <div className="kanban-cards">
                  {list.length > 0 ? (
                    list.map((issue) => (
                      <div 
                        key={String(issue.id)} 
                        onClick={() => setSelectedIssueId(String(issue.id))}
                        className={`kanban-card ${draggedCardId === String(issue.id) ? "dragging" : ""}`}
                        id={`issue-card-${schema.hasIdentifier ? issue.identifier : issue.id}`}
                        draggable={true}
                        onDragStart={(e) => handleDragStart(e, String(issue.id))}
                        onDragEnd={handleDragEnd}
                      >
                        <div className="kanban-card-title">{String(issue.title)}</div>
                        <div className="kanban-card-meta">
                          <span className="kanban-card-id">
                            {schema.hasIdentifier ? String(issue.identifier) : String(issue.id).substring(0, 8).toUpperCase()}
                          </span>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            {schema.hasEstimate && !!issue.estimate && (
                              <span style={{ 
                                fontSize: "0.7rem", 
                                color: "hsl(var(--text-muted))",
                                border: "1px solid hsl(var(--border-color))",
                                borderRadius: "4px",
                                padding: "2px 4px",
                                fontFamily: "monospace"
                              }}>
                                {String(issue.estimate)}
                              </span>
                            )}
                            <span className={`badge ${getPriorityBadgeClass(String(issue.priority))}`}>
                              {String(issue.priority)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ 
                      padding: "24px 12px", 
                      textAlign: "center", 
                      fontSize: "0.75rem", 
                      color: "hsl(var(--text-muted))",
                      border: "1px dashed hsl(var(--border-color))",
                      borderRadius: "8px"
                    }}>
                      No issues
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Details Slide Sheet overlay */}
      {selectedIssueId && (
        <IssueDetailPage 
          recordId={selectedIssueId} 
          onClose={() => {
            setSelectedIssueId(null);
            refresh();
          }} 
        />
      )}
    </div>
  );
};
