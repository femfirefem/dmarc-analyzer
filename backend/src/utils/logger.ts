import { LevelName, Logger, LogRecord } from "@std/log";
import { ConsoleHandler } from "@std/log/console-handler";

const initialLogLevel = (Deno.env.get("LOG_LEVEL") ?? "INFO") as LevelName;
const initialLogObjects: boolean = Deno.env.get("LOG_OBJECTS")?.toLowerCase() === "true";

class CustomConsoleHandler extends ConsoleHandler {
  logObjects: boolean = false;

  constructor(levelName: LevelName, logObjects: boolean) {
    super(levelName, {
      formatter: ({datetime, levelName, msg}) => {
        return `${datetime} ${levelName} ${msg}`;
      }
    });
    this.logObjects = logObjects;
  }
  override handle(logRecord: LogRecord) {
    if (this.level > logRecord.level) return;

    const msg = this.format(logRecord);
    if (this.logObjects) {
      console.log(msg, ...logRecord.args);
    } else {
      console.log(msg);
    }
  }
}

const handler = new CustomConsoleHandler(initialLogLevel, initialLogObjects);

export const logger = new Logger("dmarc-analyzer", initialLogLevel, {
  handlers: [handler],
});

export function setLoggerLevel(level: LevelName) {
  handler.levelName = level;
  logger.levelName = level;
};

export function setLogObjects(logObjects: boolean) {
  handler.logObjects = logObjects;
};
