"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
exports.logAuditAction = logAuditAction;
var fs_1 = __importDefault(require("fs"));
var path_1 = __importDefault(require("path"));
var os_1 = __importDefault(require("os"));
var sanitizer_1 = require("./sanitizer");
var winston_1 = __importDefault(require("winston"));
var winston_daily_rotate_file_1 = __importDefault(require("winston-daily-rotate-file"));
// Configure Winston logger with rotation
var configureWinstonLogger = function () {
    var logDir = path_1.default.join(os_1.default.homedir(), ".gatorlogs");
    // Create log directory asynchronously with strict permissions
    try {
        if (!fs_1.default.existsSync(logDir)) {
            fs_1.default.mkdirSync(logDir, { recursive: true, mode: 448 });
        }
        else {
            // Ensure directory has correct permissions
            fs_1.default.chmodSync(logDir, 448);
        }
    }
    catch (error) {
        console.error("Failed to setup log directory at ".concat(logDir, ":"), error);
        throw error;
    }
    // Configure daily rotate file transport with both time and size based rotation
    var fileTransport = new winston_daily_rotate_file_1.default({
        filename: path_1.default.join(logDir, "audit-%DATE%.log"),
        datePattern: "YYYY-MM-DD",
        maxSize: "10m", // Rotate when file reaches 10MB
        maxFiles: "14d", // Keep logs for 14 days
        level: "info",
        format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json() // JSON/structured output
        ),
        auditFile: path_1.default.join(logDir, "audit.json"), // Track rotated files
        zippedArchive: true, // Compress rotated logs
        createSymlink: true, // Create symlink to current log
        symlinkName: path_1.default.join(logDir, "audit.log"),
        options: {
            flags: "a", // Append mode
            mode: 384, // Strict file permissions
        },
    });
    // Create Winston logger instance
    var logger = winston_1.default.createLogger({
        level: "info",
        transports: [fileTransport],
        exitOnError: false, // Do not exit on logging errors
    });
    // Add error handling for write failures
    logger.on("error", function (error) {
        console.error("Winston logging error:", error);
        // Surface write errors via existing error handling
    });
    return logger;
};
// Initialize logger
var logger = configureWinstonLogger();
exports.logger = logger;
function logAuditAction(action, userName, details) {
    return __awaiter(this, void 0, void 0, function () {
        var sanitizer, sanitizedAction, sanitizedUserName, sanitizedDetails, timestamp, logEntry;
        return __generator(this, function (_a) {
            sanitizer = sanitizer_1.InputSanitizer.createDefault();
            sanitizedAction = sanitizer.sanitizeString(action, "action", {
                allowEmpty: false,
            });
            sanitizedUserName = sanitizer.sanitizeString(userName, "userName", {
                isPII: true,
                allowEmpty: false,
                piiType: "email", // Use email-specific masking for usernames
            });
            sanitizedDetails = sanitizer.sanitizeString(details, "details", {
                allowEmpty: true,
            });
            timestamp = new Date().toISOString();
            logEntry = {
                timestamp: timestamp,
                action: sanitizedAction,
                userName: sanitizedUserName,
                details: sanitizedDetails,
            };
            // Use Winston logger for async writes with rotation
            return [2 /*return*/, new Promise(function (resolve, reject) {
                    try {
                        // Pass log entry as metadata to Winston for proper JSON formatting
                        logger.info("", logEntry, function (error) {
                            if (error) {
                                console.error("Failed to write audit log:", error);
                                reject(error);
                            }
                            else {
                                resolve();
                            }
                        });
                    }
                    catch (error) {
                        console.error("Failed to write audit log:", error);
                        reject(error);
                    }
                })];
        });
    });
}
