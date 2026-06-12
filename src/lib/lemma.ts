import { LemmaClient } from "lemma-sdk";

const browserStorage = typeof window !== "undefined" ? window.localStorage : null;

// Live Pod ID for the Issue Tracker recipe
export const POD_ID = browserStorage?.getItem("lemma_pod_id") || "019daa51-1be6-71bc-ac34-7da96cd10c6a";

export const API_URL = "https://api.lemma.work";
export const AUTH_URL = "https://auth.lemma.work";
export const ASSISTANT_NAME = "issue-copilot";

// Instantiate the LemmaClient
export const client = new LemmaClient({
  podId: POD_ID,
  apiUrl: API_URL,
  authUrl: AUTH_URL,
});
