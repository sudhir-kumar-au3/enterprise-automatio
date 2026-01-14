/**
 * Webhook Service
 * Handles outgoing webhook requests for automation actions
 *
 * SECURITY: Includes SSRF protection to prevent attacks via webhook URLs
 */

import axios from "axios";
import { URL } from "url";
import dns from "dns";
import { promisify } from "util";

const dnsLookup = promisify(dns.lookup);

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

// SECURITY: Blocked IP ranges to prevent SSRF attacks
const BLOCKED_IP_RANGES = [
  /^127\./, // Localhost
  /^10\./, // Private Class A
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // Private Class B
  /^192\.168\./, // Private Class C
  /^169\.254\./, // Link-local (AWS metadata)
  /^0\./, // Current network
  /^100\.(6[4-9]|[7-9][0-9]|1[0-1][0-9]|12[0-7])\./, // Carrier-grade NAT
  /^::1$/, // IPv6 localhost
  /^fc00:/, // IPv6 private
  /^fe80:/, // IPv6 link-local
];

// SECURITY: Blocked hostnames
const BLOCKED_HOSTNAMES = [
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "metadata.google.internal", // GCP metadata
  "metadata.google", // GCP metadata
  "169.254.169.254", // AWS/Azure metadata
  "metadata", // Generic metadata
];

/**
 * SECURITY: Validate URL to prevent SSRF attacks
 */
async function validateWebhookUrl(urlString: string): Promise<void> {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(urlString);
  } catch {
    throw new Error("Invalid URL format");
  }

  // Only allow HTTPS in production for security
  if (
    process.env.NODE_ENV === "production" &&
    parsedUrl.protocol !== "https:"
  ) {
    throw new Error("Only HTTPS URLs are allowed for webhooks in production");
  }

  // Allow only HTTP and HTTPS protocols
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("Only HTTP/HTTPS protocols are allowed for webhooks");
  }

  // Check for blocked hostnames
  const hostname = parsedUrl.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.includes(hostname)) {
    throw new Error("Webhook URL points to a blocked hostname");
  }

  // Resolve hostname and check IP
  try {
    const { address } = await dnsLookup(hostname);

    // Check if resolved IP is in blocked ranges
    for (const pattern of BLOCKED_IP_RANGES) {
      if (pattern.test(address)) {
        throw new Error("Webhook URL resolves to a blocked IP range");
      }
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("blocked")) {
      throw error;
    }
    // DNS resolution failed - could be a non-existent domain
    throw new Error("Unable to resolve webhook URL hostname");
  }

  // Block URLs with authentication credentials
  if (parsedUrl.username || parsedUrl.password) {
    throw new Error("Webhook URLs with embedded credentials are not allowed");
  }
}

/**
 * Send a webhook to the specified URL
 * SECURITY: Validates URL before sending to prevent SSRF
 */
export async function sendWebhook(
  url: string,
  payload: WebhookPayload
): Promise<WebhookResponse> {
  try {
    // SECURITY: Validate URL before making request
    await validateWebhookUrl(url);

    const enrichedPayload = {
      ...payload,
      timestamp: new Date().toISOString(),
    };

    const response = await axios.post(url, enrichedPayload, {
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "TeamHub-Webhook/1.0", // Identify webhook requests
      },
      timeout: 30000, // 30 second timeout
      maxRedirects: 0, // SECURITY: Disable redirects to prevent SSRF bypass
      validateStatus: (status) => status < 500, // Accept client errors but not server errors
    });

    return {
      success: response.status >= 200 && response.status < 300,
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
