import express, { Express, Request, Response } from "express";
import { Client as DiscordClient, Intents, TextChannel } from "discord.js";
import { Client as RevoltClient } from "revolt.js";
import dotenv from "dotenv";
import npmlog from "npmlog";

import getMappings from "./util/mappings";
import { Mapping } from "./interfaces";

export class Bot {
  private app: Express;
  private discord: DiscordClient;
  private revolt: RevoltClient;
  private mappings: Array<Mapping>;

  constructor() {
    dotenv.config();

    const discordToken = process.env.DISCORD_TOKEN;
    const revoltToken = process.env.REVOLT_TOKEN;

    if (!discordToken || !revoltToken) {
      throw "At least one token was not provided";
    }
  }

  setupWebUI() {
    // Initialize WebUI server
    this.app = express();

    this.app.get("/api", (req: Request, res: Response) => {
      res.send("You have reached the API!");
    });
  }

  setupDiscord() {
    this.discord = new DiscordClient({
      intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES],
    });

    this.discord.once("ready", () => {
      npmlog.info(
        "Discord",
        `Logged in as ${this.discord.user.username}#${this.discord.user.discriminator}`
      );
    });

    this.discord.on("messageCreate", (message) => {
      if (message.author.bot) return;

      try {
        // Find target Revolt channel
        const target = this.mappings.find((mapping) => mapping.discord === message.channelId);

        if (target) {
          const mask = {
            name: message.author.username + "#" + message.author.discriminator,
            avatar: message.author.avatarURL(),
          };

          let messageString = "";
          messageString += message.content + "\n";

          message.attachments.forEach((attachment) => {
            messageString += attachment.url + "\n";
          });

          // revolt.js doesn't support masquerade yet, but we can use them using this messy trick.
          this.revolt.channels.get(target.revolt).sendMessage({
            content: messageString,
            masquerade: mask,
          } as any);
        }
      } catch (e) {
        npmlog.error("Revolt", "Couldn't send a message to Revolt");
      }
    });

    this.discord.login(process.env.DISCORD_TOKEN);
  }

  setupRevolt() {
    this.revolt = new RevoltClient();

    this.revolt.once("ready", () => {
      console.log("a");
      npmlog.info("Revolt", `Logged in as ${this.revolt.user.username}`);
    });

    this.revolt.on("message", (message) => {
      if (message.author.bot !== null) return;

      try {
        // Find target Discord channel
        const target = this.mappings.find((mapping) => mapping.revolt === message.channel_id);

        if (target) {
          const channel = this.discord.channels.fetch(target.discord);

          let messageString = "";
          messageString += message.content + "\n";

          if (message.attachments !== null) {
            message.attachments.forEach((attachment) => {
              messageString += this.revolt.generateFileURL(attachment) + "\n";
            });
          }

          channel.then((channel) => {
            if (channel instanceof TextChannel) {
              channel.send(`[${message.author.username}] ${messageString}`);
            }
          });
        }
      } catch (e) {
        npmlog.error("Discord", "Couldn't send a message to Discord", e);
      }
    });

    this.revolt.loginBot(process.env.REVOLT_TOKEN);
  }

  public start(port: number): void {
    // Try to load JSON mappings
    getMappings()
      .then((mappings) => {
        this.mappings = mappings;
      })
      .catch((err) => {
        // JSON mappings don't exist, use the normal method.
      })
      .finally(() => {
        this.setupWebUI();
        this.setupDiscord();
        this.setupRevolt();

        this.app.listen(port, () => {
          npmlog.info("WebUI", `Server listening on port ${port}`);
        });
      });
  }
}
