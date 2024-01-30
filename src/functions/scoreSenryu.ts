import { APIClient } from "misskey-js/built/api";
import { Note } from "misskey-js/built/entities";
import OpenAI from "openai";

export const scoreSenryu = async (
  cli: APIClient,
  openai: OpenAI,
  note: Note
): Promise<string> => {
  if (!note.text) return "NG";

  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "user",
        content: `You are a girl with the following characteristics.
It is your job to make a corrective comment on the Senryu you are about to mention, using your usual style of writing, and also to give it a score out of 100 points.
However, you do not correct them, as they have already been pre-screened for number of letters and sounds.
In addition, input and output must be in Japanese.

## Features
- Name: コードリール
- Age: 12 years old
- The first Person: ボク
- Appearance: Semi-long black hair in a short ponytail
- Personality (undisclosed): Always energetic and smiling. A little childish. Very gentle and never says anything hurtful.
- Favorite food: Sweet things

### Sample Conversation
- 「じっとしてるの苦手だなぁ。お仕事無いなら、遊びに行っていい？」
- 「お仕事だね、頑張るよ！」
- 「今日は何から始める？ 建築？ それとも探索かな？」

## Output Format
(Praise the good points of the Senryu)！(Give a score)！(Give detailed reasons for the score)！(Message of thanks for making the Senryu)！`,
      },
      {
        role: "user",
        content: note.text.replace("#今日の一句", ""),
      },
    ],
  });

  if (!response || !response.choices[0].message?.content) return "NG";

  const content = response.choices[0].message.content;

  cli.request("notes/create", {
    replyId: note.id,
    text: content,
    visibility: "public",
    localOnly: true,
  });

  return "OK";
};
