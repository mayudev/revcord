import dotenv from "dotenv";
import { Bot } from "./Bot";
import { Mapping } from "./interfaces";
import getMappings from "./util/mappings";

export class Main {
  static db;
  static mappings: Mapping[];

  private bot: Bot;

  constructor() {
    dotenv.config();

    const discordToken = process.env.DISCORD_TOKEN;
    const revoltToken = process.env.REVOLT_TOKEN;

    if (!discordToken || !revoltToken) {
      throw "At least one token was not provided";
    }
  }

  /**
   * Start the Web server, Discord and Revolt bots
   */
  public async start(port: number): Promise<void> {
    // Try to load JSON
    try {
      const mappings = await getMappings();
      Main.mappings = mappings;
    } catch {
      // Query the database instead
    } finally {
      this.bot = new Bot();
      this.bot.start();
    }
  }
}
