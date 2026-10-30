import { describe, expect, it, vi } from "vitest";

import { SalesChannel } from "@/core";
import type { ApiClient } from "@/infrastructure/api/ApiClient";
import { ApiCategoryRepository } from "@/infrastructure/api/catalog/ApiCategoryRepository";
import { ApiProductAvailabilityRepository } from "@/infrastructure/api/catalog/ApiProductAvailabilityRepository";
import { ApiProductMediaRepository } from "@/infrastructure/api/catalog/ApiProductMediaRepository";
import { ApiProductRepository } from "@/infrastructure/api/catalog/ApiProductRepository";
import { ApiPromotionRepository } from "@/infrastructure/api/catalog/ApiPromotionRepository";
import type { ApiStorefrontProduct } from "@/infrastructure/api/catalog/types";

describe("ApiProductRepository", () => {
  const tenantSlug = "ferrepharma-demo";
  const tenantId = "tenant-ferrepharma";

  const rawProductWithPromo: ApiStorefrontProduct = {
    id: "prod-1",
    sku: "MAN-ALI-008",
    name: "Alicate de Presión 10 Pulgadas",
    description: "Herramienta de mano",
    basePrice: 49.0,
    salePrice: 49.0,
    effectivePrice: 44.1,
    discountAmount: 4.9,
    promotionId: "promo-uuid-1",
    categoryId: "cat-tools",
    categoryName: "Herramientas",
    primaryImageUrl: "https://example.com/alicate.jpg",
    primaryImageAlt: "Alicate",
    saleUnitId: "unit-piece",
    saleUnitName: "Pieza",
    inStock: true,
    availableQuantity: 10,
  };

  const rawProductWithoutBasePrice: ApiStorefrontProduct = {
    id: "prod-2",
    sku: "MAN-MAR-002",
    name: "Martillo Especial",
    basePrice: 0,
    salePrice: 75.0,
    effectivePrice: 65.0,
    discountAmount: 10.0,
    categoryId: "cat-tools",
    saleUnitId: "unit-piece",
    inStock: true,
    availableQuantity: 5,
  };

  const rawProductComputedBase: ApiStorefrontProduct = {
    id: "prod-3",
    sku: "MAN-SER-003",
    name: "Serrucho",
    basePrice: 0,
    salePrice: 0,
    effectivePrice: 40.0,
    discountAmount: 8.0,
    categoryId: "cat-tools",
    saleUnitId: "unit-piece",
    inStock: true,
    availableQuantity: 2,
  };

  const rawProductPlain: ApiStorefrontProduct = {
    id: "prod-4",
    sku: "MAN-CLA-004",
    name: "Clavos 2 pulgadas",
    basePrice: 15.0,
    salePrice: 15.0,
    effectivePrice: 15.0,
    discountAmount: 0,
    categoryId: "cat-hardware",
    saleUnitId: "unit-box",
    inStock: false,
    availableQuantity: 0,
  };

  const rawProductZeroBase: ApiStorefrontProduct = {
    id: "prod-5",
    sku: "MAN-TUE-005",
    name: "Tuerca",
    basePrice: 0,
    salePrice: 0,
    effectivePrice: 5.0,
    discountAmount: 0,
    categoryId: "cat-hardware",
    saleUnitId: "unit-piece",
    inStock: true,
    availableQuantity: 100,
  };

  const createMockApiClient = (products: ApiStorefrontProduct[]): ApiClient => {
    return {
      get: vi.fn().mockImplementation((path: string) => {
        if (path === `/public/${tenantSlug}/products`) {
          return Promise.resolve(products);
        }
        const match = path.match(new RegExp(`/public/${tenantSlug}/products/(.+)`));
        if (match) {
          const found = products.find((p) => p.id === match[1]);
          if (found) return Promise.resolve(found);
          const error = new Error("Not found") as Error & { status: number };
          error.status = 404;
          return Promise.reject(error);
        }
        return Promise.reject(new Error("Unknown route"));
      }),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    } as unknown as ApiClient;
  };

  it("getAll sincroniza categorías, disponibilidad, media y promociones", async () => {
    const apiClient = createMockApiClient([rawProductWithPromo, rawProductPlain]);
    const categoryRepo = new ApiCategoryRepository();
    const availabilityRepo = new ApiProductAvailabilityRepository();
    const mediaRepo = new ApiProductMediaRepository();
    const promotionRepo = new ApiPromotionRepository();

    const repo = new ApiProductRepository(
      apiClient,
      tenantSlug,
      categoryRepo,
      availabilityRepo,
      mediaRepo,
      promotionRepo,
    );

    const products = await repo.getAll(tenantId);
    expect(products).toHaveLength(2);

    // Verifica preservación de precio base (no sobreescrito con effectivePrice)
    const alicate = products.find((p) => p.id === "prod-1")!;
    expect(alicate.basePrice.amount).toBe(49.0);
    expect(alicate.channels).toContain(SalesChannel.MobileApp);

    // Verifica que promotionRepo fue sincronizado
    const promos = await promotionRepo.getActive(tenantId);
    expect(promos).toHaveLength(1);
    expect(promos[0].value).toBe(4.9);
  });

  it("resuelve precio base correctamente a partir de salePrice o discountAmount cuando basePrice es 0", async () => {
    const apiClient = createMockApiClient([
      rawProductWithoutBasePrice,
      rawProductComputedBase,
      rawProductPlain,
      rawProductZeroBase,
    ]);
    const repo = new ApiProductRepository(apiClient, tenantSlug);

    const products = await repo.getAll(tenantId);

    // Resuelve de salePrice (75.0)
    const prod2 = products.find((p) => p.id === "prod-2")!;
    expect(prod2.basePrice.amount).toBe(75.0);

    // Resuelve de effectivePrice + discountAmount (40.0 + 8.0 = 48.0)
    const prod3 = products.find((p) => p.id === "prod-3")!;
    expect(prod3.basePrice.amount).toBe(48.0);

    // Sin descuento, basePrice es 15.0
    const prod4 = products.find((p) => p.id === "prod-4")!;
    expect(prod4.basePrice.amount).toBe(15.0);

    // Sin basePrice ni salePrice ni discountAmount, cae en effectivePrice (5.0)
    const prod5 = products.find((p) => p.id === "prod-5")!;
    expect(prod5.basePrice.amount).toBe(5.0);
  });

  it("getById sincroniza promociones y retorna el producto mapeado", async () => {
    const apiClient = createMockApiClient([rawProductWithPromo]);
    const promotionRepo = new ApiPromotionRepository();
    const repo = new ApiProductRepository(
      apiClient,
      tenantSlug,
      undefined,
      undefined,
      undefined,
      promotionRepo,
    );

    const product = await repo.getById("prod-1");
    expect(product).not.toBeNull();
    expect(product?.id).toBe("prod-1");
    expect(product?.basePrice.amount).toBe(49.0);

    const promos = await promotionRepo.getByProduct(tenantId, "prod-1");
    expect(promos).toHaveLength(1);
    expect(promos[0].value).toBe(4.9);
  });

  it("getById retorna null cuando la API responde 404", async () => {
    const apiClient = createMockApiClient([]);
    const repo = new ApiProductRepository(apiClient, tenantSlug);

    const product = await repo.getById("non-existent");
    expect(product).toBeNull();
  });

  it("getById relanza errores distintos a 404", async () => {
    const apiClient = {
      get: vi.fn().mockRejectedValue(new Error("Network error")),
    } as unknown as ApiClient;
    const repo = new ApiProductRepository(apiClient, tenantSlug);

    await expect(repo.getById("prod-1")).rejects.toThrow("Network error");
  });

  it("search filtra por query y categoría", async () => {
    const apiClient = createMockApiClient([rawProductWithPromo, rawProductPlain]);
    const repo = new ApiProductRepository(apiClient, tenantSlug);

    // Búsqueda por texto (nombre)
    const resultsName = await repo.search({
      tenantId,
      query: "alicate",
    });
    expect(resultsName).toHaveLength(1);
    expect(resultsName[0].id).toBe("prod-1");

    // Búsqueda por SKU
    const resultsSku = await repo.search({
      tenantId,
      query: "MAN-CLA",
    });
    expect(resultsSku).toHaveLength(1);
    expect(resultsSku[0].id).toBe("prod-4");

    // Búsqueda por categoría
    const resultsCat = await repo.search({
      tenantId,
      query: "",
      categoryId: "cat-tools",
    });
    expect(resultsCat).toHaveLength(1);
    expect(resultsCat[0].id).toBe("prod-1");
  });

  it("getByCategory filtra productos por id de categoría", async () => {
    const apiClient = createMockApiClient([rawProductWithPromo, rawProductPlain]);
    const repo = new ApiProductRepository(apiClient, tenantSlug);

    const catHardware = await repo.getByCategory(tenantId, "cat-hardware");
    expect(catHardware).toHaveLength(1);
    expect(catHardware[0].id).toBe("prod-4");
  });
});
