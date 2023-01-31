import rateLimit from "express-rate-limit";
import slowDown from "express-slow-down";

type Middleware = (
  request: any,
  response: any,
  next: (result?: any) => void
) => void;

const applyMiddleware =
  (middleware: Middleware) =>
  (request: any, response: any): Promise<void> =>
    new Promise((resolve, reject) => {
      middleware(request, response, (result) =>
        result instanceof Error ? reject(result) : resolve(result)
      );
    });

const getIP = (request: any): string =>
  request.ip ||
  request.headers["x-forwarded-for"] ||
  request.headers["x-real-ip"] ||
  request.connection.remoteAddress;

interface RateLimitOptions {
  limit?: number;
  windowMs?: number;
  delayAfter?: number;
  delayMs?: number;
}

export const getRateLimitMiddlewares = (
  options: RateLimitOptions = {}
): Middleware[] => [
  slowDown({
    keyGenerator: getIP,
    windowMs: options.windowMs || 60 * 1000,
    delayAfter: options.delayAfter || Math.round(10 / 2),
    delayMs: options.delayMs || 500,
  }),
  rateLimit({
    keyGenerator: getIP,
    windowMs: options.windowMs || 60 * 1000,
    max: options.limit || 10,
  }),
];

const middlewares = getRateLimitMiddlewares();

export async function applyRateLimit(
  request: any,
  response: any
): Promise<void> {
  await Promise.all(
    middlewares
      .map(applyMiddleware)
      .map((middleware) => middleware(request, response))
  );
}

export default applyRateLimit;
