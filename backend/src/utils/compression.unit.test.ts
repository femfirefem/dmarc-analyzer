import { assertEquals, assertRejects } from "@std/assert";
import { gzipString, gunzipAsString, isGzip, isZip, getFirstXmlFromZip } from "./compression.ts";
import { configure, Uint8ArrayReader, Uint8ArrayWriter, ZipWriter } from "@zip-js/zip-js";
import { createTestZipWithXml } from "./test_utils.ts";
import { setLoggerLevel } from "./logger.ts";

Deno.test("gzipString/gunzipAsString", () => {
  const original = "test content";
  const compressed = gzipString(original);
  const decompressed = gunzipAsString(compressed);
  assertEquals(decompressed, original);
});

Deno.test("isGzip detection", () => {
  const compressed = gzipString("test");
  assertEquals(isGzip(new Uint8Array(compressed)), true);
  assertEquals(isGzip(new Uint8Array([0x00, 0x00])), false);
});

Deno.test("isZip detection", () => {
  const zipData = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x00]);
  assertEquals(isZip(zipData), true);
  assertEquals(isZip(new Uint8Array([0x00, 0x00, 0x00, 0x00])), false);
});

Deno.test("getFirstXmlFromZip", async (t) => {
  // NOTE: Disabling web workers to prevent timer leaks when running unit tests
  configure({ useWebWorkers: false })

  await t.step("should extract first XML file", async () => {
    const xmlContent = "<test>content</test>";
    const zipBuffer = await createTestZipWithXml(xmlContent);
    const result = await getFirstXmlFromZip(new Uint8Array(zipBuffer));
    assertEquals(result, xmlContent);
  });

  await t.step("should throw on empty ZIP", async () => {
    // Create an empty ZIP file
    const zipWriter = new ZipWriter(new Uint8ArrayWriter());
    const emptyZip = await zipWriter.close();

    setLoggerLevel("CRITICAL");
    await assertRejects(
      async () => {
        await getFirstXmlFromZip(new Uint8Array(emptyZip));
      },
      Error,
      "ZIP archive is empty"
    );
    setLoggerLevel("INFO");
  });

  await t.step("should throw when no XML files found", async () => {
    // Create ZIP with non-XML file
    const zipWriter = new ZipWriter(new Uint8ArrayWriter());
    const textBuffer = new TextEncoder().encode("not xml");
    await zipWriter.add("test.txt", new Uint8ArrayReader(textBuffer));
    const zipData = await zipWriter.close();

    setLoggerLevel("CRITICAL");
    await assertRejects(
      async () => {
        await getFirstXmlFromZip(new Uint8Array(zipData));
      },
      Error,
      "No XML file found in ZIP archive"
    );
    setLoggerLevel("INFO");
  });
});
