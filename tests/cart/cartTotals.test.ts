import { describe, expect, it } from "vitest";

import { DeliveryMethod } from "@/core";
import {
  calculateCartTotals,
  calculateHomeDeliveryShipping,
  FREE_SHIPPING_THRESHOLD,
  HOME_DELIVERY_SHIPPING_COST,
  type CartLine,
} from "@/modules/cart/application/cartTotals";
import {
  calculateCheckoutTotals,
  getShippingCost,
} from "@/modules/checkout/application/checkoutPricing";

const sampleLine = (price: number, quantity = 1): CartLine => ({
  id: "line-1",
  productId: "prod-1",
  productName: "Martillo de uña",
  sku: "MART-01",
  quantity,
  unitPrice: price,
  effectiveUnitPrice: price,
  lineSubtotal: price * quantity,
});

describe("calculateHomeDeliveryShipping", () => {
  it("usa las constantes por defecto si no se proporciona configuracion de la tienda", () => {
    expect(calculateHomeDeliveryShipping(299)).toBe(HOME_DELIVERY_SHIPPING_COST);
    expect(calculateHomeDeliveryShipping(300)).toBe(0);
    expect(calculateHomeDeliveryShipping(500)).toBe(0);
  });

  it("utiliza la tarifa dinamica de envio configurada en el backend (ej. Q. 50)", () => {
    const shippingConfig = {
      enabled: true,
      deliveryFee: 50,
      freeShippingThreshold: 300,
    };

    expect(calculateHomeDeliveryShipping(30, shippingConfig)).toBe(50);
    expect(calculateHomeDeliveryShipping(299.99, shippingConfig)).toBe(50);
    expect(calculateHomeDeliveryShipping(300, shippingConfig)).toBe(0);
  });

  it("retorna 0 si el envio esta deshabilitado", () => {
    const shippingConfig = {
      enabled: false,
      deliveryFee: 50,
      freeShippingThreshold: 300,
    };

    expect(calculateHomeDeliveryShipping(30, shippingConfig)).toBe(0);
  });

  it("respeta un umbral de envio gratis personalizado configurado en el backend", () => {
    const shippingConfig = {
      enabled: true,
      deliveryFee: 40,
      freeShippingThreshold: 150,
    };

    expect(calculateHomeDeliveryShipping(149, shippingConfig)).toBe(40);
    expect(calculateHomeDeliveryShipping(150, shippingConfig)).toBe(0);
  });

  it("no aplica envio gratis si el umbral es null o indefinido aunque el subtotal sea alto", () => {
    const shippingConfig = {
      enabled: true,
      deliveryFee: 50,
      freeShippingThreshold: null,
    };

    expect(calculateHomeDeliveryShipping(30, shippingConfig)).toBe(50);
    expect(calculateHomeDeliveryShipping(1000, shippingConfig)).toBe(50);
    expect(calculateHomeDeliveryShipping(50000, shippingConfig)).toBe(50);
  });

  it("no aplica envio gratis si el umbral es 0 o negativo", () => {
    const shippingConfig = {
      enabled: true,
      deliveryFee: 35,
      freeShippingThreshold: 0,
    };

    expect(calculateHomeDeliveryShipping(500, shippingConfig)).toBe(35);
  });
});

describe("calculateCartTotals", () => {
  it("calcula correctamente el total con envio dinamico de Q. 50 para un producto de Q. 30", () => {
    const shippingConfig = {
      enabled: true,
      deliveryFee: 50,
      freeShippingThreshold: 300,
    };

    const lines = [sampleLine(30, 1)];
    const totals = calculateCartTotals(lines, undefined, shippingConfig);

    expect(totals.subtotal).toBe(30);
    expect(totals.shippingCost).toBe(50);
    expect(totals.total).toBe(80);
  });

  it("aplica envio gratis si el subtotal supera el umbral", () => {
    const shippingConfig = {
      enabled: true,
      deliveryFee: 50,
      freeShippingThreshold: 300,
    };

    const lines = [sampleLine(150, 2)];
    const totals = calculateCartTotals(lines, undefined, shippingConfig);

    expect(totals.subtotal).toBe(300);
    expect(totals.shippingCost).toBe(0);
    expect(totals.total).toBe(300);
  });

  it("permite sobreescribir el costo de envio explicitamente si se proporciona", () => {
    const shippingConfig = {
      enabled: true,
      deliveryFee: 50,
      freeShippingThreshold: 300,
    };

    const lines = [sampleLine(30, 1)];
    const totals = calculateCartTotals(lines, 15, shippingConfig);

    expect(totals.subtotal).toBe(30);
    expect(totals.shippingCost).toBe(15);
    expect(totals.total).toBe(45);
  });
});

describe("checkoutPricing", () => {
  const shippingConfig = {
    enabled: true,
    deliveryFee: 50,
    freeShippingThreshold: 300,
  };

  it("retorna 0 de envio para retiro en sucursal (StorePickup)", () => {
    const fee = getShippingCost(DeliveryMethod.StorePickup, 30, shippingConfig);
    expect(fee).toBe(0);

    const totals = calculateCheckoutTotals([sampleLine(30)], DeliveryMethod.StorePickup, shippingConfig);
    expect(totals.shippingCost).toBe(0);
    expect(totals.total).toBe(30);
  });

  it("retorna la tarifa dinamica de envio para envio a domicilio (HomeDelivery)", () => {
    const fee = getShippingCost(DeliveryMethod.HomeDelivery, 30, shippingConfig);
    expect(fee).toBe(50);

    const totals = calculateCheckoutTotals([sampleLine(30)], DeliveryMethod.HomeDelivery, shippingConfig);
    expect(totals.shippingCost).toBe(50);
    expect(totals.total).toBe(80);
  });
});
