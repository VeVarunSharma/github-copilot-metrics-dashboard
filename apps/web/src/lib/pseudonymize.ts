import { createHash } from 'node:crypto';

export function pseudonymize(userLogin: string, salt: string) {
  const digest = createHash('sha256').update(`${salt}:${userLogin}`).digest('hex').slice(0, 10);
  return `user-${digest}`;
}
