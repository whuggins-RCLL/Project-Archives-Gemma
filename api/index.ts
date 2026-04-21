// Static import so Vercel's file-tracer (@vercel/node / nft) ships server.js
// in the Lambda artifact. The explicit .js extension is required under Node 24
// strict ESM resolution (package.json has "type": "module"); without it Node
// throws ERR_MODULE_NOT_FOUND for '/var/task/server' and every /api/* request
// fails with FUNCTION_INVOCATION_FAILED before any route handler runs.
import staticApp from "../server.js";
import express, { type Request, type Response, type NextFunction } from "express";

// Defensive fallback: if the static import above returns something unexpected,
// serve a JSON error so the caller gets actionable diagnostics instead of
// Vercel's opaque 500 page. Per-request errors thrown inside server.ts are
// already caught by its global express error handler.
let handler: express.Express;
if (staticApp && typeof staticApp === "function") {
  handler = staticApp as unknown as express.Express;
} else {
  const fallback = express();
  fallback.use((_req: Request, res: Response, _next: NextFunction) => {
    res.status(500).json({
      error: "Server module default export was empty",
      staticAppType: typeof staticApp,
      nodeVersion: process.version,
      isVercel: Boolean(process.env.VERCEL),
    });
  });
  handler = fallback;
}

export default handler;
