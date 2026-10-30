import { type BusinessShippingConfig, DeliveryMethod } from "@/core";
import {
  calculateCartTotals,
  calculateHomeDeliveryShipping,
  type CartLine,
} from "@/modules/cart/application/cartTotals";

export const DEMO_STORE_PICKUP_SHIPPING_COST = 0;

export function getShippingCost(
  deliveryMethod: DeliveryMethod | null,
  subtotal: number,
  shippingConfig?: BusinessShippingConfig,
): number {
  return deliveryMethod === DeliveryMethod.HomeDelivery
    ? calculateHomeDeliveryShipping(subtotal, shippingConfig)
    : DEMO_STORE_PICKUP_SHIPPING_COST;
}

export function calculateCheckoutTotals(
  lines: CartLine[],
  deliveryMethod: DeliveryMethod | null,
  shippingConfig?: BusinessShippingConfig,
) {
  const cartTotals = calculateCartTotals(lines, 0, shippingConfig);
  return calculateCartTotals(
    lines,
    getShippingCost(deliveryMethod, cartTotals.subtotal, shippingConfig),
    shippingConfig,
  );
}
