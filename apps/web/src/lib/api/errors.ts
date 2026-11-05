export class ApiError extends Error {
  constructor(
    readonly code: string,
    readonly retryable: boolean,
    readonly status = 0,
  ) {
    super(code);
  }
}

// Friendly text per C1 error code. Never show server messages to users (CLAUDE.md §5.7).
const MESSAGES: Record<string, string> = {
  NETWORK: "We couldn't reach Handshake. Check your connection and try again.",
  NEXCONN_TOKEN_ERROR: "Chat is having trouble starting. Please try again in a moment.",
  UNAUTHORIZED: "Your session ended. Please sign in again.",
  VALIDATION_ERROR: "Something in the form isn't right. Please check it and try again.",
  LISTING_NOT_FOUND: "This listing isn't available any more.",
  FORBIDDEN: "You can't change this. It belongs to someone else.",
  CASE_NOT_FOUND: "We couldn't find this help request.",
  CHAT_NOT_FOUND: "This chat isn't available any more.",
};

export function friendlyMessage(e: unknown): string {
  const code = e instanceof ApiError ? e.code : "UNKNOWN";
  return MESSAGES[code] ?? "Something went wrong on our side. Please try again.";
}
