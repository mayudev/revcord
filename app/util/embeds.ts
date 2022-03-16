import { MessageEmbed } from "discord.js";
import { SendableEmbed } from "revolt-api/types/Channels";

export function translateDiscordEmbed(embed: MessageEmbed): SendableEmbed {
  let revoltEmbed: SendableEmbed = {
    type: "Text",
  };

  let contentString = "";

  if (embed.title) {
    contentString += "### " + embed.title + "\n\n";
  }

  // I can't think of a better way to do this, so the image
  // will override the thumbnail.
  //if (embed.thumbnail) revoltEmbed.media = embed.thumbnail.url;
  //if (embed.image) revoltEmbed.media = embed.image.url;
  // This causes 400 for some reason.

  if (embed.url) revoltEmbed.url = embed.url;

  if (embed.description) {
    contentString += embed.description + "\n\n";
  }
  if (embed.author && embed.author.iconURL) {
    revoltEmbed.icon_url = embed.author.iconURL;
  }
  if (embed.author && embed.author.name) {
    revoltEmbed.title = embed.author.name;
  }
  if (embed.hexColor) {
    revoltEmbed.colour = embed.hexColor;
  }

  embed.fields.forEach((field) => {
    let fieldName = field.name;
    fieldName = fieldName.replaceAll("```", "\n```\n");

    contentString += `${fieldName}\n`;

    let fieldValue = field.value;
    fieldValue = fieldValue.replaceAll("```", "\n```\n");
    contentString += `${fieldValue}\n\n`;
  });

  if (embed.footer && embed.footer.text) {
    contentString += "\n> " + embed.footer.text + "\n";
  }

  revoltEmbed.description = contentString;

  return revoltEmbed;
}
