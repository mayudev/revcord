import npmlog from "npmlog";
import { join } from "path";
import { readFileSync } from "fs";
import { Mapping } from "app/interfaces";

export default async function getMappings(): Promise<Array<Mapping>> {
  try {
    const path = join(process.cwd(), "mappings.json");

    const file = readFileSync(path, "utf-8");
    const data = JSON.parse(file) as Array<Mapping>;
    return data;
  } catch (err) {
    npmlog.warn("mappings", "No mappings.json found");
    throw "No mappings";
  }
}
