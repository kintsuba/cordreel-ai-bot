import { User } from "misskey-js/built/entities";

export function acct(user: User): string {
  return user.host ? `@${user.username}@${user.host}` : `@${user.username}`;
}
