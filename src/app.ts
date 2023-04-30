import * as Misskey from "misskey-js";
import WebSocket from "ws";
import { Configuration, OpenAIApi } from "openai";
import * as dotenv from "dotenv";
import { react, scoreSenryu } from "./functions";

dotenv.config();

const main = async () => {
  if (
    !process.env.MISSKEY_HOST ||
    !process.env.MISSKEY_TOKEN ||
    !process.env.OPENAI_API_KEY
  ) {
    console.error(
      "MISSKEY_HOST, MISSKEY_TOKEN and OPENAI_API_KEY must be included in the .env file."
    );
    process.exit(1);
  }

  const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  });
  const openai = new OpenAIApi(configuration);

  const cli = new Misskey.api.APIClient({
    origin: process.env.MISSKEY_HOST,
    credential: process.env.MISSKEY_TOKEN,
  });

  const stream = new Misskey.Stream(
    process.env.MISSKEY_HOST,
    {
      token: process.env.MISSKEY_TOKEN,
    },
    WebSocket
  );

  const LtlChannel = stream.useChannel("localTimeline");
  LtlChannel.on("note", async (note) => {
    if (!note.text) return;

    if (/#今日の一句/.test(note.text)) {
      const result = await scoreSenryu(cli, openai, note).catch((error) =>
        console.error(error)
      );
      if (result !== "OK") {
        console.error(result);
        process.exit(1);
      }
    } else {
      const result = await react(cli, openai, note);
      if (result !== "OK") {
        console.error(result);
        process.exit(1);
      }
    }
  });
};

main();
