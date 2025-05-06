import bcrypt from "bcrypt";

const saltRounds = 10;

export function hasPassword(password: string) {
  return bcrypt.hash(password, saltRounds);
}

export function comparePassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}