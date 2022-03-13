import { Client, Client as DiscordClient, Intents, TextChannel } from "discord.js";
import { Client as RevoltClient } from "revolt.js";
import npmlog from "npmlog";

import { Main } from "./Main";
import { handleDiscordMessage, initiateDiscordChannel } from "./discord";
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
      allowedMentions: {
        parse: [],
      },
    });

    this.discord.once("ready", () => {
      npmlog.info(
        "Discord",
        `Logged in as ${this.discord.user.username}#${this.discord.user.discriminator}`
      );

      Main.mappings.forEach(async (mapping) => {
        const channel = this.discord.channels.cache.get(mapping.discord);
        try {
          initiateDiscordChannel(channel, mapping);
        } catch (e) {
          npmlog.error("Discord", "An error occured while initializing webhooks");
          npmlog.error("Discord", e);
        }
      });
    });

    this.discord.on("messageCreate", (message) =>
      handleDiscordMessage(this.revolt, message)
    );

    this.discord.login(process.env.DISCORD_TOKEN);
  }

  setupRevoltBot() {
    this.revolt = new RevoltClient();

    this.revolt.once("ready", () => {
      npmlog.info("Revolt", `Logged in as ${this.revolt.user.username}`);

      // TODO add permissions self-check
      Main.mappings.forEach(async (mapping) => {
        const channel = this.revolt.channels.get(mapping.revolt);
        try {
          if (channel) {
            console.log(
              "Permissions for channel " + channel.name + " = " + channel.permission
            );
          }
        } catch (e) {
          npmlog.error("Revolt", e);
        }
      });
    });

    this.revolt.on("message", (message) =>
      handleRevoltMessage(this.discord, this.revolt, message)
    );

    this.revolt.loginBot(process.env.REVOLT_TOKEN);
  }
}
