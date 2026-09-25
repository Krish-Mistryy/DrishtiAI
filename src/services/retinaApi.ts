/**
 * Retinal Analysis API Client
 *
 * Typed, browser-safe client for the server-side Gemini analysis endpoint.
 * Handles timeouts, retries with exponential backoff, and structured errors.
 *
 * SECURITY: No API keys or provider secrets are used here.
 * All calls go through /api/* which Vite proxies to the Express server.
 */

import {
  DiagnosisResult,
  AnalysisError,
  AnalysisErrorCode,
} from '../types';

// ── Configuration ────────────────────────────────────────────────────────
const FETCH_TIMEOUT_MS = 35_000;  // slightly longer than server-side 30s
const MAX_RETRIES = 2;
const BASE_BACKOFF_MS = 1_500;

// ── Error helpers ────────────────────────────────────────────────────────
function makeError(
  code: AnalysisErrorCode,
  message: string,
  retryable = true,
): AnalysisError {
  return { code, message, retryable };
}

function classifyFetchError(err: unknown): AnalysisError {
  if (err instanceof DOMException && err.name === 'AbortError') {
    return makeError('TIMEOUT', 'Request timed out. The AI service may be under heavy load.');
  }
  if (err instanceof TypeError) {
    // fetch() TypeError usually means network failure
    return makeError('NETWORK', 'Unable to reach the analysis server. Check your connection.');
  }
  const msg = err instanceof Error ? err.message : 'Unknown error';
  return makeError('UNKNOWN', msg);
}

async function parseErrorBody(response: Response): Promise<AnalysisError> {
  try {
    const body = await response.json();
    if (body.error && body.message) {
      return makeError(
        body.error as AnalysisErrorCode,
        body.message,
        body.retryable ?? false,
      );
    }
  } catch {
    // body wasn't JSON
  }

  // Fallback mapping by status code
  if (response.status === 408 || response.status === 504) {
    return makeError('TIMEOUT', 'Analysis timed out. Please retry.');
  }
  if (response.status === 429) {
    return makeError('RATE_LIMITED', 'Rate limit reached. Please wait a moment.');
  }
  if (response.status >= 400 && response.status < 500) {
    return makeError('INVALID_IMAGE', `Server rejected the request (HTTP ${response.status}).`, false);
  }
  return makeError('SERVER_ERROR', `Server error (HTTP ${response.status}).`);
}

// ── Core fetch with timeout ──────────────────────────────────────────────
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs = FETCH_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const existing = options.signal;

  // Merge external + timeout signals
  if (existing) {
    existing.addEventListener('abort', () => controller.abort());
  }
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ── Single-eye analysis ──────────────────────────────────────────────────
async function analyzeSingleEye(
  imageUrl: string,
  eye: 'Right (OD)' | 'Left (OS)',
  signal?: AbortSignal,
): Promise<DiagnosisResult> {
  let lastError: AnalysisError = makeError('UNKNOWN', 'Analysis did not complete.');

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      // Exponential backoff: 1.5s, 3s
      const delay = BASE_BACKOFF_MS * Math.pow(2, attempt - 1);
      await new Promise((r) => setTimeout(r, delay));
    }

    try {
      const response = await fetchWithTimeout(
        '/api/analyze-retina',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl, eye }),
          signal,
        },
      );

      if (!response.ok) {
        lastError = await parseErrorBody(response);
        if (!lastError.retryable) throw lastError;
        continue; // retry
      }

      const data: DiagnosisResult = await response.json();

      // Validate critical fields
      if (typeof data.confidence !== 'number' || typeof data.diagnosis !== 'string') {
        lastError = makeError('SERVER_ERROR', 'AI returned malformed output.');
        continue;
      }

      return data;
    } catch (err) {
      if ((err as AnalysisError).code) {
        lastError = err as AnalysisError;
        if (!lastError.retryable) throw lastError;
      } else {
        lastError = classifyFetchError(err);
        if (!lastError.retryable) throw lastError;
      }
    }
  }

  throw lastError; // all retries exhausted
}

// ── Public API ───────────────────────────────────────────────────────────

/**
 * Analyze both eyes. Returns { od, os, analyzedAt }.
 * Throws AnalysisError on unrecoverable failure.
 */
export async function analyzeRetina(
  odImageUrl: string,
  osImageUrl: string,
  signal?: AbortSignal,
): Promise<{ od: DiagnosisResult; os: DiagnosisResult; analyzedAt: string }> {
  const [od, os] = await Promise.all([
    analyzeSingleEye(odImageUrl, 'Right (OD)', signal),
    analyzeSingleEye(osImageUrl, 'Left (OS)', signal),
  ]);

  return {
    od,
    os,
    analyzedAt: new Date().toISOString(),
  };
}

/**
 * Check if the API server is reachable and configured.
 */
export async function checkApiHealth(): Promise<{
  ok: boolean;
  modelId?: string;
  hasApiKey?: boolean;
  error?: string;
}> {
  try {
    const response = await fetchWithTimeout('/api/health', {}, 5_000);
    if (!response.ok) return { ok: false, error: `HTTP ${response.status}` };
    const data = await response.json();
    return {
      ok: data.status === 'ok' && data.hasApiKey === true,
      modelId: data.modelId,
      hasApiKey: data.hasApiKey,
    };
  } catch (err) {
    const parsed = classifyFetchError(err);
    return { ok: false, error: parsed.message };
  }
}

export async function sendSmsReferral(mobile: string, message: string): Promise<{ success: boolean; deliveredTo: string }> {
  try {
    const res = await fetch('/api/send-sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile, message }),
    });

    if (!res.ok) {
      throw new Error(`SMS gateway error: ${res.status}`);
    }

    const data = await res.json();
    return data;
  } catch (err: unknown) {
    const errMessage = err instanceof Error ? err.message : 'Unknown network error';
    throw new Error(errMessage);
  }
}

export type { AnalysisError };
