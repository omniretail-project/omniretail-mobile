import type { CurrencyCode, TenantId } from "../types";

export type SupportInfo = {
  phone?: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  openingHours?: string;
};

export type BusinessBranding = {
  primaryColor?: string;
  accentColor?: string;
};

/** Diapositiva del carrusel de la tienda, configurada en el panel web. */
export type BusinessHeroSlide = {
  title: string;
  description: string;
  imageUri?: string;
};

export type BusinessShippingConfig = {
  enabled: boolean;
  deliveryFee: number;
  freeShippingThreshold?: number | null;
};

export type BusinessConfig = {
  tenantId: TenantId;
  name: string;
  slogan?: string;
  logoUri?: string;
  heroSlides?: BusinessHeroSlide[];
  currency: CurrencyCode;
  support: SupportInfo;
  branding?: BusinessBranding;
  shipping?: BusinessShippingConfig;
};
