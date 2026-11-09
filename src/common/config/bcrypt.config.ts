import { hashSync, compareSync } from 'bcryptjs';
export class BcryptConfig {

  hashPassword(password: string): string {
    return hashSync(password);
  }

  comparePassword(password: string, hashedPassword: string): boolean {
    return compareSync(password, hashedPassword);
  }
}