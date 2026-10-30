import type { BusinessShippingConfig } from "@/core";
import { roundMoney } from "@/modules/catalog/application/pricing";
import type { ProductImageViewModel } from "@/modules/catalog/application/productMediaImages";

export type CartLine = {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  image?: ProductImageViewModel;
  quantity: number;
  unitPrice: number;
  effectiveUnitPrice: number;
  lineSubtotal: number;
};

export type CartTotals = {
  subtotalBeforeDiscount: number;
  discount: number;
  subtotal: number;
  shippingCost: number;
  total: number;
};

export const FREE_SHIPPING_THRESHOLD = 300;
export const HOME_DELIVERY_SHIPPING_COST = 25;

export function calculateHomeDeliveryShipping(
  subtotal: number,
  shippingConfig?: BusinessShippingConfig,
): number {
  if (shippingConfig && !shippingConfig.enabled) {
    return 0;
  }
  const threshold = shippingConfig?.freeShippingThreshold ?? FREE_SHIPPING_THRESHOLD;
  const cost = shippingConfig?.deliveryFee ?? HOME_DELIVERY_SHIPPING_COST;
  return subtotal >= threshold ? 0 : cost;
}

export function calculateCartTotals(
  lines: CartLine[],
  shippingCost?: number,
  shippingConfig?: BusinessShippingConfig,
): CartTotals {
  const subtotalBeforeDiscount = roundMoney(lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0));
  const subtotal = roundMoney(lines.reduce((sum, line) => sum + line.effectiveUnitPrice * line.quantity, 0));
  const discount = roundMoney(subtotalBeforeDiscount - subtotal);
  const resolvedShipping = shippingCost ?? calculateHomeDeliveryShipping(subtotal, shippingConfig);

  return {
    subtotalBeforeDiscount,
    discount,
    subtotal,
    shippingCost: resolvedShipping,
    total: roundMoney(subtotal + resolvedShipping),
  };
}
