import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { BusinessHeroSlide } from "@/core";
import { HomeScreen } from "@/modules/home/screens/HomeScreen";

const state = vi.hoisted(() => ({
  slides: [] as BusinessHeroSlide[],
  storeName: "Ferretería Los Simpson",
  logoUri: undefined as string | undefined,
  authenticated: true,
}));

vi.mock("expo-router", () => ({
  // `asChild` entrega el hijo tal cual: aqui solo importa que el boton se dibuje.
  Link: ({ children }: { children: unknown }) => children,
}));
vi.mock("@/modules/auth", () => ({
  useSession: () => ({
    customer: { name: "Ana" },
    isAuthenticated: state.authenticated,
  }),
}));
vi.mock("@/modules/catalog", () => ({
  ProductCard: () => null,
  useCommerceCatalog: () => ({
    addToCart: vi.fn(),
    businessName: "Negocio",
    categories: [],
    currency: "GTQ",
    error: null,
    products: [],
  }),
}));
vi.mock("@/shared", () => ({
  CartToast: () => null,
  StoreLogo: ({ uri }: { uri?: string }) => <span data-logo={uri ?? "none"} />,
  useBusinessConfig: () => ({
    heroSlides: state.slides,
    logoUri: state.logoUri,
    storeName: state.storeName,
  }),
  useCartToast: () => ({ cartToastMessage: null, showCartToast: vi.fn() }),
}));

const slide = (title: string, imageUri?: string): BusinessHeroSlide => ({
  title,
  description: `${title} desc`,
  imageUri,
});

describe("HomeScreen: tienda configurada en el panel web", () => {
  beforeEach(() => {
    state.slides = [];
    state.storeName = "Ferretería Los Simpson";
    state.logoUri = undefined;
    state.authenticated = true;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("muestra el nombre y el logo configurados en el encabezado y en el titulo de la seccion", () => {
    state.logoUri = "https://cdn.example.com/logo.png";

    const { container } = render(<HomeScreen />);

    expect(screen.getByText("FERRETERÍA LOS SIMPSON")).toBeTruthy();
    expect(screen.getByText("Descubre Ferretería Los Simpson")).toBeTruthy();
    expect(container.querySelector("[data-logo='https://cdn.example.com/logo.png']")).not.toBeNull();
  });

  it("sin diapositivas configuradas mantiene los tres banners de siempre", () => {
    const { container } = render(<HomeScreen />);

    expect(screen.getByText("Todo lo que necesitas en un solo lugar")).toBeTruthy();
    expect(container.querySelectorAll("[data-icon='storefront-outline']").length).toBeGreaterThan(0);
    expect(screen.queryByText("Ofertas")).toBeNull();
  });

  it("con diapositivas configuradas muestra esas en lugar de los banners de siempre", () => {
    state.slides = [slide("Ofertas", "https://cdn.example.com/a.png"), slide("Nuevos")];

    render(<HomeScreen />);

    expect(screen.getByText("Ofertas")).toBeTruthy();
    expect(screen.getByText("Nuevos")).toBeTruthy();
    expect(screen.queryByText("Todo lo que necesitas en un solo lugar")).toBeNull();
  });

  it("el temporizador recorre las diapositivas sin fallar y se detiene al desmontar", () => {
    vi.useFakeTimers();
    state.slides = [slide("Uno"), slide("Dos"), slide("Tres")];

    const { unmount } = render(<HomeScreen />);

    expect(() => {
      act(() => {
        vi.advanceTimersByTime(4000 * 4);
      });
    }).not.toThrow();

    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("con una sola diapositiva no programa el temporizador", () => {
    vi.useFakeTimers();
    state.slides = [slide("Unica")];

    render(<HomeScreen />);

    expect(vi.getTimerCount()).toBe(0);
  });

  it("para un visitante sin sesion los banners de siempre llevan a iniciar sesion", () => {
    state.authenticated = false;

    render(<HomeScreen />);

    expect(screen.getByText("Consulta tus pedidos fácilmente")).toBeTruthy();
  });

  it("al pasar de los banners de siempre a las diapositivas del panel se vuelve a la primera sin fallar", () => {
    vi.useFakeTimers();
    const { rerender } = render(<HomeScreen />);
    act(() => {
      vi.advanceTimersByTime(4000 * 2);
    });

    state.slides = [slide("Ofertas"), slide("Nuevos")];
    rerender(<HomeScreen />);

    expect(screen.getByText("Ofertas")).toBeTruthy();
    expect(screen.queryByText("Todo lo que necesitas en un solo lugar")).toBeNull();
    expect(() => {
      act(() => {
        vi.advanceTimersByTime(4000 * 3);
      });
    }).not.toThrow();
  });
});
