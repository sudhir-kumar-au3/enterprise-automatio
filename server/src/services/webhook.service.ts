/**
 * Webhook Service
 * Handles outgoing webhook requests for automation actions
 */

import axios from "axios";

interface WebhookPayload {
  event: string;
  rule: { id?: string };
  data: Record<string, unknown>;
  timestamp?: string;
}

interface WebhookResponse {
  success: boolean;
  statusCode?: number;
  error?: string;
}

/**
 * Send a webhook to the specified URL
 */
export async function sendWebhook(
  url: string,
  payload: WebhookPayload
): Promise<WebhookResponse> {
  try {
    const enrichedPayload = {
      ...payload,
      timestamp: new Date().toISOString(),
    };

    const response = await axios.post(url, enrichedPayload, {
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 30000, // 30 second timeout
    });

    return {
      success: true,
      statusCode: response.status,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(`Webhook failed to ${url}:`, errorMessage);

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Send multiple webhooks in parallel
 */
export async function sendWebhooks(
  webhooks: Array<{ url: string; payload: WebhookPayload }>
): Promise<WebhookResponse[]> {
  return Promise.all(
    webhooks.map(({ url, payload }) => sendWebhook(url, payload))
  );
}

export const webhookService = {
  sendWebhook,
  sendWebhooks,
};

export default webhookService;
