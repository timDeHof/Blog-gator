"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setUser = setUser;
exports.validateConfig = validateConfig;
exports.readConfig = readConfig;
exports.getConfigFilePath = getConfigFilePath;
exports.writeConfig = writeConfig;
var fs_1 = __importDefault(require("fs"));
var os_1 = __importDefault(require("os"));
var path_1 = __importDefault(require("path"));
function setUser(userName) {
    var config = readConfig();
    if (!config) {
        throw new Error("No config found");
    }
    config.currentUserName = userName;
    writeConfig(config);
}
function validateConfig(rawConfig) {
    if (!rawConfig.db_url || typeof rawConfig.db_url !== "string") {
        throw new Error("Missing 'db_url' property");
    }
    if (!rawConfig.current_user_name ||
        typeof rawConfig.current_user_name !== "string") {
        throw new Error("Missing 'current_user_name' property");
    }
    // Validate mask_pii is a boolean, default to true if invalid
    var maskPII = true; // Default value
    if (rawConfig.mask_pii !== undefined) {
        if (typeof rawConfig.mask_pii === "boolean") {
            maskPII = rawConfig.mask_pii;
        }
        else {
            console.warn("Invalid type for 'mask_pii': expected boolean, got ".concat(typeof rawConfig.mask_pii, ". Using default value: true"));
        }
    }
    var config = {
        dbUrl: rawConfig.db_url,
        currentUserName: rawConfig.current_user_name,
        maskPII: maskPII, // Use validated boolean value
        maxLength: rawConfig.max_length !== undefined ? rawConfig.max_length : 1000, // Default to 1000
    };
    return config;
}
function readConfig() {
    var fullPath = getConfigFilePath();
    var data = fs_1.default.readFileSync(fullPath, "utf-8");
    var rawConfig = JSON.parse(data);
    return validateConfig(rawConfig);
}
function getConfigFilePath() {
    var configFileName = ".gatorconfig.json";
    var homeDir = os_1.default.homedir();
    return path_1.default.join(homeDir, configFileName);
}
function writeConfig(config) {
    var fullPath = getConfigFilePath();
    var rawConfig = {
        db_url: config.dbUrl,
        current_user_name: config.currentUserName,
        mask_pii: config.maskPII,
        max_length: config.maxLength,
    };
    var data = JSON.stringify(rawConfig, null, 2);
    fs_1.default.writeFileSync(fullPath, data, { encoding: "utf-8" });
}
