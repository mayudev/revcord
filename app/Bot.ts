import { Client as DiscordClient, Collection, GatewayIntentBits } from "discord.js";
import { Client as RevoltClient } from "revolt.js";
import { REST } from "@discordjs/rest";
import npmlog from "npmlog";

import { Main } from "./Main";
import {
  handleDiscordMessage,
  handleDiscordMessageDelete,
  handleDiscordMessageUpdate,
  initiateDiscordChannel,
} from "./discord";
import {
  handleRevoltMessage,
  handleRevoltMessageDelete,
  handleRevoltMessageUpdate,
} from "./revolt";
import { registerSlashCommands } from "./discord/slash";
import { DiscordCommand, PartialDiscordMessage, RevoltCommand } from "./interfaces";
import { slashCommands } from "./discord/commands";
import UniversalExecutor from "./universalExecutor";
import { revoltCommands } from "./revolt/commands";

export class Bot {
  private discord: DiscordClient;
  private revolt: RevoltClient;
  private commands: Collection<string, DiscordCommand>;
  private rest: REST;
  private commandsJson: any;
  // ah yes, using discord.js collections for revolt commands
  private revoltCommands: Collection<string, RevoltCommand>;
  private executor: UniversalExecutor;

  constructor(private usingJsonMappings: boolean) { }

  public async start() {
    this.setupDiscordBot();
    this.setupRevoltBot();
  }

  setupDiscordBot() {
    this.discord = new DiscordClient({
      // I must have GuildMessages to make it working again, thank you discord.js!
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessages
      ],
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
      this.rest = new REST().setToken(process.env.DISCORD_TOKEN);

      this.executor = new UniversalExecutor(this.discord, this.revolt);

      // Initialize slash commands collection
      this.commands = new Collection();

      // Insert exported slash commands into the collection
      slashCommands.map((command) => {
        this.commands.set(command.data.name, command);
      });

      // Convert commands into REST-friendly format
      this.commandsJson = this.commands.map((command) => command.data.toJSON());

      // Do not allow commands when using mappings.json mode.
      if (!this.usingJsonMappings) {
        // Register commands for each guild
        this.discord.guilds.cache.forEach((guild) => {
          registerSlashCommands(this.rest, this.discord, guild.id, this.commandsJson);
        });
      }

      // Create webhooks
      Main.mappings.forEach(async (mapping) => {
        const channel = this.discord.channels.cache.get(mapping.discord);
        try {
          await initiateDiscordChannel(channel, mapping);
        } catch (e) {
          npmlog.error("Discord", "An error occurred while initializing webhooks");
          npmlog.error("Discord", e);
        }
      });
    });

    this.discord.on("interactionCreate", async (interaction) => {
      if (!interaction.isCommand() || this.usingJsonMappings) return;

      const command = this.commands.get(interaction.commandName);

      if (!command) {
        npmlog.info("Discord", "no command");
        return;
      }

      try {
        await command.execute(interaction, this.executor);
      } catch (e) {
        npmlog.error("Discord", "Error while executing slash command");
        npmlog.error("Discord", e);
      }
    });

    this.discord.on("guildCreate", (guild) => {
      if (!this.usingJsonMappings) {
        // Register slash commands in newly added server
        registerSlashCommands(this.rest, this.discord, guild.id, this.commandsJson);
      }
    });

    this.discord.on("messageCreate", message => {
      handleDiscordMessage(this.revolt, this.discord, message)
    });

    // Debugging
    if (process.env.DEBUG && !isNaN(Number(process.env.DEBUG))) {
      if (Number(process.env.DEBUG)) {
        this.discord.on("debug", info => {
          if (info.toLowerCase().includes("heartbeat")) return;
          npmlog.info("DEBUG", info)
        });
      }
    }

    this.discord.on("messageUpdate", (oldMessage, newMessage) => {
      if (oldMessage.applicationId === this.discord.user.id) return;

      const partialMessage: PartialDiscordMessage = {
        author: oldMessage.author,
        attachments: oldMessage.attachments,
        channelId: oldMessage.channelId,
        content: newMessage.content,
        embeds: newMessage.embeds,
        id: newMessage.id,
        mentions: newMessage.mentions,
      };

      handleDiscordMessageUpdate(this.revolt, partialMessage);
    });

    this.discord.on("messageDelete", (message) => {
      if (message.applicationId === this.discord.user.id) return;

      handleDiscordMessageDelete(this.revolt, message.id);
    });

    this.discord.login(process.env.DISCORD_TOKEN);
  }

  setupRevoltBot() {
    this.revolt = new RevoltClient({ apiURL: process.env.API_URL, autoReconnect: true });

    this.revolt.once("ready", () => {
      npmlog.info("Revolt", `Logged in as ${this.revolt.user.username}`);

      // Initialize revolt commands
      this.revoltCommands = new Collection();

      // Insert exported Revolt commands into the collection
      revoltCommands.map((command) => {
        this.revoltCommands.set(command.data.name, command);
      });

      // TODO add permissions self-check
      Main.mappings.forEach(async (mapping) => {
        const channel = this.revolt.channels.get(mapping.revolt);
        try {
          if (channel) {
          }
        } catch (e) {
          npmlog.error("Revolt", e);
        }
      });
    });

    this.revolt.on("message", async (message) => {
      if (message.author.bot !== null) return;

      if (typeof message.content != "string") return;

      if (message.content.toString().startsWith("rc!")) {
        // Handle bot command
        const args = message.content.toString().split(" ");
        const commandName = args[0].slice("rc!".length);
        args.shift();
        const arg = args.join(" ");

        // Try to find the command in collection
        if (this.usingJsonMappings) return;

        if (!this.revoltCommands) return;

        const command = this.revoltCommands.get(commandName);

        if (!command) {
          npmlog.info("Revolt", "no command");
          return;
        }

        try {
          await command.execute(message, arg, this.executor);
        } catch (e) {
          npmlog.error("Revolt", "Error while executing command");
          npmlog.error("Revolt", e);
        }
      } else {
        handleRevoltMessage(this.discord, this.revolt, message);
      }
    });

    this.revolt.on("message/update", async (message) => {
      if (message.author.bot !== null) return;

      if (typeof message.content != "string") return;

      handleRevoltMessageUpdate(this.revolt, message);
    });

    this.revolt.on("message/delete", async (id) => {
      handleRevoltMessageDelete(this.revolt, id);
    });

    this.revolt.loginBot(process.env.REVOLT_TOKEN);
  }
}
