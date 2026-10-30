import { DeliveryMethod, NotificationType, OrderStatus, PaymentMethodType, PaymentStatus } from "@/core";
import type { RepositoryRegistry } from "@/infrastructure";

import { calculateCheckoutTotals } from "./checkoutPricing";
import type { CheckoutSelection } from "../context/CheckoutProvider";
import { calculatePrice } from "@/modules/catalog";
import type { CartLine } from "@/modules/cart";
import { showSystemNotification } from "@/modules/notifications";

export async function placeOrder(repositories: RepositoryRegistry, session: { tenantId: string; customerId: string }, selection: CheckoutSelection) {
  const cart = await repositories.cartRepository.getOrCreate(session.tenantId, session.customerId);
  const cartItems = await repositories.cartRepository.getItems(cart.id);

  if (cartItems.length === 0) {
    throw new Error("Cart is empty");
  }

  if (!selection.deliveryMethod || !selection.paymentMethod) {
    throw new Error("Checkout selection incomplete");
  }

  if (!selection.contactPhone.trim() || !selection.billingName.trim()) {
    throw new Error("Contact and billing required");
  }

  if (selection.deliveryMethod === DeliveryMethod.HomeDelivery && !selection.addressId) {
    throw new Error("Address required");
  }

  if (selection.deliveryMethod === DeliveryMethod.StorePickup && !selection.pickupBranchId) {
    throw new Error("Branch required");
  }

  const business = await repositories.businessConfigRepository.getCurrent();
  const customer = await repositories.customerRepository.getById(session.customerId);
  const address = selection.addressId ? await repositories.addressRepository.getById(selection.addressId) : null;
  const paymentMethods = await repositories.customerPaymentMethodRepository.getByCustomer(session.tenantId, session.customerId);
  const selectedPaymentMethod = paymentMethods.find((method) => method.id === selection.customerPaymentMethodId) ?? paymentMethods.find((method) => method.isDefault) ?? paymentMethods[0];
  const promotions = await repositories.promotionRepository.getActive(session.tenantId);
  const lines: CartLine[] = [];

  for (const item of cartItems) {
    const product = await repositories.productRepository.getById(item.productId);
    if (!product) {
      continue;
    }
    const price = calculatePrice(product, promotions);
    const effectiveUnitPrice = item.effectiveUnitPriceSnapshot ?? price.effectivePrice;
    lines.push({
      id: item.id,
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      quantity: item.quantity,
      unitPrice: item.unitPriceSnapshot ?? price.basePrice,
      effectiveUnitPrice,
      lineSubtotal: effectiveUnitPrice * item.quantity,
    });
  }

  const totals = calculateCheckoutTotals(lines, selection.deliveryMethod, business.shipping);
  const order = await repositories.orderRepository.create({
    tenantId: session.tenantId,
    number: await resolveNextOrderNumber(repositories, session.tenantId),
    customerId: session.customerId,
    branchId: selection.deliveryMethod === DeliveryMethod.StorePickup ? selection.pickupBranchId : undefined,
    status: OrderStatus.Confirmed,
    deliveryMethod: selection.deliveryMethod,
    deliveryAddressSnapshot: address
      ? {
          label: address.label,
          addressLine: address.addressLine,
          municipality: address.municipality,
          department: address.department,
          phone: address.phone,
          latitude: address.latitude,
          longitude: address.longitude,
        }
      : undefined,
    contactSnapshot: { name: customer?.name ?? selection.billingName.trim(), email: customer?.email, phone: selection.contactPhone.trim() },
    billingSnapshot: { name: selection.billingName.trim(), nit: selection.nit?.trim() || undefined },
    subtotal: totals.subtotalBeforeDiscount,
    discount: totals.discount,
    shippingCost: totals.shippingCost,
    total: totals.total,
    paymentStatus: PaymentStatus.Approved,
    items: lines.map((line) => ({
      productId: line.productId,
      productNameSnapshot: line.productName,
      skuSnapshot: line.sku,
      quantity: line.quantity,
      unitPriceSnapshot: line.unitPrice,
      effectiveUnitPriceSnapshot: line.effectiveUnitPrice,
      subtotal: line.lineSubtotal,
    })),
  });
  const confirmedOrder = await repositories.orderRepository.updateStatus(order.id, OrderStatus.Confirmed);

  await repositories.paymentRepository.create({
    tenantId: session.tenantId,
    orderId: confirmedOrder.id,
    customerId: session.customerId,
    method: PaymentMethodType.Card,
    status: PaymentStatus.Approved,
    amount: totals.total,
    reference: selectedPaymentMethod?.last4 ? `APPROVED-${confirmedOrder.number}-${selectedPaymentMethod.last4}` : `APPROVED-${confirmedOrder.number}`,
    customerPaymentMethodId: selectedPaymentMethod?.id,
    cardBrandSnapshot: selectedPaymentMethod?.brand,
    cardLast4Snapshot: selectedPaymentMethod?.last4,
  });
  const notificationTitle = "Pedido confirmado";
  const notificationMessage = `Tu pedido ${confirmedOrder.number} fue confirmado.`;

  await repositories.notificationRepository.create({
    tenantId: session.tenantId,
    customerId: session.customerId,
    type: NotificationType.OrderConfirmed,
    title: notificationTitle,
    message: notificationMessage,
    relatedOrderId: confirmedOrder.id,
  });

  await showSystemNotification({
    title: notificationTitle,
    body: notificationMessage,
    orderId: confirmedOrder.id,
  });
  await repositories.cartRepository.clear(cart.id);

  return { business, order: confirmedOrder, totals };
}

async function resolveNextOrderNumber(repositories: RepositoryRegistry, tenantId: string): Promise<string> {
  let next = 1;

  while (await repositories.orderRepository.getByNumber(tenantId, formatOrderNumber(next))) {
    next += 1;
  }

  return formatOrderNumber(next);
}

function formatOrderNumber(next: number): string {
  return `APP-2026-${next.toString().padStart(5, "0")}`;
}
