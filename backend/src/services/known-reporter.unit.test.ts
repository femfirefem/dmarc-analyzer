import { assertEquals, assertRejects } from "@std/assert";
import { MockKnownReporterRepository } from "../database/repositories/mock-known-reporter.ts";
import { KnownReporterService } from "./known-reporter.ts";
import { setLoggerLevel } from "../utils/logger.ts";

Deno.test("KnownReporterService", async (t) => {
  // Reduce log noise during tests
  setLoggerLevel("ERROR");

  await t.step("getOrCreateReporter", async (t) => {
    await t.step("should create new reporter with submitter if not exists", async () => {
      const repository = new MockKnownReporterRepository();
      const service = new KnownReporterService(repository);

      const reporter = await service.getOrCreateReporter(
        "test@example.com",
        "Test Org",
        "reports.example.com"
      );

      assertEquals(reporter.orgEmail, "test@example.com");
      assertEquals(reporter.orgName, "Test Org");
      assertEquals(reporter.submitter, "reports.example.com");
      assertEquals(reporter.trustLevel, "UNTRUSTED");
      assertEquals(reporter.status, "PENDING_REVIEW");
    });

    await t.step("should not update submitter for existing reporter", async () => {
      const repository = new MockKnownReporterRepository();
      const service = new KnownReporterService(repository);

      // Create initial reporter
      const created = await service.getOrCreateReporter(
        "test@example.com",
        "Test Org",
        "reports.example.com"
      );

      // Try to update with different submitter
      const found = await service.getOrCreateReporter(
        "test@example.com",
        "Test Org",
        "different.example.com"
      );

      assertEquals(found.id, created.id);
      assertEquals(found.submitter, "reports.example.com"); // Should keep original submitter
    });

    await t.step("should create reporter without submitter", async () => {
      const repository = new MockKnownReporterRepository();
      const service = new KnownReporterService(repository);

      const reporter = await service.getOrCreateReporter(
        "test@example.com",
        "Test Org"
      );

      assertEquals(reporter.orgEmail, "test@example.com");
      assertEquals(reporter.orgName, "Test Org");
      assertEquals(reporter.submitter, null);
    });
  });

  await t.step("validateReporter", async (t) => {
    await t.step("should validate reporter by orgEmail only", async () => {
      const repository = new MockKnownReporterRepository();
      const service = new KnownReporterService(repository);

      // Create reporter with submitter
      await service.getOrCreateReporter(
        "test@example.com",
        "Test Org",
        "reports.example.com"
      );

      // Update to trusted status
      await service.updateReporter("test@example.com", {
        trustLevel: "HIGH",
        status: "ACTIVE"
      });

      // Should validate regardless of submitter
      const isValid = await service.validateReporter("test@example.com");
      assertEquals(isValid, true);
    });

    await t.step("should return false for unknown reporter", async () => {
      const repository = new MockKnownReporterRepository();
      const service = new KnownReporterService(repository);

      const isValid = await service.validateReporter("unknown.com");
      assertEquals(isValid, false);
    });

    await t.step("should return false for untrusted reporter", async () => {
      const repository = new MockKnownReporterRepository();
      const service = new KnownReporterService(repository);

      await service.getOrCreateReporter("test.com", "Test Org");
      const isValid = await service.validateReporter("test.com");
      assertEquals(isValid, false);
    });

    await t.step("should return false for blocked reporter", async () => {
      const repository = new MockKnownReporterRepository();
      const service = new KnownReporterService(repository);

      await service.getOrCreateReporter("test.com", "Test Org");
      await service.updateReporter("test.com", {
        status: "BLOCKED",
        trustLevel: "HIGH"
      });

      const isValid = await service.validateReporter("test.com");
      assertEquals(isValid, false);
    });

    await t.step("should return true for active trusted reporter", async () => {
      const repository = new MockKnownReporterRepository();
      const service = new KnownReporterService(repository);

      await service.getOrCreateReporter("test.com", "Test Org");
      await service.updateReporter("test.com", {
        status: "ACTIVE",
        trustLevel: "HIGH"
      });

      const isValid = await service.validateReporter("test.com");
      assertEquals(isValid, true);
    });
  });

  await t.step("updateReporter", async (t) => {
    await t.step("should update reporter fields except submitter", async () => {
      const repository = new MockKnownReporterRepository();
      const service = new KnownReporterService(repository);

      // Create reporter with submitter
      await service.getOrCreateReporter(
        "test@example.com",
        "Test Org",
        "reports.example.com"
      );

      // Update fields
      const updated = await service.updateReporter("test@example.com", {
        orgName: "New Name",
        trustLevel: "HIGH",
        status: "ACTIVE",
        notes: "Test note"
      });

      assertEquals(updated.orgName, "New Name");
      assertEquals(updated.trustLevel, "HIGH");
      assertEquals(updated.status, "ACTIVE");
      assertEquals(updated.notes, "Test note");
      assertEquals(updated.submitter, "reports.example.com"); // Should keep original submitter
    });

    await t.step("should throw error for unknown domain", async () => {
      const repository = new MockKnownReporterRepository();
      const service = new KnownReporterService(repository);

      setLoggerLevel("CRITICAL");
      await assertRejects(
        () => service.updateReporter("unknown.com", { orgName: "Test" }),
        Error,
        "Reporter not found: unknown.com"
      );
      setLoggerLevel("ERROR");
    });
  });

  await t.step("listReporters", async () => {
    const repository = new MockKnownReporterRepository();
    const service = new KnownReporterService(repository);

    await service.getOrCreateReporter("test1@example.com", "Test Org 1");
    await new Promise(resolve => setTimeout(resolve, 1)); // Wait so lastSeen is not the same
    await service.getOrCreateReporter("test2@example.com", "Test Org 2");

    const reporters = await service.listReporters();
    assertEquals(reporters.length, 2);
    assertEquals(reporters[0].orgEmail, "test2@example.com"); // Should be sorted by lastSeen desc
    assertEquals(reporters[1].orgEmail, "test1@example.com");
  });
}); 