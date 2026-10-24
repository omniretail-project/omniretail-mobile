import { act, renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentSession: vi.fn(),
  getById: vi.fn(),
  loginWithGoogle: vi.fn(),
  logout: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("@react-native-google-signin/google-signin", () => ({
  GoogleSignin: {
    signOut: mocks.signOut,
  },
}));

vi.mock("@/infrastructure", () => {
  const repositories = {
    authRepository: {
      getCurrentSession: mocks.getCurrentSession,
      loginWithGoogle: mocks.loginWithGoogle,
      logout: mocks.logout,
    },
    customerRepository: {
      getById: mocks.getById,
    },
    businessConfigRepository: {},
  };

  return {
    isApiMode: () => false,
    subscribeToApiSessionInvalidation: () => () => {},
    useRepositories: () => repositories,
  };
});

import {
  SessionProvider,
  useSessionContext,
} from "../../src/modules/auth/session/SessionProvider";

const authenticatedResult = {
  user: { id: "user-123" },
  customer: { id: "customer-123", name: "Cliente de prueba" },
  session: {
    id: "session-123",
    userId: "user-123",
    customerId: "customer-123",
    tenantId: "tenant-123",
  },
};

function Wrapper({ children }: PropsWithChildren) {
  return <SessionProvider>{children}</SessionProvider>;
}

function setup() {
  return renderHook(() => useSessionContext(), {
    wrapper: Wrapper,
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getCurrentSession.mockResolvedValue(null);
  mocks.logout.mockResolvedValue(undefined);
  mocks.signOut.mockResolvedValue(undefined);
});

describe("SessionProvider: Google Login", () => {
  it("inicia sesión y actualiza el cliente autenticado", async () => {
    mocks.loginWithGoogle.mockResolvedValue(authenticatedResult);
    const { result } = setup();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.loginWithGoogle("google-token", true);
    });

    expect(mocks.loginWithGoogle).toHaveBeenCalledWith(
      "google-token",
      true,
    );
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.session).toEqual(authenticatedResult.session);
    expect(result.current.customer).toEqual(authenticatedResult.customer);
  });

  it("no crea una sesión cuando Google requiere MFA", async () => {
    mocks.loginWithGoogle.mockResolvedValue({
      kind: "mfaRequired",
      challengeToken: "challenge-123",
      method: "totp",
    });

    const { result } = setup();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let response: unknown;

    await act(async () => {
      response = await result.current.loginWithGoogle("google-token");
    });

    expect(response).toHaveProperty("kind", "mfaRequired");
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.session).toBeNull();
  });

  it("cierra la sesión y desconecta la cuenta de Google", async () => {
    mocks.loginWithGoogle.mockResolvedValue(authenticatedResult);

    const { result } = setup();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.loginWithGoogle("google-token");
    });

    expect(result.current.isAuthenticated).toBe(true);

    await act(async () => {
      await result.current.logout();
    });

    expect(mocks.logout).toHaveBeenCalledOnce();
    expect(mocks.signOut).toHaveBeenCalledOnce();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.session).toBeNull();
    expect(result.current.customer).toBeNull();
  });

  it("cierra MARJYM aunque Google falle al desconectarse", async () => {
    mocks.loginWithGoogle.mockResolvedValue(authenticatedResult);
    mocks.signOut.mockRejectedValue(
      new Error("No se pudo desconectar Google"),
    );

    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { result } = setup();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.loginWithGoogle("google-token");
      await result.current.logout();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(warning).toHaveBeenCalled();
    warning.mockRestore();
  });

  it("no inicia sesión si el repositorio rechaza el token", async () => {
    mocks.loginWithGoogle.mockRejectedValue(
      new Error("Token inválido"),
    );

    const { result } = setup();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await expect(
      result.current.loginWithGoogle("token-inválido"),
    ).rejects.toThrow("Token inválido");

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.session).toBeNull();
  });
});

describe("SessionProvider: restauración y seguridad de sesión", () => {
  it("restaura una sesión existente al abrir MARJYM", async () => {
    mocks.getCurrentSession.mockResolvedValue(
      authenticatedResult.session,
    );
    mocks.getById.mockResolvedValue(
      authenticatedResult.customer,
    );

    const { result } = setup();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isAuthenticated).toBe(true);
    });

    expect(result.current.session).toEqual(
      authenticatedResult.session,
    );
    expect(result.current.customer).toEqual(
      authenticatedResult.customer,
    );
  });

  it("permite refrescar una sesión autenticada", async () => {
    const { result } = setup();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    mocks.getCurrentSession.mockResolvedValue(
      authenticatedResult.session,
    );
    mocks.getById.mockResolvedValue(
      authenticatedResult.customer,
    );

    await act(async () => {
      await result.current.refreshSession();
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.customer).toEqual(
      authenticatedResult.customer,
    );
  });

  it("usa rememberMe=true cuando no se especifica", async () => {
    mocks.loginWithGoogle.mockResolvedValue(authenticatedResult);

    const { result } = setup();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.loginWithGoogle("google-token");
    });

    expect(mocks.loginWithGoogle).toHaveBeenCalledWith(
      "google-token",
      true,
    );
    expect(result.current.isAuthenticated).toBe(true);
  });

  it("limpia la sesión local aunque falle el cierre del backend", async () => {
    mocks.loginWithGoogle.mockResolvedValue(authenticatedResult);
    mocks.logout.mockRejectedValue(
      new Error("Error cerrando sesión en servidor"),
    );

    const { result } = setup();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.loginWithGoogle("google-token");
    });

    expect(result.current.isAuthenticated).toBe(true);

    await act(async () => {
      await expect(result.current.logout()).rejects.toThrow(
        "Error cerrando sesión en servidor",
      );
    });

    expect(mocks.signOut).toHaveBeenCalledOnce();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.session).toBeNull();
    expect(result.current.customer).toBeNull();
  });
});
