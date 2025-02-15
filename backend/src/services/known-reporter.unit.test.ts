import { assertEquals, assertRejects } from "@std/assert";
import { MockKnownReporterRepository } from "../database/repositories/mock-known-reporter.ts";
import { KnownReporterService } from "./known-reporter.ts";
import { setLoggerLevel } from "../utils/logger.ts";

Deno.test("KnownReporterService", async (t) => {
  // Reduce log noise during tests
  setLoggerLevel("ERROR");

  await t.step("getOrCreateReporter", async (t) => {
    await t.step("should create new reporter if not exists", async () => {
      const repository = new MockKnownReporterRepository();
      const service = new KnownReporterService(repository);

      const reporter = await service.getOrCreateReporter("test.com", "Test Org");

      assertEquals(reporter.domain, "test.com");
      assertEquals(reporter.orgName, "Test Org");
      assertEquals(reporter.trustLevel, "UNTRUSTED");
      assertEquals(reporter.status, "PENDING_REVIEW");
    });

    await t.step("should return existing reporter if found", async () => {
      const repository = new MockKnownReporterRepository();
      const service = new KnownReporterService(repository);

      const created = await service.getOrCreateReporter("test.com", "Test Org");
      const found = await service.getOrCreateReporter("test.com", "Different Name");

      assertEquals(found.id, created.id);
      assertEquals(found.orgName, created.orgName); // Should not update existing name
    });
  });

  await t.step("validateReporter", async (t) => {
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
    await t.step("should update reporter fields", async () => {
      const repository = new MockKnownReporterRepository();
      const service = new KnownReporterService(repository);

      await service.getOrCreateReporter("test.com", "Test Org");
      const updated = await service.updateReporter("test.com", {
        orgName: "New Name",
        trustLevel: "HIGH",
        status: "ACTIVE",
        notes: "Test note"
      });

      assertEquals(updated.orgName, "New Name");
      assertEquals(updated.trustLevel, "HIGH");
      assertEquals(updated.status, "ACTIVE");
      assertEquals(updated.notes, "Test note");
    });

    await t.step("should throw error for unknown domain", async () => {
      const repository = new MockKnownReporterRepository();
      const service = new KnownReporterService(repository);

      await assertRejects(
        () => service.updateReporter("unknown.com", { orgName: "Test" }),
        Error,
        "Reporter not found: unknown.com"
      );
    });
  });

  await t.step("listReporters", async () => {
    const repository = new MockKnownReporterRepository();
    const service = new KnownReporterService(repository);

    await service.getOrCreateReporter("test1.com", "Test Org 1");
    await new Promise(resolve => setTimeout(resolve, 1)); // Wait so lastSeen is not the same
    await service.getOrCreateReporter("test2.com", "Test Org 2");

    const reporters = await service.listReporters();
    assertEquals(reporters.length, 2);
    assertEquals(reporters[0].domain, "test2.com"); // Should be sorted by lastSeen desc
    assertEquals(reporters[1].domain, "test1.com");
  });
}); 