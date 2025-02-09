import { assertExists } from "@std/assert";
import { DmarcSMTPServer } from "./server.ts";
import { createTransport } from "nodemailer";
import { createTestDmarcReport } from "./test_utils.ts";
import { gzipString } from "../utils/compression.ts";
import { setLoggerLevel } from "../utils/logger.ts";

const TEST_PORT = 52525; // Using a non-privileged port for testing
const TEST_HOST = "localhost";

Deno.test({
  name: "SMTP Server Integration Tests",
  async fn(t) {
    const server = new DmarcSMTPServer(TEST_PORT, TEST_HOST);
    
    // Start server before all tests
    await t.step("should start SMTP server", async () => {
      await server.start();
      // Server should be running now
    });

    // Test basic connection
    await t.step("should accept SMTP connections", async () => {
      const client = createTransport({
        host: TEST_HOST,
        port: TEST_PORT,
        secure: false
      });
      await client.verify();
      client.close();
    });

    // Test sending a basic DMARC report
    await t.step("should accept DMARC report email", async () => {
      const client = createTransport({
        host: TEST_HOST,
        port: TEST_PORT,
        secure: false
      });

      await client.verify();

      setLoggerLevel("ERROR");
      const result = await client.sendMail({
        from: "reporter@example.com",
        to: ["dmarc-reports@yourdomain.com"],
        subject: "Report Domain: example.com",
        text: "DMARC Report for example.com",
        attachments: [
          {
            filename: "report.xml.gz",
            content: gzipString(createTestDmarcReport("example.com")),
          },
        ],
      });
      setLoggerLevel("INFO");

      assertExists(result);
      client.close();
    });

    // Cleanup
    await t.step("should stop SMTP server", async () => {
      await server.stop();
    });
  },
  sanitizeOps: false,
  sanitizeResources: false,
}); 