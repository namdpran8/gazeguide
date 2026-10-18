import {config} from '../config';
import {ExplainRequest, ExplainResponse} from '../types/lesson';

let activeController: AbortController | null = null;
let requestInProgress = false;

export class ApiError extends Error {
  statusCode?: number;
  errorCode?: string;
  isTimeout: boolean;
  isNetworkError: boolean;

  constructor(
    message: string,
    options?: {
      statusCode?: number;
      errorCode?: string;
      isTimeout?: boolean;
      isNetworkError?: boolean;
    },
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = options?.statusCode;
    this.errorCode = options?.errorCode;
    this.isTimeout = options?.isTimeout ?? false;
    this.isNetworkError = options?.isNetworkError ?? false;
  }
}

export async function explainObject(
  req: ExplainRequest,
  options?: {
    baseUrl?: string;
    timeoutMs?: number;
    allowConcurrent?: boolean;
  },
): Promise<ExplainResponse> {
  const allowConcurrent = options?.allowConcurrent ?? false;

  if (requestInProgress && !allowConcurrent) {
    throw new ApiError(
      'A request is already in progress. Please wait for the response.',
    );
  }

  requestInProgress = true;

  if (activeController) {
    activeController.abort();
  }
  const controller = new AbortController();
  activeController = controller;

  const baseUrl = options?.baseUrl || config.apiBaseUrl;
  const timeoutMs = options?.timeoutMs || config.requestTimeoutMs;
  const endpoint = `${baseUrl.replace(/\/+$/, '')}/api/v1/explain`;

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const payload = {
      lesson_id: req.lesson_id,
      scene_id: req.scene_id,
      selected_object_id: req.selected_object_id,
      question: req.question || config.defaultQuestion,
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorDetail: any = null;
      try {
        errorDetail = await response.json();
      } catch {
        // Not a JSON response
      }

      const msg =
        errorDetail?.detail?.message ||
        errorDetail?.message ||
        `Backend returned status ${response.status} (${response.statusText})`;

      const code =
        errorDetail?.detail?.error_code ||
        errorDetail?.error_code ||
        `HTTP_${response.status}`;

      throw new ApiError(msg, {
        statusCode: response.status,
        errorCode: code,
      });
    }

    const data = (await response.json()) as ExplainResponse;
    return data;
  } catch (err: any) {
    clearTimeout(timeoutId);

    if (err instanceof ApiError) {
      throw err;
    }

    if (err?.name === 'AbortError' || controller.signal.aborted) {
      throw new ApiError(
        `Request to ${endpoint} timed out after ${timeoutMs / 1000}s. Check backend server and network.`,
        {isTimeout: true},
      );
    }

    // Network failure (connection refused, route unreachable, CORS, device offline)
    throw new ApiError(
      `Network connection failed when reaching ${endpoint}. If running on an emulator, make sure to use 10.0.2.2 instead of localhost.`,
      {isNetworkError: true},
    );
  } finally {
    requestInProgress = false;
    if (activeController === controller) {
      activeController = null;
    }
  }
}

export function isExplainRequestInProgress(): boolean {
  return requestInProgress;
}
