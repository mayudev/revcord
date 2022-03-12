import { Client as DiscordClient, Intents } from "discord.js";
import { Client as RevoltClient } from "revolt.js";
import npmlog from "npmlog";

import { Main } from "./Main";
import { handleDiscordMessage } from "./discord";
import { handleRevoltMessage } from "./revolt";

export class Bot {
  private discord: DiscordClient;
  private revolt: RevoltClient;

  constructor() {}

  public async start() {
    this.setupDiscordBot();
    this.setupRevoltBot();
  }

  setupDiscordBot() {
    this.discord = new DiscordClient({
      intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES],
    });

    this.discord.once("ready", () => {
      npmlog.info(
        "Discord",
        `Logged in as ${this.discord.user.username}#${this.discord.user.discriminator}`
      );
    });

    this.discord.on("messageCreate", (message) => handleDiscordMessage(this.revolt, message));

    this.discord.login(process.env.DISCORD_TOKEN);
  }

  setupRevoltBot() {
    this.revolt = new RevoltClient();

    this.revolt.once("ready", () => {
      npmlog.info("Revolt", `Logged in as ${this.revolt.user.username}`);
    });

    this.revolt.on("message", (message) => handleRevoltMessage(this.discord, this.revolt, message));

    this.revolt.loginBot(process.env.REVOLT_TOKEN);
  }
}
