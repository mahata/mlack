import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const SALT_LENGTH = 32;
const KEY_LENGTH = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH).toString("hex");
  const hash = await new Promise<string>((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(derivedKey.toString("hex"));
    });
  });
  return `${salt}:${hash}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [salt, hash] = storedHash.split(":");
  const effectiveSalt = salt || randomBytes(SALT_LENGTH).toString("hex");

  const derivedKey = await new Promise<Buffer>((resolve, reject) => {
    scrypt(password, effectiveSalt, KEY_LENGTH, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(derivedKey);
    });
  });

  if (!salt || !hash) return false;

  const storedBuffer = Buffer.from(hash, "hex");
  if (derivedKey.length !== storedBuffer.length) return false;
  return timingSafeEqual(derivedKey, storedBuffer);
}
