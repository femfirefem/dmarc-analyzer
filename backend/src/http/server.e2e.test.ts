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

  await t.step("CORS - allows configured origin", async () => {
    const response = await fetch("http://localhost:8080/health", {
      headers: {
        "Origin": "http://localhost:3000"
      }
    });
    
    assertEquals(response.headers.get("access-control-allow-origin"), "http://localhost:3000");
    assertEquals(response.status, 200);
    await response.body?.cancel();
  });

  await t.step("CORS - blocks non-configured origin", async () => {
    const response = await fetch("http://localhost:8080/health", {
      headers: {
        "Origin": "http://evil.com"
      }
    });
    
    assertEquals(response.headers.get("access-control-allow-origin"), "false");
    await response.body?.cancel();
  });

  await t.step("CORS - handles preflight requests", async () => {
    const response = await fetch("http://localhost:8080/health", {
      method: "OPTIONS",
      headers: {
        "Origin": "http://localhost:3000",
        "Access-Control-Request-Method": "GET",
      }
    });
    
    assertEquals(response.headers.get("access-control-allow-origin"), "http://localhost:3000");
    assertEquals(response.headers.get("access-control-allow-methods"), "GET,POST,PATCH,DELETE");
    assertEquals(response.status, 204);
    await response.body?.cancel();
  });

  await t.step("CORS - handles invalid preflight", async () => {
    const response = await fetch("http://localhost:8080/health", {
      method: "OPTIONS",
      headers: {
        "Origin": "http://localhost:3000",
        "Access-Control-Request-Method": "INVALID",
      }
    });
    
    assertEquals(response.status, 204);
    assertEquals(response.headers.get("access-control-allow-methods"), "GET,POST,PATCH,DELETE");
    await response.body?.cancel();
  });

  await t.step("error response format is consistent", async () => {
    const response = await fetch("http://localhost:8080/nonexistent");
    const data = await response.json();
    
    assertEquals(response.headers.get("content-type"), "application/json; charset=UTF-8");
    assertEquals(Object.keys(data).sort(), ["code", "message", "status"].sort());
    assertEquals(typeof data.code, "number");
    assertEquals(typeof data.message, "string");
    assertEquals(typeof data.status, "string");
  });

  await t.step("response headers are consistent", async () => {
    const response = await fetch("http://localhost:8080/health");
    
    assertEquals(response.headers.get("content-type"), "application/json; charset=UTF-8");
    // Add more header checks as we implement them
    await response.body?.cancel();
  });

  // Stop server after all tests
  await server.stop();
}); 