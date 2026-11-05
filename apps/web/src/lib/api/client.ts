import { ApiErrorResponseSchema, type ApiErrorDetail } from "@convocart/contracts";
import type { z } from "zod";
import { ApiError } from "./errors";

export { ApiError, friendlyMessage } from "./errors";

const BASE = process.env.NEXT_PUBLIC_API_URL;

type Options<S extends z.ZodTypeAny> = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string;
  schema: S;
};

/** Calls our server (C3), validates the response against its contract schema, and throws ApiError on any failure. */
export async function api<S extends z.ZodTypeAny>(path: string, opts: Options<S>): Promise<z.infer<S>> {
  const method = opts.method ?? "GET";
  if (!BASE) throw new ApiError("NETWORK", true); // NEXT_PUBLIC_API_URL must point at the server

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        ...(opts.body !== undefined && { "Content-Type": "application/json" }),
        ...(opts.token && { Authorization: `Bearer ${opts.token}` }),
      },
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    });
  } catch {
    throw new ApiError("NETWORK", true);
  }

  const json: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const err = ApiErrorResponseSchema.safeParse(json);
    const detail: ApiErrorDetail = err.success
      ? err.data.error
      : { code: "UNKNOWN", message: "", retryable: res.status >= 500 };
    throw new ApiError(detail.code, detail.retryable, res.status);
  }
  const parsed = opts.schema.safeParse(json);
  if (!parsed.success) throw new ApiError("BAD_RESPONSE", true, res.status);
  return parsed.data;
}
