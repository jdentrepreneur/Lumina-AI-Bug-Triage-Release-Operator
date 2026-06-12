import { useMemo } from "react";
import { useTables } from "lemma-sdk/react";
import { client } from "../lib/lemma";

export interface PodSchema {
  issuesTable: string;
  commentsTable: string;
  commentsForeignKey: string;
  hasIdentifier: boolean;
  hasEstimate: boolean;
  hasProjectSlug: boolean;
  isLoading: boolean;
}

export function usePodSchema(): PodSchema {
  const { tables, isLoading } = useTables({ client });

  return useMemo(() => {
    if (isLoading || !tables) {
      return {
        issuesTable: "issues",
        commentsTable: "comments",
        commentsForeignKey: "issue_id",
        hasIdentifier: true,
        hasEstimate: true,
        hasProjectSlug: true,
        isLoading: true,
      };
    }

    // Check if "issues" table exists
    const hasIssuesTable = tables.some((t) => t.name === "issues");
    
    const issuesTable = hasIssuesTable ? "issues" : "tasks";
    const commentsTable = hasIssuesTable ? "comments" : "task_comments";
    const commentsForeignKey = hasIssuesTable ? "issue_id" : "task_id";

    // Find the target table schema to check columns
    const targetTable = tables.find((t) => t.name === issuesTable);
    const columns = targetTable?.columns || [];

    const hasIdentifier = columns.some((c) => c.name === "identifier");
    const hasEstimate = columns.some((c) => c.name === "estimate");
    const hasProjectSlug = columns.some((c) => c.name === "project_slug");

    return {
      issuesTable,
      commentsTable,
      commentsForeignKey,
      hasIdentifier,
      hasEstimate,
      hasProjectSlug,
      isLoading: false,
    };
  }, [tables, isLoading]);
}
