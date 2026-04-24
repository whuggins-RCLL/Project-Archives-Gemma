let appModule: { default: unknown } | null = null;

for (const specifier of ["../server.js", "../server.ts", "../server.cjs"] as const) {
  try {
    appModule = await import(specifier);
    break;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/ERR_MODULE_NOT_FOUND|Cannot find module/i.test(message)) {
      throw error;
    }
  }
}

if (!appModule || !appModule.default) {
  throw new Error("Unable to load API server module from ../server.{js,ts,cjs}");
}

export default appModule.default;
