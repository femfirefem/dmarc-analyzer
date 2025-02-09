import { DmarcSMTPServer } from "./smtp/server.ts";
import { parseArgs } from "@std/cli/parse-args";

const flags = parseArgs(Deno.args, {
  boolean: ["help"],
  string: ["host", "smtpHost", "smtpPort", "httpHost", "httpPort"],
});

const DEFAULT_SMTP_PORT = 25;
const DEFAULT_HOST = "0.0.0.0";

if (import.meta.main) {
  const server = new DmarcSMTPServer(
    flags.smtpPort ? parseInt(flags.smtpPort) : DEFAULT_SMTP_PORT,
    flags.smtpHost ?? flags.host ?? DEFAULT_HOST
  );

  server.start().catch((error) => {
    console.error("Failed to start DMARC SMTP server:", error);
    Deno.exit(1);
  });

  // Handle shutdown gracefully
  const signals: Deno.Signal[] = ["SIGINT", "SIGTERM"];
  for (const signal of signals) {
    Deno.addSignalListener(signal, async () => {
      console.log(`\nReceived ${signal}, shutting down...`);
      await server.stop();
      Deno.exit(0);
    });
  }
}
