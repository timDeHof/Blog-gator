import { readConfig, setUser } from "./config";
function main() {
  setUser("TimothyDeHof");
  const config = readConfig();
  console.log(config);
}

main();
