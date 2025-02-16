import { Application, Router, Context, isHttpError, Status } from "@oak/oak";
import { logger } from "../utils/logger.ts";
import { oakCors } from "@tajpouria/cors";

export interface HttpServerOptions {
  port: number;
  host?: string;
  cors?: {
    origin?: string | string[];
    methods?: string[];
  };
}

export class HttpServer {
  private app: Application;
  private router: Router;
  private port: number;
  private host: string;
  private abortController: AbortController;

  constructor(options: HttpServerOptions) {
    this.app = new Application();
    this.router = new Router();
    this.port = options.port ?? 3000;
    this.host = options.host ?? "0.0.0.0";
    this.abortController = new AbortController();

    this.setupMiddleware(options);
    this.setupRoutes();
    this.setupErrorHandler();
  }

  private setupMiddleware(options: HttpServerOptions) {
    // Add request logging
    this.app.use(async (ctx, next) => {
      const start = Date.now();
      await next();
      const ms = Date.now() - start;
      logger.debug(`${ctx.request.method} ${ctx.request.url} - ${ctx.response.status} - ${ms}ms`);
    });

    // Add CORS if configured
    if (options.cors) {
      this.app.use(oakCors({
        origin: options.cors.origin,
        methods: options.cors.methods,
      }));
    }
  }

  private setupRoutes() {
    // Health check endpoint
    this.router.get("/health", (ctx: Context) => {
      ctx.response.body = { status: "ok" };
    });

    // Add router middleware
    this.app.use(this.router.routes());
    this.app.use(this.router.allowedMethods());
  }

  private setupErrorHandler() {
    this.app.use(async (ctx, next) => {
      try {
        await next();
      } catch (err) {
        if (isHttpError(err)) {
          // Handle known HTTP errors
          ctx.response.status = err.status;
          ctx.response.body = {
            status: "error",
            message: err.message,
            code: err.status,
          };
        } else {
          // Handle unknown errors
          logger.error("Unhandled error:", err);
          ctx.response.status = Status.InternalServerError;
          ctx.response.body = {
            status: "error",
            message: "Internal server error",
            code: Status.InternalServerError,
          };
        }
      }
    });

    // Handle 404 Not Found
    this.app.use((ctx) => {
      ctx.response.status = Status.NotFound;
      ctx.response.body = {
        status: "error",
        message: "Not found",
        code: Status.NotFound,
      };
    });
  }

  public getRouter(): Router {
    return this.router;
  }

  start(): Promise<void> {
    try {
      return new Promise((resolve, reject) => {
        this.app.addEventListener("listen", ({ port, hostname }) => {
          logger.info(`HTTP Server running on ${hostname}:${port}`);
          resolve();
        }, { once: true });
        this.app.listen({
          port: this.port,
          hostname: this.host,
          signal: this.abortController.signal,
        }).catch(reject);
      });
    } catch (error) {
      logger.error("Failed to start HTTP server:", error);
      throw error;
    }
  }

  stop(): Promise<void> {
    try {
      return new Promise((resolve, reject) => {
        this.app.addEventListener("close", () => {
          logger.info(`HTTP Server on ${this.host}:${this.port} closed`);
          setTimeout(resolve, 0);
        }, { once: true });
        try {
          this.abortController.abort();
        } catch (error) {
          reject(error);
        }
      });
    } catch (error) {
      logger.error("Failed to stop HTTP server:", error);
      throw error;
    }
  }
} 