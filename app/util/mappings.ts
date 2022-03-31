import npmlog from "npmlog";
import { join } from "path";
import { readFileSync } from "fs";
import { Mapping } from "app/interfaces";

export default async function getMappings(): Promise<Array<Mapping>> {
  try {
    const path = join(process.cwd(), "mappings.json");

    const file = readFileSync(path, "utf-8");
    const data = JSON.parse(file) as Array<Mapping>;
    npmlog.warn("mappings", "mappings.json found");
    npmlog.warn(
      "mappings",
      "Using mappings.json is not recommended as it's not the supported method. Please use commands to configure the bot instead, otherwise you may encounter more bugs."
    );
    return data;
  } catch (err) {
    throw "No mappings";
  }
}
