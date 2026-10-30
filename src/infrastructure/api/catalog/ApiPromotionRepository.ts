import {
  PromotionStatus,
  PromotionType,
  SalesChannel,
  type EntityId,
  type Promotion,
  type PromotionRepository,
  type TenantId,
} from "@/core";

import type { ApiStorefrontProduct } from "./types";

/**
 * Repositorio de promociones para modo API.
 * Extrae y proyecta las promociones activas a partir de los productos devueltos por el storefront
 * (GET /public/{slug}/products), donde cada producto expone basePrice, effectivePrice,
 * discountAmount y opcionalmente promotionId.
 */
export class ApiPromotionRepository implements PromotionRepository {
  private promotionsByProduct = new Map<EntityId, Promotion>();

  /**
   * Sincroniza las promociones a partir del catálogo o detalle de productos.
   * Si se sincroniza una lista completa de productos, purga las promociones previas.
   * Si es un producto individual (ej. detalle), actualiza solo ese producto sin purgar el resto.
   */
  syncFromProducts(
    products: ApiStorefrontProduct[],
    tenantId: TenantId,
  ): void {
    if (products.length > 1) {
      this.promotionsByProduct.clear();
    }

    for (const product of products) {
      const discountAmount = this.resolveDiscountAmount(product);

      if (discountAmount > 0) {
        this.promotionsByProduct.set(product.id, {
          id: product.promotionId || `promo-${product.id}`,
          tenantId,
          productId: product.id,
          type: PromotionType.FixedDiscount,
          value: discountAmount,
          channels: [SalesChannel.MobileApp, SalesChannel.Ecommerce],
          status: PromotionStatus.Active,
        });
      } else {
        this.promotionsByProduct.delete(product.id);
      }
    }
  }

  async getActive(
    tenantId?: TenantId,
    at = new Date().toISOString(),
  ): Promise<Promotion[]> {
    return [...this.promotionsByProduct.values()].filter((promo) =>
      this.isActive(promo, tenantId, at),
    );
  }

  async getByProduct(
    tenantId: TenantId,
    productId: EntityId,
    at = new Date().toISOString(),
  ): Promise<Promotion[]> {
    const promo = this.promotionsByProduct.get(productId);
    if (!promo || !this.isActive(promo, tenantId, at)) {
      return [];
    }

    return [promo];
  }

  clear(): void {
    this.promotionsByProduct.clear();
  }

  private resolveDiscountAmount(product: ApiStorefrontProduct): number {
    if (
      product.discountAmount != null &&
      Number(product.discountAmount) > 0
    ) {
      return Number(product.discountAmount);
    }

    if (
      product.basePrice != null &&
      product.effectivePrice != null &&
      Number(product.basePrice) > Number(product.effectivePrice)
    ) {
      const diff =
        Number(product.basePrice) - Number(product.effectivePrice);
      return Math.round(diff * 100) / 100;
    }

    if (
      product.salePrice != null &&
      product.effectivePrice != null &&
      Number(product.salePrice) > Number(product.effectivePrice)
    ) {
      const diff =
        Number(product.salePrice) - Number(product.effectivePrice);
      return Math.round(diff * 100) / 100;
    }

    return 0;
  }

  private isActive(
    promotion: Promotion,
    _tenantId?: TenantId,
    at?: string,
  ): boolean {
    if (promotion.status !== PromotionStatus.Active) {
      return false;
    }

    if (at) {
      if (promotion.startsAt && promotion.startsAt > at) {
        return false;
      }
      if (promotion.endsAt && promotion.endsAt < at) {
        return false;
      }
    }

    return true;
  }
}
