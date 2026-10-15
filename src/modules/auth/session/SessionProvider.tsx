import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from "react";

import type { AuthResult, Customer, LoginInput, LoginResult, RegisterCustomerInput, RegistrationResult, Session } from "@/core";
import {
  isApiMode,
  subscribeToApiSessionInvalidation,
  useRepositories,
} from "@/infrastructure";

type SessionContextValue = {
  session: Session | null;
  customer: Customer | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login(input: LoginInput): Promise<LoginResult>;
  completeMfaLogin(challengeToken: string, code: string): Promise<void>;
  register(input: Omit<RegisterCustomerInput, "tenantId">): Promise<RegistrationResult>;
  logout(): Promise<void>;
  refreshSession(): Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: PropsWithChildren) {
  const { authRepository, businessConfigRepository, customerRepository } = useRepositories();
  const [session, setSession] = useState<Session | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    setIsLoading(true);
    try {
      const currentSession = await authRepository.getCurrentSession();
      const currentCustomer = currentSession ? await customerRepository.getById(currentSession.customerId) : null;

      if (currentSession && !currentCustomer) {
        await authRepository.logout();
        setSession(null);
        setCustomer(null);
        return;
      }

      setSession(currentSession);
      setCustomer(currentCustomer);
    } finally {
      setIsLoading(false);
    }
  }, [authRepository, customerRepository]);

  useEffect(() => {
    let isMounted = true;

    async function bootstrapSession() {
      try {
        const currentSession = await authRepository.getCurrentSession();
        const currentCustomer = currentSession
          ? await customerRepository.getById(currentSession.customerId)
          : null;

        if (!isMounted) {
          return;
        }

        if (currentSession && !currentCustomer) {
          await authRepository.logout();
          setSession(null);
          setCustomer(null);
          return;
        }

        setSession(currentSession);
        setCustomer(currentCustomer);
      } catch (error) {
        console.warn("No se pudo restaurar la sesión inicial:", error);

        if (isMounted) {
          setSession(null);
          setCustomer(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void bootstrapSession();

    return () => {
      isMounted = false;
    };
  }, [authRepository, customerRepository]);

  useEffect(() => {
    if (!isApiMode()) {
      return;
    }

    return subscribeToApiSessionInvalidation(() => {
      setSession(null);
      setCustomer(null);
      setIsLoading(false);
    });
  }, []);

  const login = useCallback(
    async (input: LoginInput) => {
      const result = await authRepository.login(input);

      if ("challengeToken" in result) {
        return result;
      }

      setSession(result.session);
      setCustomer(result.customer);

      return result;
    },
    [authRepository],
  );

  const completeMfaLogin = useCallback(
    async (challengeToken: string, code: string) => {
      if (!authRepository.verifyMfaChallenge) {
        throw new Error("La verificación en dos pasos no está disponible.");
      }

      const result: AuthResult = await authRepository.verifyMfaChallenge(
        challengeToken,
        code,
      );
      setSession(result.session);
      setCustomer(result.customer);
    },
    [authRepository],
  );

  const register = useCallback(
    async (input: Omit<RegisterCustomerInput, "tenantId">) => {
      const businessConfig = await businessConfigRepository.getCurrent();
      const result = await authRepository.registerCustomer({ ...input, tenantId: businessConfig.tenantId });

      if (result.kind === "authenticated") {
        setSession(result.auth.session);
        setCustomer(result.auth.customer);
      }

      return result;
    },
    [authRepository, businessConfigRepository],
  );

  const logout = useCallback(async () => {
    await authRepository.logout();
    setSession(null);
    setCustomer(null);
  }, [authRepository]);

  const value = useMemo<SessionContextValue>(
    () => ({
      session,
      customer,
      isAuthenticated: !!session,
      isLoading,
      login,
      completeMfaLogin,
      register,
      logout,
      refreshSession,
    }),
    [completeMfaLogin, customer, isLoading, login, logout, refreshSession, register, session],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSessionContext(): SessionContextValue {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error("useSession must be used inside SessionProvider");
  }

  return context;
}
