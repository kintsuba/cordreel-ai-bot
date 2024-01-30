import { APIClient } from "misskey-js/built/api";
import { Note } from "misskey-js/built/entities";
import OpenAI from "openai";
import { getSystemErrorMap } from "util";

interface Quiz {
  question: string;
  options: string[];
  answerIndex: number;
}

export const quiz = async (
  cli: APIClient,
  openai: OpenAI,
  note: Note
): Promise<string> => {
  if (!note.text) return "NG";

  const matched = note.text.match(/(?:クイズ|くいず|quiz)(?:\s|　)(.+)/i);
  const genre = matched ? `「${matched[1]} 」ジャンルの` : "ノンジャンル";

  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content:
          'あなたは優秀なアシスタントです。あなたはあらゆるジャンルのクイズを作ることが出来ます。日本語で回答してください。{"question": "問題", "options":["回答1", "回答2", "回答3", "回答4"], "answerIndex": 0}のJSON形式で返却してください。',
      },
      {
        role: "user",
        content: `${genre}クイズを、1問作ってください。4択クイズでお願いします。`,
      },
    ],
  });

  const replyFailureMessage = () => {
    cli.request("notes/create", {
      replyId: note.id,
      text: "失敗しちゃったみたい。もう一度試してみてね",
      visibility: "public",
      localOnly: true,
    });
  };

  if (!response || !response.choices[0].message?.content) {
    replyFailureMessage();
    return "OK";
  }

  const content = response.choices[0].message.content;
  let quiz: Quiz | undefined = undefined;

  try {
    quiz = JSON.parse(content) as Quiz;
  } catch (e) {
    if (e instanceof SyntaxError) {
      replyFailureMessage();
      return "OK";
    } else {
      throw e;
    }
  }

  const { createdNote } = await cli.request("notes/create", {
    replyId: note.id,
    text: quiz.question,
    visibility: "public",
    localOnly: true,
    poll: {
      choices: quiz.options,
      expiredAfter: 300000,
    },
  });

  setTimeout(() => {
    const nowNote = cli.request("notes/show", { noteId: createdNote.id });
    cli.request("notes/create", {
      replyId: createdNote.id,
      text: `正解は**${quiz?.options[quiz.answerIndex]}**でした！`,
      visibility: "public",
      localOnly: true,
    });
  }, 300000);

  return "OK";
};
