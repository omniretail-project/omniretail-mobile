import { describe, expect, it, vi } from "vitest";
import { ApiAuthRepository } from "../../src/infrastructure/api/auth/ApiAuthRepository";

describe("ApiAuthRepository: registro y verificación", () => {
  function setup() {
    const post = vi.fn();

    const repository = new ApiAuthRepository(
      { post } as any,
      {} as any,
      {} as any,
      {} as any,
      "ferrepharma-demo",
    );

    return { repository, post };
  }

  it("acepta el registro sin ID y conserva el mensaje del backend", async () => {
    const { repository, post } = setup();

    post.mockResolvedValueOnce({
      message: "Revisa tu correo para verificar tu cuenta.",
      user: {
        name: "Cliente de Prueba",
        email: "cliente@example.com",
        type: "customer",
      },
    });

    const result = await repository.registerCustomer({
      name: " Cliente de Prueba ",
      email: " cliente@example.com ",
      password: "PasswordDePrueba123!",
    });

    expect(result).toEqual({
      kind: "verificationRequired",
      email: "cliente@example.com",
      message: "Revisa tu correo para verificar tu cuenta.",
    });

    expect(post).toHaveBeenCalledWith(
      "/public/ferrepharma-demo/auth/register",
      expect.objectContaining({
        name: "Cliente de Prueba",
        email: "cliente@example.com",
      }),
    );
  });

  it("reenvía verificación con email y tenantSlug", async () => {
    const { repository, post } = setup();

    post.mockResolvedValueOnce({
      message: "Si corresponde, recibirás un correo de verificación.",
    });

    const message = await repository.resendVerificationEmail(
      " cliente@example.com ",
    );

    expect(post).toHaveBeenCalledWith("/auth/email/resend", {
      email: "cliente@example.com",
      tenantSlug: "ferrepharma-demo",
    });

    expect(message).toBe(
      "Si corresponde, recibirás un correo de verificación.",
    );
  });
});
