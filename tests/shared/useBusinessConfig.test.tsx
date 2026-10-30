import { render, renderHook, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { BusinessConfig } from "@/core";
import { StoreBrandText } from "@/shared/components/StoreBrandText";
import {
  clearBusinessConfigCache,
  DEFAULT_STORE_NAME,
  useBusinessConfig,
} from "@/shared/hooks/useBusinessConfig";

const state = vi.hoisted(() => ({
  getCurrent: vi.fn(),
}));

vi.mock("expo-router", async () => {
  const { useEffect } = await import("react");
  return {
    // Ejecuta el efecto al montar, como cuando la pantalla toma el foco.
    useFocusEffect: (effect: () => void | (() => void)) => {
      useEffect(effect, [effect]);
    },
  };
});
vi.mock("@/infrastructure/repositories", () => {
  const repositories = { businessConfigRepository: { getCurrent: state.getCurrent } };
  return { useRepositories: () => repositories };
});
vi.mock("@/infrastructure", () => {
  const repositories = { businessConfigRepository: { getCurrent: state.getCurrent } };
  return { useRepositories: () => repositories };
});

const config = (extra: Partial<BusinessConfig> = {}): BusinessConfig => ({
  tenantId: "tenant-1",
  name: "  Ferretería Los Simpson  ",
  currency: "GTQ",
  support: {},
  ...extra,
});

describe("useBusinessConfig", () => {
  beforeEach(() => {
    clearBusinessConfigCache();
  });

  it("antes de leer la configuracion usa el nombre por defecto y no hay logo ni carrusel", () => {
    state.getCurrent.mockReturnValue(new Promise(() => undefined));

    const { result } = renderHook(() => useBusinessConfig());

    expect(result.current.storeName).toBe(DEFAULT_STORE_NAME);
    expect(result.current.logoUri).toBeUndefined();
    expect(result.current.heroSlides).toEqual([]);
  });

  it("entrega el nombre, el logo y el carrusel configurados", async () => {
    const slides = [{ title: "Ofertas", description: "Hasta 50%", imageUri: "https://cdn/x.png" }];
    state.getCurrent.mockResolvedValue(config({ logoUri: "https://cdn/logo.png", heroSlides: slides }));

    const { result } = renderHook(() => useBusinessConfig());

    await waitFor(() => expect(result.current.storeName).toBe("Ferretería Los Simpson"));
    expect(result.current.logoUri).toBe("https://cdn/logo.png");
    expect(result.current.heroSlides).toEqual(slides);
  });

  it("entrega la configuracion de envio cuando esta disponible", async () => {
    state.getCurrent.mockResolvedValue(
      config({
        shipping: { enabled: true, deliveryFee: 50, freeShippingThreshold: 300 },
      }),
    );

    const { result } = renderHook(() => useBusinessConfig());

    await waitFor(() => expect(result.current.shipping).toBeDefined());
    expect(result.current.shipping).toEqual({
      enabled: true,
      deliveryFee: 50,
      freeShippingThreshold: 300,
    });
  });

  it("si la configuracion no tiene nombre conserva el valor por defecto", async () => {
    state.getCurrent.mockResolvedValue(config({ name: "   " }));

    const { result } = renderHook(() => useBusinessConfig());

    await waitFor(() => expect(result.current.config).not.toBeNull());
    expect(result.current.storeName).toBe(DEFAULT_STORE_NAME);
  });

  it("una pantalla que se monta despues arranca con la configuracion ya leida, sin parpadear con el nombre por defecto", async () => {
    state.getCurrent.mockResolvedValue(config({ name: "Ferretería Los Simpson" }));
    const first = renderHook(() => useBusinessConfig());
    await waitFor(() => expect(first.result.current.storeName).toBe("Ferretería Los Simpson"));

    // La segunda lectura tarda: el nombre real ya debe verse desde el primer render.
    state.getCurrent.mockReturnValue(new Promise(() => undefined));
    const second = renderHook(() => useBusinessConfig());

    expect(second.result.current.storeName).toBe("Ferretería Los Simpson");
    expect(second.result.current.config).not.toBeNull();
  });

  it("despues de limpiar la cache vuelve a partir del nombre por defecto", async () => {
    state.getCurrent.mockResolvedValue(config());
    const first = renderHook(() => useBusinessConfig());
    await waitFor(() => expect(first.result.current.config).not.toBeNull());

    clearBusinessConfigCache();
    state.getCurrent.mockReturnValue(new Promise(() => undefined));
    const second = renderHook(() => useBusinessConfig());

    expect(second.result.current.storeName).toBe(DEFAULT_STORE_NAME);
  });

  it("sin conexion no falla y mantiene los valores por defecto", async () => {
    state.getCurrent.mockRejectedValue(new Error("network"));

    const { result } = renderHook(() => useBusinessConfig());

    await waitFor(() => expect(state.getCurrent).toHaveBeenCalled());
    expect(result.current.storeName).toBe(DEFAULT_STORE_NAME);
    expect(result.current.config).toBeNull();
  });
});

describe("StoreBrandText", () => {
  beforeEach(() => {
    clearBusinessConfigCache();
  });

  it("muestra el nombre de la tienda en mayusculas", async () => {
    state.getCurrent.mockResolvedValue(config());

    render(<StoreBrandText />);

    expect(await screen.findByText("FERRETERÍA LOS SIMPSON")).toBeTruthy();
  });
});
