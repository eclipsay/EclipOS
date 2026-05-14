import type { AssistantApi } from "../preload/preload.cts";

declare global {
  interface Window {
    assistant: AssistantApi;
  }
}
