import { describe, expect, it } from "vitest";

import {
  PromotionStatus,
  PromotionType,
  SalesChannel,
} from "@/core";
import { ApiPromotionRepository } from "@/infrastructure/api/catalog/ApiPromotionRepository";
import type { ApiStorefrontProduct } from "@/infrastructure/api/catalog/types";

describe("ApiPromotionRepository", () => {
  const tenantId = "tenant-ferrepharma";

  const productWithPromo: ApiStorefrontProduct = {
    id: "prod-1",
    sku: "MAN-ALI-008",
    name: "Alicate de Presión 10 Pulgadas",
    basePrice: 49.0,
    salePrice: 49.0,
    effectivePrice: 44.1,
    discountAmount: 4.9,
    promotionId: "promo-uuid-1",
    categoryId: "cat-tools",
    saleUnitId: "unit-piece",
    inStock: true,
    availableQuantity: 10,
  };

  const productWithoutPromo: ApiStorefrontProduct = {
    id: "prod-2",
    sku: "MAN-MAR-001",
    name: "Martillo de Uña 16oz",
    basePrice: 35.0,
    salePrice: 35.0,
    effectivePrice: 35.0,
    discountAmount: 0,
    promotionId: null,
    categoryId: "cat-tools",
    saleUnitId: "unit-piece",
    inStock: true,
    availableQuantity: 5,
  };

  it("sincroniza promociones desde productos con descuento directo", async () => {
    const repository = new ApiPromotionRepository();

    repository.syncFromProducts([productWithPromo, productWithoutPromo], tenantId);

    const activePromotions = await repository.getActive(tenantId);
    expect(activePromotions).toHaveLength(1);

    const promotion = activePromotions[0];
    expect(promotion).toEqual({
      id: "promo-uuid-1",
      tenantId,
      productId: "prod-1",
      type: PromotionType.FixedDiscount,
      value: 4.9,
      channels: [SalesChannel.MobileApp, SalesChannel.Ecommerce],
      status: PromotionStatus.Active,
    });
  });

  it("calcula descuento derivado cuando basePrice > effectivePrice sin discountAmount explícito", async () => {
    const repository = new ApiPromotionRepository();
    const productWithImplicitDiscount: ApiStorefrontProduct = {
      ...productWithoutPromo,
      id: "prod-3",
      basePrice: 100.0,
      effectivePrice: 85.5,
      discountAmount: 0,
    };

    repository.syncFromProducts([productWithImplicitDiscount], tenantId);

    const active = await repository.getActive(tenantId);
    expect(active).toHaveLength(1);
    expect(active[0].id).toBe("promo-prod-3");
    expect(active[0].value).toBe(14.5);
  });

  it("calcula descuento derivado cuando salePrice > effectivePrice sin discountAmount explícito", async () => {
    const repository = new ApiPromotionRepository();
    const productWithSalePriceDiff: ApiStorefrontProduct = {
      ...productWithoutPromo,
      id: "prod-4",
      basePrice: 0,
      salePrice: 60.0,
      effectivePrice: 50.0,
      discountAmount: 0,
    };

    repository.syncFromProducts([productWithSalePriceDiff], tenantId);

    const active = await repository.getActive(tenantId);
    expect(active).toHaveLength(1);
    expect(active[0].value).toBe(10.0);
  });

  it("omite productos cuando no hay descuento", async () => {
    const repository = new ApiPromotionRepository();

    repository.syncFromProducts([productWithoutPromo], tenantId);

    const active = await repository.getActive(tenantId);
    expect(active).toHaveLength(0);
  });

  it("purga promociones previas cuando se sincroniza una lista completa", async () => {
    const repository = new ApiPromotionRepository();

    // Primera sincronización: prod-1 tiene descuento
    repository.syncFromProducts([productWithPromo], tenantId);
    expect(await repository.getActive(tenantId)).toHaveLength(1);

    // Segunda sincronización con múltiples productos donde prod-1 ya no tiene descuento
    const updatedProd1: ApiStorefrontProduct = {
      ...productWithPromo,
      effectivePrice: 49.0,
      discountAmount: 0,
    };
    repository.syncFromProducts([updatedProd1, productWithoutPromo], tenantId);

    const active = await repository.getActive(tenantId);
    expect(active).toHaveLength(0);
  });

  it("actualiza de forma aislada un producto sin purgar los demás al sincronizar un único producto", async () => {
    const repository = new ApiPromotionRepository();

    // Sincroniza prod-1
    repository.syncFromProducts([productWithPromo], tenantId);

    // Llega detalle de prod-2 con descuento nuevo
    const prod2WithPromo: ApiStorefrontProduct = {
      ...productWithoutPromo,
      effectivePrice: 30.0,
      discountAmount: 5.0,
      promotionId: "promo-uuid-2",
    };
    repository.syncFromProducts([prod2WithPromo], tenantId);

    // Ambos productos deben tener sus promociones
    const active = await repository.getActive(tenantId);
    expect(active).toHaveLength(2);

    // Si prod-2 se sincroniza después sin promoción, solo prod-2 se elimina
    repository.syncFromProducts([productWithoutPromo], tenantId);
    const remaining = await repository.getActive(tenantId);
    expect(remaining).toHaveLength(1);
    expect(remaining[0].productId).toBe("prod-1");
  });

  it("obtiene la promoción específica de un producto con getByProduct", async () => {
    const repository = new ApiPromotionRepository();
    repository.syncFromProducts([productWithPromo, productWithoutPromo], tenantId);

    const promoForProd1 = await repository.getByProduct(tenantId, "prod-1");
    expect(promoForProd1).toHaveLength(1);
    expect(promoForProd1[0].productId).toBe("prod-1");

    const promoForProd2 = await repository.getByProduct(tenantId, "prod-2");
    expect(promoForProd2).toHaveLength(0);

    const promoForUnknown = await repository.getByProduct(tenantId, "unknown");
    expect(promoForUnknown).toHaveLength(0);
  });

  it("limpia todas las promociones con clear()", async () => {
    const repository = new ApiPromotionRepository();
    repository.syncFromProducts([productWithPromo], tenantId);
    expect(await repository.getActive(tenantId)).toHaveLength(1);

    repository.clear();
    expect(await repository.getActive(tenantId)).toHaveLength(0);
  });

  it("valida vigencia temporal en isActive cuando at es proporcionado", async () => {
    const repository = new ApiPromotionRepository();
    repository.syncFromProducts([productWithPromo], tenantId);

    // Simula una promoción con ventana de vigencia
    const active = await repository.getActive(tenantId);
    const promo = active[0];
    promo.startsAt = "2026-11-01T00:00:00.000Z";
    promo.endsAt = "2026-11-30T23:59:59.000Z";

    // Antes de iniciar
    expect(await repository.getActive(tenantId, "2026-10-31T23:59:59.000Z")).toHaveLength(0);

    // Durante la vigencia
    expect(await repository.getActive(tenantId, "2026-11-15T12:00:00.000Z")).toHaveLength(1);

    // Después de expirar
    expect(await repository.getActive(tenantId, "2026-12-01T00:00:00.000Z")).toHaveLength(0);

    // Si status no es activo
    promo.status = PromotionStatus.Inactive;
    expect(await repository.getActive(tenantId, "2026-11-15T12:00:00.000Z")).toHaveLength(0);

    // Cuando status es activo y at está vacío, es válida
    promo.status = PromotionStatus.Active;
    expect(await repository.getActive(tenantId, "")).toHaveLength(1);
  });
});
