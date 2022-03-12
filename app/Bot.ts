import { Client as DiscordClient, Intents, TextChannel } from "discord.js";
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

      Main.mappings.forEach(async (mapping) => {
        const channel = this.discord.channels.cache.get(mapping.discord);
        try {
          if (channel instanceof TextChannel) {
            const webhooks = await channel.fetchWebhooks();

            // Try to find already created webhook
            let webhook = webhooks.find((wh) => wh.name === "revcord-" + mapping.revolt);

            if (!webhook) {
              npmlog.info("Discord", "Creating webhook for Discord#" + channel.name);
              // No webhook found, create one

              webhook = await channel.createWebhook("revcord-" + mapping.revolt);
            }

            await webhook.send({
              content: "Test",
              username: "Mayu",
              avatarURL:
                "https://autumn.revolt.chat/avatars/vu7G68qbaZOBKekgK8Y44YAt9jpD2M2d3ikikQxmDF",
            });

            Main.webhooks.push(webhook);
          }
        } catch (error) {
          npmlog.error("Discord", "An error occured while initializing webhooks");
          npmlog.error("Discord", error);
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
    });

    this.revolt.on("message", (message) =>
      handleRevoltMessage(this.discord, this.revolt, message)
    );

    this.revolt.loginBot(process.env.REVOLT_TOKEN);
  }
}
