import type { AssistantApi } from "../preload/preload";

declare global {
  interface Window {
    assistant: AssistantApi;
  }
}

export {};
