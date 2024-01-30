import { APIClient } from "misskey-js/built/api";
import { Note } from "misskey-js/built/entities";
import OpenAI from "openai";

export const react = async (
  cli: APIClient,
  openai: OpenAI,
  note: Note
): Promise<string> => {
  const ignoreEmojis = ["👀", "🤔", "🤷‍♂️", "🤷‍♀️"];

  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "user",
        content:
          "Reply to the following social networking post with just one emoji",
      },
      {
        role: "user",
        content: note.text ?? "",
      },
    ],
  });

  if (!response || !response.choices[0].message?.content) return "NG";

  const emoji = response.choices[0].message.content;

  if (!ignoreEmojis.includes(emoji)) {
    cli.request("notes/reactions/create", {
      noteId: note.id,
      reaction: response.choices[0].message?.content,
    });
  }

  return "OK";
};
