import { Client as DiscordClient, TextChannel } from "discord.js";
import npmlog from "npmlog";
import { Client as RevoltClient } from "revolt.js";
import { Channel } from "revolt.js/dist/maps/Channels";
import { initiateDiscordChannel } from "./discord";
import { Main } from "./Main";
import { MappingModel } from "./models/Mapping";

export class ConnectionError extends Error {}

export type Platforms = "discord" | "revolt";

// I've commited chuunibyou with this name
export default class UniversalExecutor {
  constructor(private discord: DiscordClient, private revolt: RevoltClient) {}

  /**
   * Create a new bridge
   * @param discordTarget Discord channel name or id
   * @param revoltTarget Revolt channel name or id
   */
  async connect(discordTarget: string, revoltTarget: string) {
    // Find an existing mapping
    const existingMapping = Main.mappings.find(
      (mapping) => mapping.discord === discordTarget || mapping.revolt === revoltTarget
    );

    if (existingMapping) {
      throw new ConnectionError(
        "Either the Revolt or Discord channel is already bridged. Use the `disconnect` command and then try again."
      );
    }

    if (typeof this.revolt.channels.get(revoltTarget) === "undefined") {
      // Look in channel names
      let target: Channel;
      this.revolt.channels.forEach((channel) => {
        if (channel.name.toLowerCase() === revoltTarget.toLowerCase()) {
          target = channel;
        }
      });

      if (!target) throw new ConnectionError("Revolt channel not found.");
      else revoltTarget = target._id;
    }

    let discordChannel: TextChannel;

    try {
      // If it passes, a correct Discord channel id was provided.
      let chan = await this.discord.channels.fetch(discordTarget);
      if (chan instanceof TextChannel) {
        discordChannel = chan;
      } else {
        throw new ConnectionError("We're in a weird position.");
      }
    } catch (e) {
      // Look for name
      let channel = this.discord.channels.cache.find((channel) => {
        if (channel instanceof TextChannel) {
          return channel.name.toLowerCase() === discordTarget.toLowerCase();
        }
        return false;
      });

      if (!channel) {
        throw new ConnectionError("Discord channel not found.");
      } else {
        // Must be TextChannel, because checks were performed earlier.
        discordChannel = channel as TextChannel;
        console.log("channel found");
      }
    }

    // Everything went well.
    const mapping = {
      discord: discordTarget,
      revolt: revoltTarget,
    };
    // Initiate Discord channel (setup webhooks)

    try {
      await initiateDiscordChannel(discordChannel, mapping);

      // Insert into database
      await MappingModel.create({
        discordChannel: discordTarget,
        revoltChannel: revoltTarget,
      });

      // Push into memory
      Main.mappings.push(mapping);
    } catch (e) {
      npmlog.error("Discord", e);
      throw new ConnectionError(
        "Something went wrong. Are you sure the bot has Manage Webhooks permission in Discord?"
      );
    }
  }

  /**
   * Remove a bridge
   * @param platform Platform the command is being called from
   * @param channelId ID for channel the command is being called from
   */
  async disconnect(platform: Platforms, channelId: string) {
    if (platform === "discord") {
      const match = Main.mappings.map((mapping) => mapping.discord).indexOf(channelId);
      if (match > -1) {
        // Remove the mapping from memory
        Main.mappings.splice(match, 1);

        // And from the database
        await MappingModel.destroy({ where: { discordChannel: channelId } });

        /*
          Consideration: only the first match is removed from memory, while all
          occurences are removed from database. This shouldn't be an issue, though,
          since the connect method checks if the entry already exists in database.
        */
      } else {
        throw new ConnectionError("This channel isn't connected to anything.");
      }

      return;
    } else if (platform === "revolt") {
      const match = Main.mappings.map((mapping) => mapping.revolt).indexOf(channelId);

      if (match > -1) {
        Main.mappings.splice(match, 1);

        await MappingModel.destroy({ where: { revoltChannel: channelId } });
      } else {
        throw new ConnectionError("This channel isn't connected to anything.");
      }
    }
  }
}
