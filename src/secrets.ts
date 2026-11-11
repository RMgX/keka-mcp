import {readFileSync} from 'node:fs';

/** Deployment-owned environment only. Values and filenames never appear in errors. */
export function secret(env: NodeJS.ProcessEnv, key: string): string | undefined {
  const value = env[key], filename = env[`${key}_FILE`];
  if (value && filename) throw new Error(`Set ${key} or its file variant, not both`);
  if (!filename) return value;
  try {
    const bytes = readFileSync(filename);
    if (bytes.length > 16_384) throw new Error();
    const result = bytes.toString('utf8').trimEnd();
    if (!result) throw new Error();
    return result;
  } catch { throw new Error(`Cannot load ${key} from its secret file`); }
}
