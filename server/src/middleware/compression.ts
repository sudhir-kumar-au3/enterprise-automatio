/**
 * Advanced API Compression Middleware
 *
 * Features:
 * - Brotli compression (best ratio) with gzip fallback
 * - Content-type aware compression
 * - Size threshold to skip small responses
 * - Streaming support for large responses
 * - Cache-friendly compression headers
 * - Performance metrics tracking
 */

import { Request, Response, NextFunction } from "express";
import zlib from "zlib";
import { Transform } from "stream";

// Compression configuration
const COMPRESSION_CONFIG = {
  // Minimum size to compress (bytes) - smaller responses have overhead
  threshold: 1024, // 1KB

  // Brotli settings (best for text, slower)
  brotli: {
    enabled: true,
    level: 4, // 0-11, 4 is good balance
    chunkSize: 16 * 1024,
  },

  // Gzip settings (wider support, faster)
  gzip: {
    enabled: true,
    level: 6, // 1-9, 6 is default
    chunkSize: 16 * 1024,
  },

  // Deflate settings (legacy fallback)
  deflate: {
    enabled: true,
    level: 6,
  },

  // Content types to compress
  compressibleTypes: [
    "text/plain",
    "text/html",
    "text/css",
    "text/javascript",
    "text/xml",
    "application/json",
    "application/javascript",
    "application/xml",
    "application/rss+xml",
    "application/atom+xml",
    "application/xhtml+xml",
    "application/x-javascript",
    "image/svg+xml",
    "application/vnd.api+json",
  ],

  // Skip compression for these paths
  skipPaths: [
    "/api/v1/health/live", // Health checks should be fast
    "/api/v1/metrics", // Prometheus scrapes frequently
  ],

  // Skip compression for these methods
  skipMethods: ["HEAD", "OPTIONS"],
};

// Compression statistics
interface CompressionStats {
  totalRequests: number;
  compressedRequests: number;
  skippedRequests: number;
  totalOriginalBytes: number;
  totalCompressedBytes: number;
  byAlgorithm: Record<string, { count: number; savedBytes: number }>;
}

const stats: CompressionStats = {
  totalRequests: 0,
  compressedRequests: 0,
  skippedRequests: 0,
  totalOriginalBytes: 0,
  totalCompressedBytes: 0,
  byAlgorithm: {
    br: { count: 0, savedBytes: 0 },
    gzip: { count: 0, savedBytes: 0 },
    deflate: { count: 0, savedBytes: 0 },
  },
};

/**
 * Check if content type is compressible
 */
function isCompressible(contentType: string | undefined): boolean {
  if (!contentType) return false;

  const type = contentType.split(";")[0].trim().toLowerCase();
  return COMPRESSION_CONFIG.compressibleTypes.some(
    (ct) => type === ct || type.startsWith(ct.split("/")[0] + "/")
  );
}

/**
 * Parse Accept-Encoding header and return best supported algorithm
 */
function getBestEncoding(
  acceptEncoding: string | undefined
): "br" | "gzip" | "deflate" | null {
  if (!acceptEncoding) return null;

  const encodings = acceptEncoding.toLowerCase();

  // Prefer Brotli (best compression)
  if (COMPRESSION_CONFIG.brotli.enabled && encodings.includes("br")) {
    return "br";
  }

  // Fall back to gzip (wide support)
  if (COMPRESSION_CONFIG.gzip.enabled && encodings.includes("gzip")) {
    return "gzip";
  }

  // Last resort: deflate
  if (COMPRESSION_CONFIG.deflate.enabled && encodings.includes("deflate")) {
    return "deflate";
  }

  return null;
}

/**
 * Create compression stream based on algorithm
 */
function createCompressionStream(
  encoding: "br" | "gzip" | "deflate"
): Transform {
  switch (encoding) {
    case "br":
      return zlib.createBrotliCompress({
        params: {
          [zlib.constants.BROTLI_PARAM_QUALITY]:
            COMPRESSION_CONFIG.brotli.level,
        },
        chunkSize: COMPRESSION_CONFIG.brotli.chunkSize,
      });

    case "gzip":
      return zlib.createGzip({
        level: COMPRESSION_CONFIG.gzip.level,
        chunkSize: COMPRESSION_CONFIG.gzip.chunkSize,
      });

    case "deflate":
      return zlib.createDeflate({
        level: COMPRESSION_CONFIG.deflate.level,
      });
  }
}

/**
 * Compress buffer synchronously
 */
async function compressBuffer(
  data: Buffer,
  encoding: "br" | "gzip" | "deflate"
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const callback = (err: Error | null, result: Buffer) => {
      if (err) reject(err);
      else resolve(result);
    };

    switch (encoding) {
      case "br":
        zlib.brotliCompress(
          data,
          {
            params: {
              [zlib.constants.BROTLI_PARAM_QUALITY]:
                COMPRESSION_CONFIG.brotli.level,
            },
          },
          callback
        );
        break;

      case "gzip":
        zlib.gzip(data, { level: COMPRESSION_CONFIG.gzip.level }, callback);
        break;

      case "deflate":
        zlib.deflate(
          data,
          { level: COMPRESSION_CONFIG.deflate.level },
          callback
        );
        break;
    }
  });
}

/**
 * Advanced compression middleware
 */
export function advancedCompression() {
  return (req: Request, res: Response, next: NextFunction): void => {
    stats.totalRequests++;

    // Skip for certain methods
    if (COMPRESSION_CONFIG.skipMethods.includes(req.method)) {
      stats.skippedRequests++;
      return next();
    }

    // Skip for certain paths
    if (COMPRESSION_CONFIG.skipPaths.some((p) => req.path.startsWith(p))) {
      stats.skippedRequests++;
      return next();
    }

    // Check if client accepts compression
    const encoding = getBestEncoding(req.headers["accept-encoding"] as string);
    if (!encoding) {
      stats.skippedRequests++;
      return next();
    }

    // Store original methods
    const originalEnd = res.end.bind(res);
    const originalWrite = res.write.bind(res);
    const originalJson = res.json.bind(res);

    // Buffer for collecting response
    let chunks: Buffer[] = [];
    let originalSize = 0;

    // Override res.write
    res.write = function (
      chunk: any,
      encodingOrCallback?:
        | BufferEncoding
        | ((error: Error | null | undefined) => void),
      callback?: (error: Error | null | undefined) => void
    ): boolean {
      if (chunk) {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        chunks.push(buffer);
        originalSize += buffer.length;
      }
      return true;
    };

    // Override res.end
    res.end = function (
      chunk?: any,
      encodingOrCallback?: BufferEncoding | (() => void),
      callback?: () => void
    ): Response {
      if (chunk && typeof chunk !== "function") {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        chunks.push(buffer);
        originalSize += buffer.length;
      }

      const body = Buffer.concat(chunks);
      const contentType = res.getHeader("content-type") as string;

      // Check if we should compress
      const shouldCompress =
        body.length >= COMPRESSION_CONFIG.threshold &&
        isCompressible(contentType) &&
        !res.headersSent &&
        !res.getHeader("content-encoding");

      if (shouldCompress) {
        compressBuffer(body, encoding)
          .then((compressed) => {
            // Only use compressed if it's smaller
            if (compressed.length < body.length) {
              // Update stats
              stats.compressedRequests++;
              stats.totalOriginalBytes += body.length;
              stats.totalCompressedBytes += compressed.length;
              stats.byAlgorithm[encoding].count++;
              stats.byAlgorithm[encoding].savedBytes +=
                body.length - compressed.length;

              // Set compression headers
              res.setHeader("Content-Encoding", encoding);
              res.setHeader("Content-Length", compressed.length);
              res.setHeader("Vary", "Accept-Encoding");

              // Remove any existing content-length
              res.removeHeader("Transfer-Encoding");

              originalEnd(compressed);
            } else {
              // Send uncompressed (compressed is larger)
              stats.skippedRequests++;
              if (body.length > 0) {
                res.setHeader("Content-Length", body.length);
              }
              originalEnd(body);
            }
          })
          .catch(() => {
            // Compression failed, send original
            stats.skippedRequests++;
            if (body.length > 0) {
              res.setHeader("Content-Length", body.length);
            }
            originalEnd(body);
          });
      } else {
        // Send uncompressed
        stats.skippedRequests++;
        if (body.length > 0) {
          res.setHeader("Content-Length", body.length);
        }
        originalEnd(body);
      }

      return res;
    };

    // Override res.json for convenience
    res.json = function (data: any): Response {
      const json = JSON.stringify(data);
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(json);
      return res;
    };

    next();
  };
}

/**
 * Get compression statistics
 */
export function getCompressionStats(): CompressionStats & {
  compressionRatio: number;
  savedBandwidth: string;
} {
  const savedBytes = stats.totalOriginalBytes - stats.totalCompressedBytes;
  const compressionRatio =
    stats.totalOriginalBytes > 0
      ? (savedBytes / stats.totalOriginalBytes) * 100
      : 0;

  return {
    ...stats,
    compressionRatio: Math.round(compressionRatio * 100) / 100,
    savedBandwidth: formatBytes(savedBytes),
  };
}

/**
 * Reset compression statistics
 */
export function resetCompressionStats(): void {
  stats.totalRequests = 0;
  stats.compressedRequests = 0;
  stats.skippedRequests = 0;
  stats.totalOriginalBytes = 0;
  stats.totalCompressedBytes = 0;
  stats.byAlgorithm = {
    br: { count: 0, savedBytes: 0 },
    gzip: { count: 0, savedBytes: 0 },
    deflate: { count: 0, savedBytes: 0 },
  };
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * Simple compression using built-in compression package
 * Use this if the advanced middleware causes issues
 */
export function simpleCompression() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const compression = require("compression");

  return compression({
    level: 6,
    threshold: 1024,
    filter: (req: Request, res: Response) => {
      // Skip compression for server-sent events
      if (req.headers["accept"] === "text/event-stream") {
        return false;
      }

      // Skip for paths that need fast responses
      if (COMPRESSION_CONFIG.skipPaths.some((p) => req.path.startsWith(p))) {
        return false;
      }

      // Use default filter
      return compression.filter(req, res);
    },
  });
}

export default advancedCompression;
