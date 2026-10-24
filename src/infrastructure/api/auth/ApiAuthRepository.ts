import {
  UserStatus,
  type AuthRepository,
  type AuthResult,
  type LoginResult,
  type ChangePasswordInput,
  type LoginInput,
  type PasswordResetRequestInput,
  type PasswordResetVerificationInput,
  type RegisterCustomerInput,
  type RegistrationResult,
  type ResetPasswordInput,
  type Session,
  type User,
} from "@/core";

import { ApiError } from "../ApiError";
import type { ApiClient } from "../ApiClient";
import type { SessionStorage } from "../../storage";
import { ApiCustomerRepository } from "./ApiCustomerRepository";
import { ApiTokenStorage } from "./ApiTokenStorage";
import type {
  ApiCurrentSessionResponse,
  ApiLoginResponse,
  ApiLoginOutcome,
  ApiRegisterCustomerResponse,
} from "./types";

export class ApiAuthRepository implements AuthRepository {
  constructor(
    private readonly apiClient: ApiClient,
    private readonly tokenStorage: ApiTokenStorage,
    private readonly sessionStorage: SessionStorage,
    private readonly customerRepository: ApiCustomerRepository,
    private readonly tenantSlug: string,
  ) {}

  async login(input: LoginInput): Promise<LoginResult> {
    try {
      const response =
        await this.apiClient.post<ApiLoginOutcome>(
          "/auth/login",
          {
            email: input.email.trim(),
            password: input.password,
            rememberMe: Boolean(input.rememberMe),
            tenantSlug: this.tenantSlug,
            expectedUserType: "customer",
          },
        );

      if ("challengeToken" in response) {
        return {
          kind: "mfaRequired",
          challengeToken: response.challengeToken,
          method: response.method,
        };
      }

      await this.tokenStorage.saveToken(response.token);

      try {
        return await this.restoreFromBackend();
      } catch (error) {
        await this.clearLocalSession();
        throw error;
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await this.clearLocalSession();
      }

      throw error;
    }
  }

  async loginWithGoogle(
    idToken: string,
    rememberMe = true,
  ): Promise<LoginResult> {
    const response = await this.apiClient.post<ApiLoginOutcome>(
      "/auth/google",
      {
        idToken,
        tenantSlug: this.tenantSlug,
        expectedUserType: "customer",
        rememberMe,
      },
    );

    if ("challengeToken" in response) {
      return {
        kind: "mfaRequired",
        challengeToken: response.challengeToken,
        method: response.method,
      };
    }

    await this.tokenStorage.saveToken(response.token);

    try {
      return await this.restoreFromBackend();
    } catch (error) {
      await this.clearLocalSession();
      throw error;
    }
  }

  async verifyMfaChallenge(
    challengeToken: string,
    code: string,
  ): Promise<AuthResult> {
    const response = await this.apiClient.post<ApiLoginResponse>(
      "/auth/mfa/verify",
      { challengeToken, code },
    );

    await this.tokenStorage.saveToken(response.token);

    try {
      return await this.restoreFromBackend();
    } catch (error) {
      await this.clearLocalSession();
      throw error;
    }
  }

  async getCurrentSession(): Promise<Session | null> {
    const token = await this.tokenStorage.getToken();

    if (!token) {
      await this.sessionStorage.clearSession();
      this.customerRepository.clearCurrentCustomer();
      return null;
    }

    try {
      const result = await this.restoreFromBackend();
      return result.session;
    } catch (error) {
      if (
        error instanceof ApiError &&
        (error.status === 401 || error.status === 403)
      ) {
        await this.clearLocalSession();
        return null;
      }

      if (
        error instanceof ApiError &&
        (error.code === "NETWORK_ERROR" ||
          error.code === "REQUEST_TIMEOUT")
      ) {
        return null;
      }

      throw error;
    }
  }

  async logout(): Promise<void> {
    const token = await this.tokenStorage.getToken();

    try {
      if (token) {
        await this.apiClient.post<void>("/auth/logout");
      }
    } finally {
      await this.clearLocalSession();
    }
  }

  async registerCustomer(
    input: RegisterCustomerInput,
  ): Promise<RegistrationResult> {
    const response =
      await this.apiClient.post<ApiRegisterCustomerResponse>(
        `/public/${encodeURIComponent(this.tenantSlug)}/auth/register`,
        {
          name: input.name.trim(),
          email: input.email.trim(),
          phone: input.phone?.trim() || null,
          password: input.password,
        },
      );

    // La cuenta queda pendiente hasta abrir el enlace de verificación del correo.
    return {
      kind: "verificationRequired",
      email: response.user.email,
      message: response.message,
    };
  }

  async verifyEmail(token: string): Promise<void> {
    await this.apiClient.post<void>("/auth/email/verify", {
      token: extractEmailToken(token),
    });
  }

  async resendVerificationEmail(email: string): Promise<string> {
    const response = await this.apiClient.post<{ message: string }>(
      "/auth/email/resend",
      {
        email: email.trim(),
        tenantSlug: this.tenantSlug,
      },
    );

    return response.message;
  }

  async changePassword(input: ChangePasswordInput): Promise<void> {
    await this.apiClient.post<void>("/auth/password/change", {
      currentPassword: input.currentPassword,
      newPassword: input.newPassword,
    });
  }

  async requestPasswordReset(
    input: PasswordResetRequestInput,
  ): Promise<void> {
    // El backend responde igual exista o no la cuenta (no revela correos registrados).
    await this.apiClient.post<void>("/auth/password/forgot", {
      email: input.email.trim(),
      tenantSlug: this.tenantSlug,
    });
  }

  async verifyPasswordResetCode(
    input: PasswordResetVerificationInput,
  ): Promise<boolean> {
    // No existe endpoint de pre-validación: el token se valida al restablecer.
    return extractEmailToken(input.code).length > 0;
  }

  async resetPassword(input: ResetPasswordInput): Promise<void> {
    await this.apiClient.post<void>("/auth/password/reset", {
      token: extractEmailToken(input.code),
      newPassword: input.newPassword,
    });
  }

  private async restoreFromBackend(): Promise<AuthResult> {
    const snapshot =
      await this.apiClient.get<ApiCurrentSessionResponse>(
        "/auth/me",
      );

    if (
      snapshot.user.type !== "customer" ||
      !snapshot.user.customerId
    ) {
      throw new ApiError(
        "La sesión no corresponde a un cliente.",
        {
          status: 403,
          code: "CUSTOMER_SESSION_REQUIRED",
        },
      );
    }

    const customer =
      this.customerRepository.setCurrentSession(snapshot);

    const user: User = {
      id: snapshot.user.id,
      email: snapshot.user.email,
      status: UserStatus.Active,
      createdAt: snapshot.user.createdAt,
      updatedAt: snapshot.user.updatedAt,
    };

    const session: Session = {
      id: snapshot.session.id,
      userId: snapshot.user.id,
      customerId: snapshot.user.customerId,
      tenantId: snapshot.tenant.id,
      createdAt: snapshot.session.createdAt,
      expiresAt: snapshot.session.expiresAt,
    };

    await this.sessionStorage.saveSession(session);

    return {
      user,
      customer,
      session,
    };
  }

  private async clearLocalSession(): Promise<void> {
    await this.tokenStorage.clearToken();
    await this.sessionStorage.clearSession();
    this.customerRepository.clearCurrentCustomer();
  }
}

/**
 * Los correos traen enlaces del frontend web (…/verificar-correo/{token},
 * …/restablecer-contrasena/{token}). Se acepta el enlace completo o solo el token.
 */
export function extractEmailToken(value: string): string {
  const trimmed = value.trim().replace(/[?#].*$/, "").replace(/\/+$/, "");
  const lastSegment = trimmed.split("/").pop() ?? "";

  return decodeURIComponent(lastSegment);
}
