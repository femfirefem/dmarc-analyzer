import { assertEquals, assertExists } from "@std/assert";
import { HttpServer } from "./server.ts";
import { setLoggerLevel } from "../utils/logger.ts";

Deno.test("HttpServer", async (t) => {
  setLoggerLevel("ERROR");
  
  const server = new HttpServer({
    port: 8080,
    host: "localhost",
    cors: {
      origin: ["http://localhost:3000"],
      methods: ["GET", "POST", "PATCH", "DELETE"],
    },
  });

  // Start server once before all tests
  await server.start();
  
  await t.step("health endpoint returns ok", async () => {
    const response = await fetch("http://localhost:8080/health");
    const data = await response.json();
    
    assertEquals(response.status, 200);
    assertEquals(data.status, "ok");
  });

  await t.step("handles 404 correctly", async () => {
    const response = await fetch("http://localhost:8080/nonexistent");
    const data = await response.json();
    
    assertEquals(response.status, 404);
    assertEquals(data.status, "error");
    assertEquals(data.message, "Not found");
  });

  await t.step("router is accessible", () => {
    const router = server.getRouter();
    assertExists(router);
  });

  // Stop server after all tests
  await server.stop();
}); 