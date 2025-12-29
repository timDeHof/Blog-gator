import fs from "fs";
import os from "os";
import path from "path";

type Config = {
  dbUrl: string;
  currentUserName: string;
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
  const config: Config = {
    dbUrl: rawConfig.db_url,
    currentUserName: rawConfig.current_user_name,
  };
  return config;
}

export function readConfig(): Config {
  const fullPath = getConfigFilePath();

  if (!fs.existsSync(fullPath)) {
    throw new Error(`Config file not found at ${fullPath}`);
  }

  const data = fs.readFileSync(fullPath, "utf-8");
  if (!data.trim()) {
    throw new Error(
      `Config file at ${fullPath} is empty or contains only whitespace`
    );
  }

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
  };

  const data = JSON.stringify(rawConfig, null, 2);
  fs.writeFileSync(fullPath, data, "utf-8");
}
