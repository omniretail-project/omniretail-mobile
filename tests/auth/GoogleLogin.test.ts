import { describe, expect, it, vi } from "vitest";
import { ApiAuthRepository } from "../../src/infrastructure/api/auth/ApiAuthRepository";

describe("Google Login - ApiAuthRepository", () => {
  function setup() {
    const post = vi.fn();
    const get = vi.fn();
    const getToken = vi.fn().mockResolvedValue(null);
    const saveToken = vi.fn().mockResolvedValue(undefined);
    const clearToken = vi.fn().mockResolvedValue(undefined);
    const saveSession = vi.fn().mockResolvedValue(undefined);
    const clearSession = vi.fn().mockResolvedValue(undefined);
    const clearCurrentCustomer = vi.fn();
    const setCurrentSession = vi.fn().mockReturnValue({
      id: "customer-123",
    });

    const repository = new ApiAuthRepository(
      { post, get } as any,
      { getToken, saveToken, clearToken } as any,
      { saveSession, clearSession } as any,
      { setCurrentSession, clearCurrentCustomer } as any,
      "ferrepharma-demo",
    );

    return {
      repository,
      post,
      get,
      getToken,
      saveToken,
      clearToken,
      saveSession,
      clearSession,
      clearCurrentCustomer,
    };
  }

  it("envía el ID token de Google al backend", async () => {
    const { repository, post, get, saveToken, saveSession } = setup();

    post.mockResolvedValueOnce({ token: "jwt-backend" });

    get.mockResolvedValueOnce({
      user: {
        id: "user-123",
        customerId: "customer-123",
        email: "cliente@example.com",
        type: "customer",
        createdAt: "2026-10-23",
        updatedAt: "2026-10-23",
      },
      session: {
        id: "session-123",
        createdAt: "2026-10-23",
        expiresAt: "2026-10-24",
      },
      tenant: { id: "tenant-123" },
    });

    const result = await repository.loginWithGoogle(
      "google-id-token",
      true,
    );

    expect(post).toHaveBeenCalledWith("/auth/google", {
      idToken: "google-id-token",
      tenantSlug: "ferrepharma-demo",
      expectedUserType: "customer",
      rememberMe: true,
    });

    expect(saveToken).toHaveBeenCalledWith("jwt-backend");
    expect(get).toHaveBeenCalledWith("/auth/me");
    expect(saveSession).toHaveBeenCalled();
    expect(result).toHaveProperty("session");
    expect(result).toHaveProperty("customer");
  });

  it("maneja correctamente un desafío MFA", async () => {
    const { repository, post, saveToken } = setup();

    post.mockResolvedValueOnce({
      challengeToken: "challenge-123",
      method: "totp",
    });

    const result = await repository.loginWithGoogle("google-id-token");

    expect(result).toEqual({
      kind: "mfaRequired",
      challengeToken: "challenge-123",
      method: "totp",
    });

    expect(saveToken).not.toHaveBeenCalled();
  });

  it("respeta rememberMe=false", async () => {
    const { repository, post } = setup();

    post.mockResolvedValueOnce({
      challengeToken: "challenge-456",
      method: "email",
    });

    await repository.loginWithGoogle("google-id-token", false);

    expect(post).toHaveBeenCalledWith(
      "/auth/google",
      expect.objectContaining({
        rememberMe: false,
      }),
    );
  });

  it("limpia credenciales si falla la restauración", async () => {
    const {
      repository,
      post,
      get,
      clearToken,
      clearSession,
      clearCurrentCustomer,
    } = setup();

    post.mockResolvedValueOnce({ token: "jwt-backend" });
    get.mockRejectedValueOnce(new Error("Error restaurando sesión"));

    await expect(
      repository.loginWithGoogle("google-id-token"),
    ).rejects.toThrow("Error restaurando sesión");

    expect(clearToken).toHaveBeenCalled();
    expect(clearSession).toHaveBeenCalled();
    expect(clearCurrentCustomer).toHaveBeenCalled();
  });

  it("no guarda una sesión cuando Google es rechazado", async () => {
    const { repository, post, saveToken } = setup();

    post.mockRejectedValueOnce(new Error("Token inválido"));

    await expect(
      repository.loginWithGoogle("token-inválido"),
    ).rejects.toThrow("Token inválido");

    expect(saveToken).not.toHaveBeenCalled();
  });

  it("no restaura una sesión cuando no hay token guardado", async () => {
    const { repository, get, clearSession, clearCurrentCustomer } = setup();

    const session = await repository.getCurrentSession();

    expect(session).toBeNull();
    expect(get).not.toHaveBeenCalled();
    expect(clearSession).toHaveBeenCalledOnce();
    expect(clearCurrentCustomer).toHaveBeenCalledOnce();
  });

  it("cierra la sesión y limpia los datos locales", async () => {
    const { repository, getToken, post, clearToken, clearSession } = setup();

    getToken.mockResolvedValueOnce("jwt-backend");
    post.mockResolvedValueOnce(undefined);

    await repository.logout();

    expect(post).toHaveBeenCalledWith("/auth/logout");
    expect(clearToken).toHaveBeenCalledOnce();
    expect(clearSession).toHaveBeenCalledOnce();
  });

  it("limpia los datos aunque falle el cierre de sesión remoto", async () => {
    const { repository, getToken, post, clearToken, clearSession } = setup();

    getToken.mockResolvedValueOnce("jwt-backend");
    post.mockRejectedValueOnce(new Error("Servidor no disponible"));

    await expect(repository.logout()).rejects.toThrow(
      "Servidor no disponible",
    );

    expect(clearToken).toHaveBeenCalledOnce();
    expect(clearSession).toHaveBeenCalledOnce();
  });

  it("no llama al backend para cerrar sesión si no hay token", async () => {
    const { repository, post, clearToken, clearSession } = setup();

    await repository.logout();

    expect(post).not.toHaveBeenCalled();
    expect(clearToken).toHaveBeenCalledOnce();
    expect(clearSession).toHaveBeenCalledOnce();
  });

  it("rechaza una sesión Google que no corresponde a un cliente", async () => {
    const { repository, post, get, clearToken, clearSession } = setup();

    post.mockResolvedValueOnce({ token: "jwt-backend" });
    get.mockResolvedValueOnce({
      user: {
        id: "admin-123",
        type: "admin",
        customerId: null,
      },
      session: { id: "session-123" },
      tenant: { id: "tenant-123" },
    });

    await expect(
      repository.loginWithGoogle("google-id-token"),
    ).rejects.toThrow("La sesión no corresponde a un cliente.");

    expect(clearToken).toHaveBeenCalledOnce();
    expect(clearSession).toHaveBeenCalledOnce();
  });

  it("permite completar MFA y guardar la sesión de cliente", async () => {
    const { repository, post, get, saveToken, saveSession } = setup();

    post.mockResolvedValueOnce({ token: "jwt-mfa" });
    get.mockResolvedValueOnce({
      user: {
        id: "user-123",
        customerId: "customer-123",
        email: "cliente@example.com",
        type: "customer",
        createdAt: "2026-10-23",
        updatedAt: "2026-10-23",
      },
      session: {
        id: "session-123",
        createdAt: "2026-10-23",
        expiresAt: "2026-10-24",
      },
      tenant: { id: "tenant-123" },
    });

    const result = await repository.verifyMfaChallenge(
      "challenge-123",
      "123456",
    );

    expect(post).toHaveBeenCalledWith("/auth/mfa/verify", {
      challengeToken: "challenge-123",
      code: "123456",
    });

    expect(saveToken).toHaveBeenCalledWith("jwt-mfa");
    expect(saveSession).toHaveBeenCalledOnce();
    expect(result.session.id).toBe("session-123");
  });

  it("restaura una sesión guardada y obtiene el cliente", async () => {
    const { repository, getToken, get, saveSession } = setup();

    getToken.mockResolvedValueOnce("jwt-guardado");
    get.mockResolvedValueOnce({
      user: {
        id: "user-123",
        customerId: "customer-123",
        email: "cliente@example.com",
        type: "customer",
        createdAt: "2026-10-23",
        updatedAt: "2026-10-23",
      },
      session: {
        id: "session-123",
        createdAt: "2026-10-23",
        expiresAt: "2026-10-24",
      },
      tenant: { id: "tenant-123" },
    });

    const session = await repository.getCurrentSession();

    expect(get).toHaveBeenCalledWith("/auth/me");
    expect(saveSession).toHaveBeenCalledOnce();
    expect(session?.id).toBe("session-123");
  });

  it("permite iniciar sesión con correo y contraseña", async () => {
    const { repository, post, get, saveToken } = setup();

    post.mockResolvedValueOnce({ token: "jwt-correo" });
    get.mockResolvedValueOnce({
      user: {
        id: "user-123",
        customerId: "customer-123",
        email: "cliente@example.com",
        type: "customer",
        createdAt: "2026-10-23",
        updatedAt: "2026-10-23",
      },
      session: {
        id: "session-123",
        createdAt: "2026-10-23",
        expiresAt: "2026-10-24",
      },
      tenant: { id: "tenant-123" },
    });

    const result = await repository.login({
      email: " cliente@example.com ",
      password: "PasswordDePrueba123!",
      rememberMe: true,
    });

    expect(post).toHaveBeenCalledWith("/auth/login", {
      email: "cliente@example.com",
      password: "PasswordDePrueba123!",
      rememberMe: true,
      tenantSlug: "ferrepharma-demo",
      expectedUserType: "customer",
    });
    expect(saveToken).toHaveBeenCalledWith("jwt-correo");
    expect(result).toHaveProperty("session");
  });

  it("maneja MFA en el inicio de sesión tradicional", async () => {
    const { repository, post, saveToken } = setup();

    post.mockResolvedValueOnce({
      challengeToken: "mfa-correo",
      method: "totp",
    });

    const result = await repository.login({
      email: "cliente@example.com",
      password: "PasswordDePrueba123!",
    });

    expect(result).toEqual({
      kind: "mfaRequired",
      challengeToken: "mfa-correo",
      method: "totp",
    });
    expect(saveToken).not.toHaveBeenCalled();
  });

  it("limpia la sesión si falla la recuperación después del login", async () => {
    const { repository, post, get, clearToken, clearSession } = setup();

    post.mockResolvedValueOnce({ token: "jwt-correo" });
    get.mockRejectedValueOnce(new Error("Falló /auth/me"));

    await expect(
      repository.login({
        email: "cliente@example.com",
        password: "PasswordDePrueba123!",
      }),
    ).rejects.toThrow("Falló /auth/me");

    expect(clearToken).toHaveBeenCalled();
    expect(clearSession).toHaveBeenCalled();
  });
});
