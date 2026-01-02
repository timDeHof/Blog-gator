import fs from "fs";
import path from "path";
import os from "os";

export function logAuditAction(
  action: string,
  userName: string,
  details: string
): void {
  const logDir = path.join(os.homedir(), ".gatorlogs");
  const logFile = path.join(logDir, "audit.log");

  // Create log directory if it doesn't exist
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ACTION: ${action}, USER: ${userName}, DETAILS: ${details}\n`;

  fs.appendFileSync(logFile, logEntry, "utf-8");
}
