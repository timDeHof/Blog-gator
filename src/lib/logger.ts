import fs from "fs";
import path from "path";
import os from "os";
import { InputSanitizer } from "./sanitizer";
import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";

// Configure Winston logger with rotation
const configureWinstonLogger = () => {
  const logDir = path.join(os.homedir(), ".gatorlogs");

  // Create log directory asynchronously with strict permissions
  try {
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true, mode: 0o700 });
    } else {
      // Ensure directory has correct permissions
      fs.chmodSync(logDir, 0o700);
    }
  } catch (error) {
    console.error(`Failed to setup log directory at ${logDir}:`, error);
    throw error;
  }

  // Configure daily rotate file transport with both time and size based rotation
  const fileTransport = new DailyRotateFile({
    filename: path.join(logDir, "audit-%DATE%.log"),
    datePattern: "YYYY-MM-DD",
    maxSize: "10m", // Rotate when file reaches 10MB
    maxFiles: "14d", // Keep logs for 14 days
    level: "info",
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json() // JSON/structured output
    ),
    auditFile: path.join(logDir, "audit.json"), // Track rotated files
    zippedArchive: true, // Compress rotated logs
    createSymlink: true, // Create symlink to current log
    symlinkName: path.join(logDir, "audit.log"),
    options: {
      flags: "a", // Append mode
      mode: 0o600, // Strict file permissions
    },
  });

  // Create Winston logger instance
  const logger = winston.createLogger({
    level: "info",
    transports: [fileTransport],
    exitOnError: false, // Do not exit on logging errors
    handleExceptions: true,
    handleRejections: true,
  });

  // Add error handling for write failures
  logger.on("error", (error) => {
    console.error("Winston logging error:", error);
    // Surface write errors via existing error handling
    throw error;
  });

  return logger;
};

// Initialize logger
const logger = configureWinstonLogger();

export async function logAuditAction(
  action: string,
  userName: string,
  details: string
): Promise<void> {
  const sanitizer = InputSanitizer.createDefault();

  // Validate and sanitize all inputs
  const sanitizedAction = sanitizer.sanitizeString(action, "action", {
    allowEmpty: false,
  });
  const sanitizedUserName = sanitizer.sanitizeString(userName, "userName", {
    isPII: true,
    allowEmpty: false,
  });
  const sanitizedDetails = sanitizer.sanitizeString(details, "details", {
    allowEmpty: true,
  });

  const timestamp = new Date().toISOString();

  // Create structured log entry as JSON object
  const logEntry = {
    timestamp: timestamp,
    action: sanitizedAction,
    userName: sanitizedUserName,
    details: sanitizedDetails,
  };

  // Use Winston logger for async writes with rotation
  return new Promise((resolve, reject) => {
    try {
      // Convert log entry to string for Winston
      const logMessage = JSON.stringify(logEntry);
      logger.info(logMessage, (error: unknown) => {
        if (error) {
          console.error("Failed to write audit log:", error);
          reject(error);
        } else {
          resolve();
        }
      });
    } catch (error) {
      console.error("Failed to write audit log:", error);
      reject(error);
    }
  });
}
