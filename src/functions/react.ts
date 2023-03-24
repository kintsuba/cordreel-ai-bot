import { APIClient } from "misskey-js/built/api";
import { Note } from "misskey-js/built/entities";
import { OpenAIApi } from "openai";

export const react = async (
  cli: APIClient,
  openai: OpenAIApi,
  note: Note
): Promise<string> => {
  const response = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
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

  if (
    response.statusText !== "OK" ||
    !response.data.choices[0].message?.content
  )
    return "NG";

  if (response.data.choices[0].message.content !== "👀") {
    cli.request("notes/reactions/create", {
      noteId: note.id,
      reaction: response.data.choices[0].message?.content,
    });
  }

  return "OK";
};
