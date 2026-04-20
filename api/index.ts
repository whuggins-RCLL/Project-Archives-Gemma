// Wrap the server import so initialization crashes produce a diagnostic JSON response
// instead of Vercel's opaque FUNCTION_INVOCATION_FAILED page.
import express, { type Request, type Response, type NextFunction } from "express";

let handler: express.Express;
let initError: string | null = null;

try {
  const mod = await import("../server");
  handler = (mod as { default: express.Express }).default;
} catch (e) {
  initError = e instanceof Error ? `${e.name}: ${e.message}\n${e.stack ?? ""}` : String(e);
  console.error("[api/index] Server module failed to load:", initError);
  handler = express();
  handler.use((_req: Request, res: Response, _next: NextFunction) => {
    res.status(500).json({
      error: "Server module failed to initialize",
      initError,
      nodeVersion: process.version,
      isVercel: Boolean(process.env.VERCEL),
    });
  });
}

export default handler;
