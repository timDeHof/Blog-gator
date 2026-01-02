import fs from "fs";
import os from "os";
import path from "path";

type Config = {
  dbUrl: string;
  currentUserName: string;
  maskPII: boolean; // PII masking configuration (always set by validateConfig)
  maxLength?: number; // Optional max length configuration
};

export function setUser(userName: string) {
  const config: Config = readConfig();
  if (!config) {
    throw new Error("No config found");
  }
  config.currentUserName = userName;
  writeConfig(config);
}
export function validateConfig(rawConfig: any) {
  if (!rawConfig.db_url || typeof rawConfig.db_url !== "string") {
    throw new Error("Missing 'db_url' property");
  }
  if (
    !rawConfig.current_user_name ||
    typeof rawConfig.current_user_name !== "string"
  ) {
    throw new Error("Missing 'current_user_name' property");
  }

  // Validate mask_pii is a boolean, default to true if invalid
  let maskPII = true; // Default value
  if (rawConfig.mask_pii !== undefined) {
    if (typeof rawConfig.mask_pii === "boolean") {
      maskPII = rawConfig.mask_pii;
    } else {
      console.warn(
        `Invalid type for 'mask_pii': expected boolean, got ${typeof rawConfig.mask_pii}. Using default value: true`
      );
    }
  }

  const config: Config = {
    dbUrl: rawConfig.db_url,
    currentUserName: rawConfig.current_user_name,
    maskPII: maskPII, // Use validated boolean value
    maxLength: rawConfig.max_length !== undefined ? rawConfig.max_length : 1000, // Default to 1000
  };
  return config;
}

export function readConfig(): Config {
  const fullPath = getConfigFilePath();

  const data = fs.readFileSync(fullPath, "utf-8");
  const rawConfig = JSON.parse(data);

  return validateConfig(rawConfig);
}

export function getConfigFilePath(): string {
  const configFileName = ".gatorconfig.json";
  const homeDir = os.homedir();
  return path.join(homeDir, configFileName);
}

export function writeConfig(config: Config): void {
  const fullPath = getConfigFilePath();
  const rawConfig = {
    db_url: config.dbUrl,
    current_user_name: config.currentUserName,
    mask_pii: config.maskPII,
    max_length: config.maxLength,
  };

  const data = JSON.stringify(rawConfig, null, 2);
  fs.writeFileSync(fullPath, data, { encoding: "utf-8" });
}
