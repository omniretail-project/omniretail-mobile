import type {
  ChangePasswordInput,
  LoginInput,
  PasswordResetRequestInput,
  PasswordResetVerificationInput,
  RegisterCustomerInput,
  ResetPasswordInput,
} from "../types";
import type { Customer, Session, User } from "../entities";

export type AuthResult = {
  user: User;
  customer: Customer;
  session: Session;
};

export type MfaChallengeResult = {
  kind: "mfaRequired";
  challengeToken: string;
  method: "email" | "totp";
};

export type LoginResult = AuthResult | MfaChallengeResult;

/**
 * El registro puede iniciar sesión de inmediato (mock) o dejar la cuenta pendiente
 * de verificar el correo (backend real).
 */
export type RegistrationResult =
  | { kind: "authenticated"; auth: AuthResult }
  | { kind: "verificationRequired"; email: string; message?: string };

export interface AuthRepository {
  login(input: LoginInput): Promise<LoginResult>;
  verifyMfaChallenge?(challengeToken: string, code: string): Promise<AuthResult>;
  registerCustomer(input: RegisterCustomerInput): Promise<RegistrationResult>;
  /** Confirma el correo con el token del enlace enviado al registrarse. */
  verifyEmail?(token: string): Promise<void>;
  resendVerificationEmail?(email: string): Promise<string>;
  logout(): Promise<void>;
  getCurrentSession(): Promise<Session | null>;
  changePassword(input: ChangePasswordInput): Promise<void>;
  requestPasswordReset(input: PasswordResetRequestInput): Promise<void>;
  verifyPasswordResetCode(input: PasswordResetVerificationInput): Promise<boolean>;
  resetPassword(input: ResetPasswordInput): Promise<void>;
}
