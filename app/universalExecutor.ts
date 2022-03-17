import { Client as DiscordClient, TextChannel } from "discord.js";
import npmlog from "npmlog";
import { Client as RevoltClient } from "revolt.js";
import { Channel } from "revolt.js/dist/maps/Channels";
import { initiateDiscordChannel, unregisterDiscordChannel } from "./discord";
import { ConnectionPair, Mapping } from "./interfaces";
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
    let discordChannelName;
    let revoltChannelName;

    let revoltChannel = this.revolt.channels.get(revoltTarget);

    if (typeof revoltChannel === "undefined") {
      // Revolt channel name was provided.

      // Loop over channels
      let target: Channel;
      this.revolt.channels.forEach((channel) => {
        if (channel.name.toLowerCase() === revoltTarget.toLowerCase()) {
          target = channel;
        }
      });

      if (!target) throw new ConnectionError("Revolt channel not found.");
      else {
        revoltTarget = target._id;
        revoltChannelName = target.name;
      }
    } else {
      // Revolt channel ID was provided - we're just grabbing the name.
      revoltChannelName = revoltChannel.name;
    }

    let discordChannel: TextChannel;

    try {
      // A correct Discord channel ID was provided
      let chan = await this.discord.channels.fetch(discordTarget);
      if (chan instanceof TextChannel) {
        discordChannel = chan;
        discordChannelName = chan.name;
      } else {
        throw new ConnectionError("We're in a weird position.");
      }
    } catch (e) {
      // A Discord channel name was provided

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

        discordTarget = discordChannel.id;
        discordChannelName = discordChannel.name;
      }
    }

    /*
      By this point, both discordTarget and revoltTarget contain correct channel IDs.
    */

    // Try to find if an existing mapping already exists
    const existingMapping = Main.mappings.find(
      (mapping) => mapping.discord === discordTarget || mapping.revolt === revoltTarget
    );

    if (existingMapping) {
      throw new ConnectionError(
        "Either the Revolt or Discord channel is already bridged. Use the `disconnect` command and then try again."
      );
    }

    const mapping = {
      discord: discordTarget,
      revolt: revoltTarget,
      allowBots: true,
    };

    // Initiate Discord channel (setup webhooks)
    try {
      await initiateDiscordChannel(discordChannel, mapping);

      // Insert into database
      await MappingModel.create({
        discordChannel: discordTarget,
        revoltChannel: revoltTarget,
        discordChannelName: discordChannelName,
        revoltChannelName: revoltChannelName,
        allowBots: true,
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
      const mapping = Main.mappings.find((mapping) => mapping.discord === channelId);
      const match = Main.mappings.map((mapping) => mapping.discord).indexOf(channelId);
      if (match > -1) {
        // Remove the mapping from memory
        Main.mappings.splice(match, 1);

        // And from the database
        await MappingModel.destroy({ where: { discordChannel: channelId } });

        // And remove the webhook
        const channel = await this.discord.channels.fetch(mapping.discord);
        unregisterDiscordChannel(channel, mapping);

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
      const mapping = Main.mappings.find((mapping) => mapping.revolt === channelId);
      const match = Main.mappings.map((mapping) => mapping.revolt).indexOf(channelId);

      if (match > -1) {
        // Remove the mapping from memory
        Main.mappings.splice(match, 1);

        // And from the database
        await MappingModel.destroy({ where: { revoltChannel: channelId } });

        // And remove the webhook
        const channel = await this.discord.channels.fetch(mapping.discord);
        unregisterDiscordChannel(channel, mapping);
      } else {
        throw new ConnectionError("This channel isn't connected to anything.");
      }
    }
  }

  /**
   * Return all existing connections
   */
  async connections(): Promise<ConnectionPair[]> {
    const mappings = await MappingModel.findAll();

    const channelPairs = mappings.map((mapping) => ({
      discord: mapping.discordChannelName,
      revolt: mapping.revoltChannelName,
      allowBots: mapping.allowBots,
    }));

    return channelPairs;
  }

  /**
   * Toggle whether bot messages should be forwarded between a channel pair
   */
  async toggleAllowBots(target: Mapping): Promise<boolean> {
    const index = Main.mappings.indexOf(target);

    if (index > -1) {
      // Update locally
      Main.mappings[index].allowBots = !Main.mappings[index].allowBots;

      const allowBots = Main.mappings[index].allowBots;

      // Update the database
      const affectedRows = await MappingModel.update(
        {
          allowBots,
        },
        {
          where: {
            discordChannel: target.discord,
            revoltChannel: target.revolt,
          },
        }
      );

      if (affectedRows[0] === 0) {
        npmlog.error("db", "No affected rows?");
        throw new ConnectionError("No connection found.");
      }

      return allowBots;
    } else {
      throw new ConnectionError("This channel is not connected.");
    }
  }
}
