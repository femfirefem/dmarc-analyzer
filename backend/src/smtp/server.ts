import { SMTPServer } from "smtp-server";
import { handleIncomingMail } from "./handlers.ts";
import { logger } from "../utils/logger.ts";

export class DmarcSMTPServer {
  private server: SMTPServer;
  private port: number;
  private host: string;

  constructor(port: number = 25, host: string = "0.0.0.0") {
    this.server = new SMTPServer({
      onData: handleIncomingMail,
      authOptional: true,
      disabledCommands: ['AUTH', 'STARTTLS'], // DMARC reports don't need authentication
    });
    this.port = port;
    this.host = host;
  }

  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server.listen(this.port, this.host, () => {
          logger.info(`SMTP Server listening on ${this.host}:${this.port}`);
          resolve();
        });
      } catch (error) {
        logger.error('Failed to start SMTP server:', error);
        reject(error);
      }
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server.close(() => {
          logger.info(`SMTP Server on ${this.host}:${this.port} closed`);
          resolve();
        });
      } catch (error) {
        logger.error('Failed to stop SMTP server:', error);
        reject(error);
      }
    });
  }
}