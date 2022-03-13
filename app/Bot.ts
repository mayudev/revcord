import { Client as DiscordClient, Collection, Intents } from "discord.js";
import { Client as RevoltClient } from "revolt.js";
import { REST } from "@discordjs/rest";
import npmlog from "npmlog";

import { Main } from "./Main";
import { handleDiscordMessage, initiateDiscordChannel } from "./discord";
import { handleRevoltMessage } from "./revolt";
import { registerSlashCommands } from "./discord/slash";
import { DiscordCommand } from "./interfaces";
import { slashCommands } from "./discord/commands";

export class Bot {
  private discord: DiscordClient;
  private revolt: RevoltClient;
  private commands: Collection<string, DiscordCommand>;

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

      // Register slash commands
      const rest = new REST({ version: "9" }).setToken(process.env.DISCORD_TOKEN);

      // Initialize slash commands collection
      this.commands = new Collection();

      // Insert exported slash commands into the collection
      slashCommands.map((command) => {
        this.commands.set(command.data.name, command);
      });

      // Convert commands into REST-friendly format
      let commandsJson = this.commands.map((command) => command.data.toJSON());

      // Register commands for each guild
      this.discord.guilds.cache.forEach((guild) => {
        registerSlashCommands(rest, this.discord, guild.id, <any>commandsJson);
      });

      // Create webhooks
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

    this.discord.on("interactionCreate", async (interaction) => {
      if (!interaction.isCommand()) return;

      const command = this.commands.get(interaction.commandName);

      if (!command) {
        npmlog.info("Discord", "no command");
        return;
      }

      try {
        await command.execute(interaction);
      } catch (e) {
        npmlog.error("Discord", "Error while executing slash command");
        npmlog.error("Discord", e);
      }
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
