import { Webhook } from "discord.js";
import dotenv from "dotenv";
import npmlog from "npmlog";
import { DataTypes, Sequelize } from "sequelize";

import { Bot } from "./Bot";
import { Mapping } from "./interfaces";
import { MappingModel } from "./models/Mapping";
import getMappings from "./util/mappings";

export class Main {
  static db;
  static mappings: Mapping[];
  static webhooks: Webhook[];

  private bot: Bot;

  constructor() {
    dotenv.config();

    const discordToken = process.env.DISCORD_TOKEN;
    const revoltToken = process.env.REVOLT_TOKEN;

    if (!discordToken || !revoltToken) {
      throw "At least one token was not provided";
    }

    Main.webhooks = [];
  }

  /**
   * Initialize Sequelize
   */
  async initDb(): Promise<Mapping[]> {
    const sequelize = new Sequelize({
      dialect: "sqlite",
      storage: "revcord.sqlite",
      logging: false,
    });

    await sequelize.authenticate();
    npmlog.info("db", "Connection has been established successfully.");

    // Initialize the Mapping model
    // TODO move to a different file/method
    MappingModel.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        discordChannel: {
          type: DataTypes.STRING,
        },
        revoltChannel: {
          type: DataTypes.STRING,
        },
      },
      { sequelize, modelName: "mapping" }
    );

    // Sync
    await sequelize.sync();

    // Load mappings into memory
    const mappingsInDb = await MappingModel.findAll({});
    const mappings = mappingsInDb.map((mapping) => ({
      discord: mapping.discordChannel,
      revolt: mapping.revoltChannel,
    }));

    return mappings;
  }

  /**
   * Start the Web server, Discord and Revolt bots
   */
  public async start(port: number): Promise<void> {
    try {
      // Try to load JSON
      const mappings = await getMappings();
      Main.mappings = mappings;
    } catch {
      // Query the database instead
      try {
        Main.mappings = await this.initDb();
      } catch (e) {
        npmlog.error(
          "db",
          "A database error occured. If you don't know what to do, try removing the `revcord.sqlite` file (will reset all your settings)."
        );
        npmlog.error("db", e);
      }
    } finally {
      this.bot = new Bot();
      this.bot.start();
    }
  }
}
