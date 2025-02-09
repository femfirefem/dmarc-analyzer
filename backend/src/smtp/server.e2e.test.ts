import { assertExists } from "@std/assert";
import { DmarcSMTPServer } from "./server.ts";
import { createTransport } from "nodemailer";
import { createTestDmarcReport } from "./test_utils.ts";
import { encodeBase64 } from "@std/encoding/base64";
import { gzipString } from "../utils/compression.ts";

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

      const testEmail = `From: reporter@example.com
To: dmarc-reports@yourdomain.com
Subject: Report Domain: example.com
Content-Type: multipart/mixed; boundary="boundary"

--boundary
Content-Type: text/plain

DMARC Report for example.com
--boundary
Content-Type: application/gzip
Content-Transfer-Encoding: base64
Filename: report.xml.gz

${encodeBase64(gzipString(createTestDmarcReport("example.com")))}
--boundary--`;

      const result = await client.sendMail({
        from: "reporter@example.com",
        to: ["dmarc-reports@yourdomain.com"],
        data: testEmail,
      });

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