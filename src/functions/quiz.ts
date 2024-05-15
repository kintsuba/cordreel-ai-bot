import { APIClient } from "misskey-js/built/api";
import { Note, User } from "misskey-js/built/entities";
import { acct } from "../util";
import OpenAI from "openai";

interface Quiz {
  question: string;
  options: string[];
  answerIndex: number;
  correctUserNames: string[];
}

const quizzes = new Map<string, Quiz>();

export const question = async (
  cli: APIClient,
  openai: OpenAI,
  note: Note
): Promise<string> => {
  if (!note.text) return "NG";

  const matched = note.text.match(/(?:クイズ|くいず|quiz)(?:\s|　)(.+)/i);
  const genre = matched ? `「${matched[1]} 」ジャンルの` : "ノンジャンル";

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          'あなたは優秀なアシスタントです。あなたはあらゆるジャンルのクイズを作ることが出来ます。日本語で回答してください。必ず {"question": "問題", "options":["回答1", "回答2", "回答3", "回答4"], "answerIndex": 0, correctUserNames: []} のJSON形式で返却してください。また、クイズは正答率が25%程度になるような難しい問題である必要があります。',
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
    renoteId: note.id,
    text: quiz.question,
    visibility: "public",
    poll: {
      choices: quiz.options,
      expiredAfter: 3600000,
    },
  });

  quizzes.set(createdNote.id, quiz);

  return "OK";
};

export const answer = async (
  cli: APIClient,
  user: User,
  note: Note,
  choice: number
) => {
  const quiz = quizzes.get(note.id);

  if (choice === quiz?.answerIndex) {
    await cli.request("notes/create", {
      replyId: note.id,
      text: `正解！`,
      visibility: "specified",
      visibleUserIds: [user.id],
    });

    quiz.correctUserNames.push(acct(user));

    return "OK";
  } else {
    await cli.request("notes/create", {
      replyId: note.id,
      text: `残念、正解は**${quiz?.options[quiz.answerIndex]}**でした！`,
      visibility: "specified",
      visibleUserIds: [user.id],
    });

    return "OK";
  }
};

export const closeQuiz = async (cli: APIClient, noteId: string) => {
  const quiz = quizzes.get(noteId);

  if (quiz?.correctUserNames.length !== 0) {
    await cli.request("notes/create", {
      replyId: noteId,
      text:
        `正解は**${quiz?.options[quiz.answerIndex]}**` +
        "でした！\n正解者はこちら！\n" +
        quiz?.correctUserNames.join("\n"),
      visibility: "public",
    });
  } else {
    await cli.request("notes/create", {
      replyId: noteId,
      text:
        "残念、正解者はいませんでした……。\n" +
        `正解は**${quiz?.options[quiz.answerIndex]}**でした！`,
      visibility: "public",
    });
  }

  quizzes.delete(noteId);

  return "OK";
};
