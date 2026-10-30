import {
  ProductStatus,
  ProductType,
  SalesChannel,
  type EntityId,
  type Product,
  type ProductRepository,
  type ProductSearchInput,
  type TenantId,
} from "@/core";

import type { ApiClient } from "../ApiClient";
import { ApiCategoryRepository } from "./ApiCategoryRepository";
import { ApiProductAvailabilityRepository } from "./ApiProductAvailabilityRepository";
import { ApiProductMediaRepository } from "./ApiProductMediaRepository";
import { ApiPromotionRepository } from "./ApiPromotionRepository";
import type { ApiStorefrontProduct } from "./types";

export class ApiProductRepository implements ProductRepository {
  private products = new Map<EntityId, Product>();

  constructor(
    private readonly apiClient: ApiClient,
    private readonly tenantSlug: string,
    private readonly categoryRepository?: ApiCategoryRepository,
    private readonly availabilityRepository?: ApiProductAvailabilityRepository,
    private readonly mediaRepository?: ApiProductMediaRepository,
    private readonly promotionRepository?: ApiPromotionRepository,
  ) {}

  async getAll(tenantId: TenantId): Promise<Product[]> {
    const response = await this.apiClient.get<ApiStorefrontProduct[]>(
      this.productsPath(),
    );

    const products = response.map((item) =>
      this.toProduct(item, tenantId),
    );

    this.cache(products);
    this.categoryRepository?.syncFromProducts(response, tenantId);
    this.availabilityRepository?.syncFromProducts(response, tenantId);
    this.mediaRepository?.syncFromProducts(response, tenantId);
    this.promotionRepository?.syncFromProducts(response, tenantId);
    return products;
  }

  async getById(id: EntityId): Promise<Product | null> {
    try {
      const response =
        await this.apiClient.get<ApiStorefrontProduct>(
          `${this.productsPath()}/${id}`,
        );

      const tenantId = this.resolveTenantId();
      const product = this.toProduct(response, tenantId);

      this.products.set(product.id, product);
      // El detalle puede abrirse sin haber cargado el catálogo (deep link, recarga en web).
      this.availabilityRepository?.syncFromProducts([response], tenantId);
      this.mediaRepository?.syncFromProducts([response], tenantId);
      this.promotionRepository?.syncFromProducts([response], tenantId);
      return product;
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "status" in error &&
        error.status === 404
      ) {
        return null;
      }

      throw error;
    }
  }

  async search(input: ProductSearchInput): Promise<Product[]> {
    const products = await this.getAll(input.tenantId);
    const query = input.query.trim().toLocaleLowerCase();

    return products.filter((product) => {
      const matchesQuery =
        !query ||
        product.name.toLocaleLowerCase().includes(query) ||
        product.sku.toLocaleLowerCase().includes(query);

      const matchesCategory =
        !input.categoryId ||
        product.categoryId === input.categoryId;

      return matchesQuery && matchesCategory;
    });
  }

  async getByCategory(
    tenantId: TenantId,
    categoryId: EntityId,
  ): Promise<Product[]> {
    const products = await this.getAll(tenantId);

    return products.filter(
      (product) => product.categoryId === categoryId,
    );
  }

  private productsPath(): string {
    return `/public/${encodeURIComponent(this.tenantSlug)}/products`;
  }

  private toProduct(
    item: ApiStorefrontProduct,
    tenantId: TenantId,
  ): Product {
    return {
      id: item.id,
      tenantId,
      sku: item.sku,
      name: item.name,
      description: item.description ?? undefined,
      categoryId: item.categoryId,
      unitId: item.saleUnitId,
      type: ProductType.Physical,
      status: ProductStatus.Published,
      channels: [SalesChannel.Ecommerce, SalesChannel.MobileApp],
      basePrice: {
        productId: item.id,
        currency: "GTQ",
        amount: this.resolveBasePrice(item),
      },
      createdAt: "",
      updatedAt: "",
    };
  }

  private resolveBasePrice(item: ApiStorefrontProduct): number {
    if (item.basePrice != null && Number(item.basePrice) > 0) {
      return Number(item.basePrice);
    }

    if (item.salePrice != null && Number(item.salePrice) > 0) {
      return Number(item.salePrice);
    }

    if (
      item.discountAmount != null &&
      Number(item.discountAmount) > 0 &&
      item.effectivePrice != null
    ) {
      return (
        Math.round(
          (Number(item.effectivePrice) + Number(item.discountAmount)) * 100,
        ) / 100
      );
    }

    return Number(item.effectivePrice ?? 0);
  }

  private cache(products: Product[]): void {
    this.products.clear();

    for (const product of products) {
      this.products.set(product.id, product);
    }
  }

  private resolveTenantId(): TenantId {
    const first = this.products.values().next().value as
      | Product
      | undefined;

    return first?.tenantId ?? this.tenantSlug;
  }
}
