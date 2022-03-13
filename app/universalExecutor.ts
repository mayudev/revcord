import { Client as DiscordClient, TextChannel } from "discord.js";
import npmlog from "npmlog";
import { Client as RevoltClient } from "revolt.js";
import { Channel } from "revolt.js/dist/maps/Channels";
import { initiateDiscordChannel } from "./discord";
import { Main } from "./Main";
import { MappingModel } from "./models/Mapping";

export class ConnectionError extends Error {}

// I've commited chuunibyou with this name
export default class UniversalExecutor {
  constructor(private discord: DiscordClient, private revolt: RevoltClient) {}

  async connect(discordTarget: string, revoltTarget: string) {
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
}
