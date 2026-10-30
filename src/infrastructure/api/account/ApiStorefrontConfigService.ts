import type {
  Branch,
  BranchRepository,
  BusinessConfig,
  BusinessConfigRepository,
  EntityId,
  TenantId,
} from "@/core";

import type { ApiClient } from "../ApiClient";
import { resolveApiAssetUrl } from "../config";
import type { ApiStorefrontConfigResponse } from "./types";

// Corto a proposito: los cambios del panel web (logo, nombre, carrusel) deben verse en pocos segundos.
const CONFIG_TTL_MS = 60_000;
const DEFAULT_CURRENCY = "GTQ";

/**
 * Lee GET /public/{slug}/config una sola vez (con TTL corto) y lo comparte entre
 * la configuración comercial y las sucursales, que vienen en la misma respuesta.
 */
export class ApiStorefrontConfigService {
  private cached: { value: ApiStorefrontConfigResponse; expiresAt: number } | null = null;
  private inFlight: Promise<ApiStorefrontConfigResponse> | null = null;

  constructor(
    private readonly apiClient: ApiClient,
    private readonly tenantSlug: string,
  ) {}

  async get(): Promise<ApiStorefrontConfigResponse> {
    if (this.cached && this.cached.expiresAt > Date.now()) {
      return this.cached.value;
    }

    this.inFlight ??= this.apiClient
      .get<ApiStorefrontConfigResponse>(
        `/public/${encodeURIComponent(this.tenantSlug)}/config`,
      )
      .then((value) => {
        this.cached = { value, expiresAt: Date.now() + CONFIG_TTL_MS };
        return value;
      })
      .finally(() => {
        this.inFlight = null;
      });

    return this.inFlight;
  }
}

export class ApiBusinessConfigRepository implements BusinessConfigRepository {
  constructor(private readonly configService: ApiStorefrontConfigService) {}

  async getCurrent(): Promise<BusinessConfig> {
    const config = await this.configService.get();

    return {
      tenantId: config.tenantId,
      name: config.storeName,
      // El backend devuelve rutas relativas (/media/...): se completan con el origen de la API.
      logoUri: resolveApiAssetUrl(config.logoUrl),
      heroSlides: (config.slides ?? [])
        .map((slide) => ({
          title: slide.title?.trim() ?? "",
          description: slide.description?.trim() ?? "",
          imageUri: resolveApiAssetUrl(slide.imageUrl),
        }))
        .filter((slide) => slide.title || slide.imageUri),
      currency: DEFAULT_CURRENCY,
      support: {
        phone: config.contactPhone ?? undefined,
        email: config.contactEmail ?? undefined,
        address: config.branches[0]?.address ?? undefined,
      },
      shipping: config.shipping
        ? {
            enabled: Boolean(config.shipping.enabled),
            deliveryFee: Number(config.shipping.deliveryFee ?? 0),
            freeShippingThreshold: Number(config.shipping.freeShippingThreshold ?? 0),
          }
        : undefined,
    };
  }
}

export class ApiBranchRepository implements BranchRepository {
  constructor(private readonly configService: ApiStorefrontConfigService) {}

  async getAll(_tenantId: TenantId): Promise<Branch[]> {
    const config = await this.configService.get();

    return config.branches.map((branch) => ({
      id: branch.id,
      tenantId: config.tenantId,
      name: branch.name,
      code: branch.code ?? undefined,
      address: branch.address ?? "",
      phone: branch.phone ?? undefined,
      // El endpoint público solo expone sucursales habilitadas para e-commerce.
      isActive: true,
    }));
  }

  async getActive(tenantId: TenantId): Promise<Branch[]> {
    return this.getAll(tenantId);
  }

  async getById(id: EntityId): Promise<Branch | null> {
    const branches = await this.getAll("");
    return branches.find((branch) => branch.id === id) ?? null;
  }
}
