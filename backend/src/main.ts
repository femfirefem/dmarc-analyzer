import { DmarcSMTPServer } from "./smtp/server.ts";
import { parseArgs } from "@std/cli/parse-args";
import { logger, setLoggerLevel, setLogObjects } from "./utils/logger.ts";
import { LevelName } from "@std/log";
import { HttpServer } from "./http/server.ts";

const flags = parseArgs(Deno.args, {
  boolean: ["help", "logObjects"],
  string: ["host", "smtpHost", "smtpPort", "httpHost", "httpPort", "logLevel"],
});

const DEFAULT_SMTP_PORT = 25;
const DEFAULT_HTTP_PORT = 3000;
const DEFAULT_HOST = "0.0.0.0";
const DEFAULT_LOG_LEVEL = "INFO";

if (import.meta.main) {
  // Fall back flags to environment variables
  if (!flags.smtpPort) flags.smtpPort = Deno.env.get("SMTP_PORT");
  if (!flags.smtpHost) flags.smtpHost = Deno.env.get("SMTP_HOST");
  if (!flags.httpHost) flags.httpHost = Deno.env.get("HTTP_HOST");
  if (!flags.httpPort) flags.httpPort = Deno.env.get("HTTP_PORT");
  if (!flags.host) flags.host = Deno.env.get("HOST");
  if (!flags.logLevel) flags.logLevel = Deno.env.get("LOG_LEVEL");
  if (!flags.logObjects) flags.logObjects = Deno.env.get("LOG_OBJECTS")?.toLowerCase() === "true";

  // Initialize logger with command line log level
  const logLevel = (flags.logLevel?.toUpperCase() ?? DEFAULT_LOG_LEVEL) as LevelName;
  setLoggerLevel(logLevel);
  setLogObjects(flags.logObjects);
  
  const smtpServer = new DmarcSMTPServer({
    port: flags.smtpPort ? parseInt(flags.smtpPort) : DEFAULT_SMTP_PORT,
    host: flags.smtpHost ?? flags.host ?? DEFAULT_HOST
  });

  const httpServer = new HttpServer({
    port: flags.httpPort ? parseInt(flags.httpPort) : DEFAULT_HTTP_PORT,
    host: flags.httpHost ?? flags.host ?? DEFAULT_HOST
  });

  // Handle shutdown gracefully
  const signals: Deno.Signal[] = ["SIGINT", "SIGTERM"];
  for (const signal of signals) {
    Deno.addSignalListener(signal, async () => {
      logger.info(`Received ${signal}, shutting down...`);
      await Promise.all([smtpServer.stop(), httpServer.stop()]);
      Deno.exit(0);
    });
  }

  smtpServer.start().catch((error) => {
    logger.error("Failed to start DMARC SMTP server:", error);
    Deno.exit(1);
  });

  httpServer.start().catch((error) => {
    logger.error("Failed to start DMARC HTTP server:", error);
    Deno.exit(1);
  });
}
