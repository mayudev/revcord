import { RevoltCommand } from "../interfaces";
import universalExecutor from "../universalExecutor";
import npmlog from "npmlog";
import { Message } from "revolt.js/dist/maps/Messages";
import type { SendableEmbed } from "revolt-api";

export class ListConnectionsCommand implements RevoltCommand {
  data = {
    name: "connections",
    description: "Show existing connections",
  };

  async execute(
    message: Message,
    args: string,
    executor: universalExecutor
  ): Promise<void> {
    try {
      const connections = await executor.connections();

      let replyEmbed: SendableEmbed = {
        title: "Connected channels",
        colour: "#5765f2",
      };

      if (connections.length) {
        let desc = "";
        connections.forEach((connection) => {
          desc += `
\`\`\`
\#${connection.revolt} => ${connection.discord}
Bots allowed: ${connection.allowBots ? "yes" : "no"}
\`\`\`
`;
        });

        replyEmbed.description = desc;
      } else {
        replyEmbed.description = "No connections found.";
      }

      await message.reply({
        content: " ",
        embeds: [replyEmbed],
      });
    } catch (e) {
      npmlog.error("Discord", "An error occurred while fetching connections");
      npmlog.error("Discord", e);

      await message.reply("An error happened. Check logs.");
    }
  }
}
