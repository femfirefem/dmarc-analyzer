import Prisma from "@prisma/client";
import { logger } from "../utils/logger.ts";

let prisma: Prisma.PrismaClient;

export function getPrismaClient(): Prisma.PrismaClient {
  if (!prisma) {
    prisma = new Prisma.PrismaClient({
      log: [
        { level: 'warn', emit: 'event' },
        { level: 'error', emit: 'event' }
      ],
    });
    
    // Forward Prisma logs to our logger
    prisma.$on('warn' as never, (e) => {
      logger.warn(`Prisma warning: ${e}`);
    });
    
    prisma.$on('error' as never, (e: Error) => {
      logger.error(`Prisma error: ${e.message}`, e);
    });
  }
  return prisma;
};

export async function disconnectDatabase(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = undefined as unknown as Prisma.PrismaClient;
  }
};
