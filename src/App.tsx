
import { Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { IntakePage } from "./pages/IntakePage";
import { IssuesPage } from "./pages/IssuesPage";
import { AssistantPage } from "./pages/AssistantPage";
import { ReleasePage } from "./pages/ReleasePage";
import { TeamPage } from "./pages/TeamPage";

function App() {
  return (
    <Routes>
      <Route
        path="/triage"
        element={
          <AppShell title="AI Triage Intake" description="Paste logs, emails, or messages to analyze and file bugs.">
            <IntakePage />
          </AppShell>
        }
      />
      <Route
        path="/issues"
        element={
          <AppShell title="Active Issues" description="Kanban board of tracked bugs, issues, and requests.">
            <IssuesPage />
          </AppShell>
        }
      />
      <Route
        path="/assistant"
        element={
          <AppShell title="Copilot Chat" description="Ask questions, reference code bases, or request issue updates.">
            <AssistantPage />
          </AppShell>
        }
      />
      <Route
        path="/release"
        element={
          <AppShell title="Release Notes" description="Compile release notes for closed done issues.">
            <ReleasePage />
          </AppShell>
        }
      />
      <Route
        path="/team"
        element={
          <AppShell title="Pod Team" description="View members and operators associated with this pod.">
            <TeamPage />
          </AppShell>
        }
      />
      <Route path="*" element={<Navigate to="/triage" replace />} />
    </Routes>
  );
}

export default App;
