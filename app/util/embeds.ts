import { Embed } from "discord.js";
import type { SendableEmbed } from "revolt-api";

interface Field {
  name: string;
  content: string;
}

export class RevcordEmbed {
  constructor() {}

  title: string;
  content: string;
  description: string;
  color: string;
  url: string;
  author: string;
  iconURL: string;
  footer: string;

  fields: Field[];

  fromDiscord(embed: Embed) {
    if (embed.title) {
      this.title = embed.title;
    }

    if (embed.url) this.url = embed.url;

    if (embed.description) {
      this.description = embed.description;
    }

    if (embed.author && embed.author.iconURL) {
      this.iconURL = embed.author.iconURL;
    }

    if (embed.author && embed.author.name) {
      this.author = embed.author.name;
    }

    if (embed.hexColor) {
      this.color = embed.hexColor;
    }

    if (embed.footer && embed.footer.text) {
      this.footer = embed.footer.text;
    }

    this.fields = embed.fields.map((field) => ({
      name: field.name,
      content: field.value,
    }));

    return this;
  }

  // Creates a Revolt embed
  toRevolt(): SendableEmbed {
    let result: SendableEmbed = {};

    let content = "";

    // Apply title
    if (this.title) {
      content += "### " + this.title + "\n\n";
    }

    // I can't think of a better way to do this, so the image
    // will override the thumbnail.
    //if (embed.thumbnail) revoltEmbed.media = embed.thumbnail.url;
    //if (embed.image) revoltEmbed.media = embed.image.url;
    // This causes 400 for some reason.
    // update: it seems the url has to be hosted on autumn. too lazy to do that :trol:
    if (this.url) result.url = this.url;

    if (this.description) content += this.description + "\n\n";

    if (this.author) result.title = this.author;

    if (this.iconURL) result.icon_url = this.iconURL;

    if (this.color) result.colour = this.color;

    if (this.footer) content += "\n> " + this.footer + "\n";

    // Process fields
    this.fields.forEach((field) => {
      // Fix formatting
      let name = field.name.replaceAll("```", "\n```\n");

      // Append to content string
      content += name + "\n";

      let fieldContent = field.content.replaceAll("```", "\n```\n");

      content += fieldContent + "\n";
    });

    result.description = content;

    return result;
  }
}
