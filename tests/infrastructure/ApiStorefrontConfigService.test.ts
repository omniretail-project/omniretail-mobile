import { afterEach, describe, expect, it, vi } from "vitest";

import type { ApiStorefrontConfigResponse } from "@/infrastructure/api/account/types";

const baseResponse: ApiStorefrontConfigResponse = {
  tenantId: "tenant-1",
  enabled: true,
  storeName: "Ferretería Los Simpson",
  logoUrl: "/media/t/ecommerce/t/logo.png",
  contactPhone: "+502 1234-5678",
  contactEmail: "ventas@tienda.com",
  requireAccountForCheckout: false,
  guestTrackingEnabled: true,
  slides: [],
  branches: [{ id: "b1", name: "Centro", address: "Zona 1" }],
};

async function loadRepository(response: ApiStorefrontConfigResponse) {
  // `apiConfig` lee el entorno al importarse: se fija antes de cargar el modulo.
  vi.resetModules();
  vi.stubEnv("EXPO_PUBLIC_API_MODE", "api");
  vi.stubEnv("EXPO_PUBLIC_API_BASE_URL", "http://10.0.2.2:8080/api/v1");
  vi.stubEnv("EXPO_PUBLIC_TENANT_SLUG", "ferrepharma-demo");
  const { ApiBusinessConfigRepository, ApiStorefrontConfigService } = await import(
    "@/infrastructure/api/account/ApiStorefrontConfigService"
  );
  const get = vi.fn().mockResolvedValue(response);
  const service = new ApiStorefrontConfigService({ get } as never, "ferrepharma-demo");
  return { repository: new ApiBusinessConfigRepository(service), get };
}

describe("ApiBusinessConfigRepository (config publica de la tienda)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it(
    "completa las rutas relativas del logo y del carrusel con el origen de la API",
    async () => {
    const { repository, get } = await loadRepository({
      ...baseResponse,
      slides: [
        { title: " Ofertas ", description: " Hasta 50% ", imageUrl: "/media/t/ecommerce/t/uno.png" },
        { title: "Dos", description: "b", imageUrl: "https://cdn.example.com/dos.png" },
        { title: "", description: "", imageUrl: null },
        { title: "", description: "solo texto sin titulo ni imagen", imageUrl: null },
      ],
    });

    const config = await repository.getCurrent();

    expect(get).toHaveBeenCalledWith("/public/ferrepharma-demo/config");
    expect(config.name).toBe("Ferretería Los Simpson");
    expect(config.logoUri).toBe("http://10.0.2.2:8080/media/t/ecommerce/t/logo.png");
    expect(config.heroSlides).toEqual([
      { title: "Ofertas", description: "Hasta 50%", imageUri: "http://10.0.2.2:8080/media/t/ecommerce/t/uno.png" },
      { title: "Dos", description: "b", imageUri: "https://cdn.example.com/dos.png" },
    ]);
    expect(config.support).toEqual({
      phone: "+502 1234-5678",
      email: "ventas@tienda.com",
      address: "Zona 1",
    });
  }, 15000);

  it("sin logo ni carrusel configurados no inventa imagenes", async () => {
    const { repository } = await loadRepository({ ...baseResponse, logoUrl: null, slides: [] });

    const config = await repository.getCurrent();

    expect(config.logoUri).toBeUndefined();
    expect(config.heroSlides).toEqual([]);
  });

  it("mapea la configuracion de envio cuando viene en la respuesta", async () => {
    const { repository } = await loadRepository({
      ...baseResponse,
      shipping: {
        enabled: true,
        deliveryFee: 50,
        freeShippingThreshold: 300,
      },
    });

    const config = await repository.getCurrent();

    expect(config.shipping).toEqual({
      enabled: true,
      deliveryFee: 50,
      freeShippingThreshold: 300,
    });
  });

  it("deja shipping como undefined cuando no viene configurado", async () => {
    const { repository } = await loadRepository({ ...baseResponse, shipping: null });

    const config = await repository.getCurrent();

    expect(config.shipping).toBeUndefined();
  });
});
