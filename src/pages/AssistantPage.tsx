import React, { useState, useRef, useEffect } from "react";
import { 
  Bot, 
  MessageSquare, 
  Send, 
  Plus, 
  RefreshCw,
  User,
  Cpu
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { client, ASSISTANT_NAME } from "../lib/lemma";
import { useConversations, useConversationMessages, useRecords } from "lemma-sdk/react";
import { usePodSchema } from "../hooks/usePodSchema";

function isRecord(value: any): value is Record<string, any> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function extractTextFromStructuredContentEntry(entry: any): string {
  if (typeof entry === "string") return entry.trim();
  if (!isRecord(entry)) return "";
  
  const type = typeof entry.type === "string" ? entry.type.toLowerCase() : "";
  if (type.includes("reasoning") || type.includes("thinking") || type.includes("thought")) {
    return "";
  }
  
  if (typeof entry.text === "string") return entry.text.trim();
  if (typeof entry.content === "string") return entry.content.trim();
  if (typeof entry.value === "string") return entry.value.trim();
  if (Array.isArray(entry.content)) {
    const nested = entry.content
      .map((child: any) => extractTextFromStructuredContentEntry(child))
      .filter((text: string) => text.length > 0)
      .join("\n")
      .trim();
    if (nested.length > 0) return nested;
  }
  if (Array.isArray(entry.summary)) {
    const summary = entry.summary
      .map((child: any) => extractTextFromStructuredContentEntry(child))
      .filter((text: string) => text.length > 0)
      .join("\n")
      .trim();
    if (summary.length > 0) return summary;
  }
  return "";
}

function extractConversationMessageText(content: any): string {
  if (!content) return "";
  
  if (isRecord(content)) {
    const type = typeof content.type === "string" ? content.type.toLowerCase() : "";
    if (type.includes("reasoning") || type.includes("thinking") || type.includes("thought")) {
      return "";
    }
  }

  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    return content
      .map((entry: any) => extractTextFromStructuredContentEntry(entry))
      .filter((text: string) => text.length > 0)
      .join("\n\n")
      .trim();
  }
  if (!isRecord(content)) return "";
  const directContent = content.content;
  
  if (isRecord(directContent)) {
    const type = typeof directContent.type === "string" ? directContent.type.toLowerCase() : "";
    if (type.includes("reasoning") || type.includes("thinking") || type.includes("thought")) {
      return "";
    }
  }

  if (typeof directContent === "string") return directContent.trim();
  if (Array.isArray(directContent)) {
    const text = directContent
      .map((entry: any) => extractTextFromStructuredContentEntry(entry))
      .filter((entry: string) => entry.length > 0)
      .join("\n\n")
      .trim();
    if (text.length > 0) return text;
  }
  if (typeof content.text === "string") return content.text.trim();
  return extractTextFromStructuredContentEntry(content);
}

export const AssistantPage: React.FC = () => {
  const [inputMessage, setInputMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Manage all conversation sessions for issue-copilot
  const conversationsState = useConversations({
    client,
    agentName: ASSISTANT_NAME,
  });

  const schema = usePodSchema();

  // Fetch pod issues/tasks to provide as context to the agent
  const { records: issues } = useRecords({
    client,
    tableName: schema.issuesTable,
    limit: 100,
    enabled: !schema.isLoading
  });

  // Manage messages for the selected session
  const messagesState = useConversationMessages({
    client,
    agentName: ASSISTANT_NAME,
    conversationId: conversationsState.effectiveSelectedConversationId,
    autoLoad: true,
    autoResume: true,
  });

  // Scroll to bottom when new messages arrive or when streaming
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesState.messages, messagesState.streamingText]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || messagesState.isRunning) return;

    const currentMsg = inputMessage.trim();
    setInputMessage("");

    try {
      // If there is no active conversation, create one first
      let activeId = conversationsState.effectiveSelectedConversationId;
      if (!activeId) {
        const newConv = await conversationsState.createConversation({
          title: `Chat Session`,
        });
        activeId = newConv.id;
      }

      // Check if the query is related to tasks/issues/bug database
      const isQueryingDb = /tasks|issues|bug|ticket|summarize|list|status|safari|backlog|checkout|crash/i.test(currentMsg);
      
      let prompt = currentMsg;
      if (isQueryingDb && issues && issues.length > 0) {
        // Format the database records as readable text context
        const contextString = issues.map((issue) => {
          return `- ID: ${issue.identifier || issue.id}, Title: ${issue.title}, Status: ${issue.status}, Priority: ${issue.priority}, Description: ${issue.description || 'N/A'}`;
        }).join("\n");
        
        prompt = `[Database Context: Current issues in the pod:\n${contextString}]\n\nUser Question: ${currentMsg}`;
      }
      
      await messagesState.sendMessage(prompt, {
        conversationId: activeId
      });
    } catch (e) {
      console.error("Failed to send message:", e);
    }
  };

  const handleNewChat = async () => {
    try {
      await conversationsState.createConversation({
        title: `Chat Session ${conversationsState.conversations.length + 1}`,
      });
    } catch (e) {
      console.error("Failed to start new chat:", e);
    }
  };

  return (
    <div 
      className="glass-card animate-fade-in" 
      style={{ 
        display: "grid", 
        gridTemplateColumns: "260px 1fr", 
        padding: 0,
        height: "calc(100vh - 140px)",
        overflow: "hidden"
      }}
    >
      {/* Left Rail: Conversations History */}
      <div 
        style={{ 
          borderRight: "1px solid hsl(var(--border-color))",
          display: "flex", 
          flexDirection: "column",
          height: "100%",
          backgroundColor: "rgba(3, 7, 18, 0.2)",
          minHeight: 0
        }}
      >
        <div style={{ padding: "16px", borderBottom: "1px solid hsl(var(--border-color))" }}>
          <button 
            onClick={handleNewChat}
            className="btn btn-primary" 
            style={{ width: "100%" }}
            id="new-chat-btn"
          >
            <Plus style={{ width: "16px", height: "16px" }} />
            New Chat Session
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "12px 8px" }}>
          {conversationsState.isLoading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "20px" }}>
              <RefreshCw className="animate-spin" style={{ width: "18px", height: "18px", color: "hsl(var(--primary))" }} />
            </div>
          ) : conversationsState.conversations.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {conversationsState.conversations.map((conv) => {
                const isSelected = conversationsState.effectiveSelectedConversationId === conv.id;
                return (
                  <button
                    key={conv.id}
                    onClick={() => conversationsState.selectConversation(conv.id)}
                    className="btn"
                    style={{
                      justifyContent: "flex-start",
                      fontSize: "0.8rem",
                      padding: "10px 12px",
                      borderRadius: "6px",
                      backgroundColor: isSelected ? "rgba(255, 255, 255, 0.05)" : "transparent",
                      color: isSelected ? "hsl(var(--text-primary))" : "hsl(var(--text-muted))",
                      border: isSelected ? "1px solid hsl(var(--border-color))" : "none",
                      width: "100%",
                      textAlign: "left",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      display: "block"
                    }}
                    id={`chat-item-${conv.id}`}
                  >
                    <MessageSquare style={{ width: "12px", height: "12px", marginRight: "8px", display: "inline" }} />
                    {conv.title || "Chat Session"}
                  </button>
                );
              })}
            </div>
          ) : (
            <div style={{ 
              textAlign: "center", 
              fontSize: "0.75rem", 
              color: "hsl(var(--text-muted))",
              padding: "20px 10px"
            }}>
              No conversations. Click New Chat.
            </div>
          )}
        </div>
      </div>

      {/* Right Pane: Messages Viewport */}
      <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0, overflow: "hidden" }}>
        {/* Chat Header */}
        <div 
          style={{ 
            padding: "16px 24px", 
            borderBottom: "1px solid hsl(var(--border-color))",
            display: "flex",
            alignItems: "center",
            gap: "10px"
          }}
        >
          <div 
            style={{ 
              width: "36px", 
              height: "36px", 
              borderRadius: "8px", 
              backgroundColor: "hsl(var(--primary) / 0.1)",
              border: "1px solid hsl(var(--primary) / 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <Bot style={{ width: "18px", height: "18px", color: "hsl(var(--primary))" }} />
          </div>
          <div>
            <h3 style={{ fontSize: "0.95rem", color: "hsl(var(--text-primary))", fontWeight: 600 }}>Triage Copilot</h3>
            <span style={{ fontSize: "0.7rem", color: "hsl(var(--text-muted))" }}>Backed by issue-copilot agent</span>
          </div>
        </div>

        {/* Message Stream */}
        <div className="chat-messages">
          {messagesState.isLoading && messagesState.messages.length === 0 ? (
            <div style={{ display: "flex", flex: 1, justifyContent: "center", alignItems: "center" }}>
              <RefreshCw className="animate-spin" style={{ width: "24px", height: "24px", color: "hsl(var(--primary))" }} />
            </div>
          ) : (
            <>
              {/* Default Welcome Message */}
              {messagesState.messages.length === 0 && (
                <div className="chat-bubble ai">
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 600, fontSize: "0.8rem", color: "hsl(var(--primary))" }}>
                    <Cpu style={{ width: "12px", height: "12px" }} />
                    <span>Lumina Assistant</span>
                  </div>
                  <p>
                    Hello! I am your Triage and Engineering Copilot. You can ask me to write code specs, investigate bug reports, list tickets in the pod, or generate release summaries. How can I help you today?
                  </p>
                </div>
              )}

              {/* Chat Message History */}
              {messagesState.messages.map((msg) => {
                const isUser = String(msg.role).toLowerCase() === "user";
                let textContent = extractConversationMessageText(msg.content);
                
                // Skip empty messages (e.g. tool execution steps that don't output text)
                if (!textContent.trim()) return null;

                // Strip database context from user bubble display for clean aesthetics
                if (isUser && textContent.includes("User Question: ")) {
                  const parts = textContent.split("User Question: ");
                  textContent = parts[parts.length - 1];
                }
                
                return (
                  <div 
                    key={String(msg.id)} 
                    className={`chat-bubble ${isUser ? "user" : "ai"}`}
                  >
                    <div style={{ 
                      display: "flex", 
                      alignItems: "center", 
                      gap: "6px", 
                      fontWeight: 600, 
                      fontSize: "0.8rem", 
                      color: isUser ? "hsl(var(--primary))" : "hsl(var(--accent))" 
                    }}>
                      {isUser ? (
                        <>
                          <User style={{ width: "12px", height: "12px" }} />
                          <span>You</span>
                        </>
                      ) : (
                        <>
                          <Cpu style={{ width: "12px", height: "12px" }} />
                          <span>Copilot</span>
                        </>
                      )}
                    </div>
                    <div style={{ overflowX: "auto" }}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {textContent}
                      </ReactMarkdown>
                    </div>
                  </div>
                );
              })}

              {/* Streaming Content */}
              {messagesState.isStreaming && messagesState.streamingText && (
                <div className="chat-bubble ai">
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 600, fontSize: "0.8rem", color: "hsl(var(--accent))" }}>
                    <Cpu style={{ width: "12px", height: "12px" }} />
                    <span>Copilot (thinking...)</span>
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {messagesState.streamingText}
                    </ReactMarkdown>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Chat Input */}
        <form onSubmit={handleSendMessage} className="chat-input-area">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={messagesState.isRunning ? "Copilot is typing..." : "Ask a question about bugs, specs, or release notes..."}
            disabled={messagesState.isRunning}
            className="chat-input"
            id="chat-message-input"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || messagesState.isRunning}
            className="btn btn-primary"
            id="chat-send-btn"
          >
            <Send style={{ width: "16px", height: "16px" }} />
          </button>
        </form>
      </div>
    </div>
  );
};
