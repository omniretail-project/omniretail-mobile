import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { DeliveryMethod, OrderStatus, PaymentMethodType } from "@/core";
import { isApiMode, useRepositories } from "@/infrastructure";
import { useSession } from "@/modules/auth";
import { useCart } from "@/modules/cart";
import { useInvoiceDownload } from "@/modules/invoice";
import { formatCurrency, KeyboardAwareContainer, useBusinessConfig } from "@/shared";
import { colors, spacing, typography } from "@/theme";

import { calculateCheckoutTotals } from "../application/checkoutPricing";
import { placeOrder } from "../application/PlaceOrderService";
import { useCheckout } from "../context/CheckoutProvider";
import {
  ApiCheckoutDeliveryScreen,
  ApiCheckoutPaymentScreen,
  ApiCheckoutReviewScreen,
  ApiCheckoutSuccessScreen,
} from "./ApiCheckoutScreens";

type CheckoutHeroProps = {
  badge: string;
  description: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
};

function CheckoutHero({
  badge,
  description,
  icon,
  title,
}: CheckoutHeroProps) {
  return (
    <View style={styles.checkoutHero}>
      <View style={styles.checkoutHeroDecorationOne} />
      <View style={styles.checkoutHeroDecorationTwo} />

      <View style={styles.checkoutHeroTop}>
        <View style={styles.checkoutHeroTitleArea}>
          <Pressable
            accessibilityLabel="Regresar"
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.checkoutBackButton,
              pressed ? styles.pressed : null,
            ]}
          >
            <Ionicons
              color="#FFFFFF"
              name="arrow-back"
              size={20}
            />
          </Pressable>

          <View>
            <Text style={styles.checkoutBrand}>FERREPHARMA</Text>
            <Text
              adjustsFontSizeToFit
              numberOfLines={1}
              style={styles.checkoutHeroTitle}
            >
              {title}
            </Text>
          </View>
        </View>

        <View style={styles.checkoutHeroIcon}>
          <Ionicons
            color="#3E668F"
            name={icon}
            size={24}
          />
        </View>
      </View>

      <Text style={styles.checkoutHeroDescription}>
        {description}
      </Text>

      <View style={styles.checkoutStepBadge}>
        <Ionicons
          color="#3E668F"
          name="checkmark-circle-outline"
          size={15}
        />

        <Text style={styles.checkoutStepText}>
          {badge}
        </Text>
      </View>
    </View>
  );
}

function MockCheckoutDeliveryScreen() {
  const { addressRepository, branchRepository } = useRepositories();
  const { customer, session } = useSession();
  const checkout = useCheckout();
  const [addresses, setAddresses] = useState<Awaited<ReturnType<typeof addressRepository.getByCustomer>>>([]);
  const [branches, setBranches] = useState<Awaited<ReturnType<typeof branchRepository.getActive>>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (session) {
        const nextAddresses = await addressRepository.getByCustomer(session.tenantId, session.customerId);
        const nextBranches = await branchRepository.getActive(session.tenantId);
        setAddresses(nextAddresses);
        setBranches(nextBranches);
        const defaultAddress = nextAddresses.find((address) => address.isDefault);
        if (!checkout.addressId && defaultAddress) {
          checkout.setAddressId(defaultAddress.id);
        }
        if (!checkout.contactPhone.trim()) {
          checkout.setContactPhone(defaultAddress?.phone ?? customer?.phone ?? "");
        }
        if (!checkout.billingName.trim()) {
          checkout.setBillingName(customer?.name ?? "");
        }
        if (!checkout.pickupBranchId && nextBranches[0]) {
          checkout.setPickupBranchId(nextBranches[0].id);
        }
      }
      setIsLoading(false);
    }
    void load();
  }, [addressRepository, branchRepository, checkout, customer, session]);

  if (isLoading) {
    return <ActivityIndicator color={colors.primary} style={styles.loading} />;
  }

  return (
    <KeyboardAwareContainer
      contentContainerStyle={styles.content}
      extraBottomSpace={60}
    >
      <CheckoutHero
        badge="1 de 3 · Entrega"
        description="Elige cómo quieres recibir tu pedido."
        icon="car-outline"
        title="Entrega"
      />

      <View style={styles.checkoutSection}>
        <Text style={styles.sectionTitle}>Método de entrega</Text>

        <View style={styles.deliveryOptions}>
          <Pressable
            onPress={() =>
              checkout.setDeliveryMethod(DeliveryMethod.HomeDelivery)
            }
            style={[
              styles.deliveryOption,
              checkout.deliveryMethod === DeliveryMethod.HomeDelivery
                ? styles.deliveryOptionActive
                : null,
            ]}
          >
            <View style={styles.optionIcon}>
              <Text style={styles.optionIconText}>⌂</Text>
            </View>

            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Envío a casa</Text>
              <Text style={styles.muted}>
                Recibe tu compra en tu dirección.
              </Text>
            </View>

            <View
              style={[
                styles.radio,
                checkout.deliveryMethod === DeliveryMethod.HomeDelivery
                  ? styles.radioActive
                  : null,
              ]}
            />
          </Pressable>

          <Pressable
            onPress={() =>
              checkout.setDeliveryMethod(DeliveryMethod.StorePickup)
            }
            style={[
              styles.deliveryOption,
              checkout.deliveryMethod === DeliveryMethod.StorePickup
                ? styles.deliveryOptionActive
                : null,
            ]}
          >
            <View style={styles.optionIcon}>
              <Text style={styles.optionIconText}>▣</Text>
            </View>

            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Retiro en tienda</Text>
              <Text style={styles.muted}>
                Recoge tu pedido en una sucursal.
              </Text>
            </View>

            <View
              style={[
                styles.radio,
                checkout.deliveryMethod === DeliveryMethod.StorePickup
                  ? styles.radioActive
                  : null,
              ]}
            />
          </Pressable>
        </View>
      </View>

      {checkout.deliveryMethod === DeliveryMethod.HomeDelivery ? (
        <View style={styles.checkoutSection}>
          <Text style={styles.sectionTitle}>Dirección de entrega</Text>
          <Text style={styles.muted}>
            Selecciona dónde quieres recibir tu pedido.
          </Text>

          {addresses.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.optionTitle}>
                No tienes direcciones guardadas
              </Text>

              <Pressable
                onPress={() =>
                  router.push("/(protected)/addresses/new")
                }
              >
                <Text style={styles.link}>Agregar dirección</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.group}>
              {addresses.map((address) => {
                const active = checkout.addressId === address.id;

                return (
                  <Pressable
                    key={address.id}
                    onPress={() => checkout.setAddressId(address.id)}
                    style={[
                      styles.addressOption,
                      active ? styles.addressOptionActive : null,
                    ]}
                  >
                    <View style={styles.optionContent}>
                      <Text style={styles.optionTitle}>{address.label}</Text>
                      <Text style={styles.muted}>{address.addressLine}</Text>
                    </View>

                    <View
                      style={[
                        styles.radio,
                        active ? styles.radioActive : null,
                      ]}
                    />
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      ) : null}

      {checkout.deliveryMethod === DeliveryMethod.StorePickup ? (
        <View style={styles.checkoutSection}>
          <Text style={styles.sectionTitle}>Sucursal</Text>
          <Text style={styles.muted}>
            Selecciona dónde quieres recoger tu pedido.
          </Text>

          <View style={styles.group}>
            {branches.map((branch) => {
              const active = checkout.pickupBranchId === branch.id;

              return (
                <Pressable
                  key={branch.id}
                  onPress={() => checkout.setPickupBranchId(branch.id)}
                  style={[
                    styles.addressOption,
                    active ? styles.addressOptionActive : null,
                  ]}
                >
                  <View style={styles.optionContent}>
                    <Text style={styles.optionTitle}>{branch.name}</Text>
                    <Text style={styles.muted}>{branch.address}</Text>
                  </View>

                  <View
                    style={[
                      styles.radio,
                      active ? styles.radioActive : null,
                    ]}
                  />
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      <View style={styles.checkoutSection}>
        <Text style={styles.sectionTitle}>Información de contacto</Text>
        <Text style={styles.muted}>
          Usaremos estos datos para coordinar tu pedido.
        </Text>

        <View style={styles.group}>
          <Field
            keyboardType="phone-pad"
            label="Teléfono de contacto"
            onChangeText={checkout.setContactPhone}
            value={checkout.contactPhone}
          />

          <Field
            label="Nombre de facturación"
            onChangeText={checkout.setBillingName}
            value={checkout.billingName}
          />

          <Field
            autoCapitalize="characters"
            label="NIT (opcional)"
            onChangeText={checkout.setNit}
            value={checkout.nit ?? ""}
          />
        </View>
      </View>

      <Pressable
        onPress={() => router.push("/(protected)/checkout/payment")}
        style={styles.primaryButton}
      >
        <Text style={styles.primaryText}>Continuar al pago</Text>
      </Pressable>

      <Text style={styles.checkoutFooter}>
        Podrás revisar todos los datos antes de confirmar.
      </Text>
    </KeyboardAwareContainer>
  );
}

function MockCheckoutPaymentScreen() {
  const { customerPaymentMethodRepository } = useRepositories();
  const { session } = useSession();
  const checkout = useCheckout();
  const [methods, setMethods] = useState<Awaited<ReturnType<typeof customerPaymentMethodRepository.getByCustomer>>>([]);

  const loadMethods = useCallback(async () => {
    if (session) {
      const nextMethods = await customerPaymentMethodRepository.getByCustomer(session.tenantId, session.customerId);
      setMethods(nextMethods);
      checkout.setPaymentMethod(PaymentMethodType.Card);
      const selectedStillExists = nextMethods.some((method) => method.id === checkout.customerPaymentMethodId);
      const defaultMethod = nextMethods.find((method) => method.isDefault) ?? nextMethods[0];
      if ((!checkout.customerPaymentMethodId || !selectedStillExists) && defaultMethod) {
        checkout.setCustomerPaymentMethodId(defaultMethod.id);
      }
    }
  }, [checkout, customerPaymentMethodRepository, session]);

  useEffect(() => {
    const timeout = setTimeout(() => void loadMethods(), 0);
    return () => clearTimeout(timeout);
  }, [loadMethods]);

  useFocusEffect(
    useCallback(() => {
      void loadMethods();
    }, [loadMethods]),
  );

  return (
    <KeyboardAwareContainer
      contentContainerStyle={styles.content}
      extraBottomSpace={60}
    >
      <CheckoutHero
        badge="2 de 3 · Pago"
        description="Selecciona cómo quieres pagar tu pedido."
        icon="card-outline"
        title="Pago"
      />

      <View style={styles.checkoutSection}>
        <Text style={styles.sectionTitle}>Método de pago</Text>

        <View style={styles.paymentType}>
          <View style={styles.paymentIcon}>
            <Text style={styles.paymentIconText}>▰</Text>
          </View>

          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>Tarjeta</Text>
            <Text style={styles.muted}>
              Pago simulado para esta demostración.
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.checkoutSection}>
        <Text style={styles.sectionTitle}>Tus tarjetas</Text>

        {methods.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.optionTitle}>
              No tienes tarjetas guardadas
            </Text>
            <Text style={styles.muted}>
              Se utilizará una tarjeta demo segura.
            </Text>
          </View>
        ) : (
          <View style={styles.group}>
            {methods.map((method) => {
              const active =
                checkout.customerPaymentMethodId === method.id;

              return (
                <Pressable
                  key={method.id}
                  onPress={() => {
                    checkout.setPaymentMethod(PaymentMethodType.Card);
                    checkout.setCustomerPaymentMethodId(method.id);
                  }}
                  style={[
                    styles.paymentCard,
                    active ? styles.paymentCardActive : null,
                  ]}
                >
                  <View style={styles.paymentCardTop}>
                    <View style={styles.paymentIcon}>
                      <Text style={styles.paymentIconText}>▰</Text>
                    </View>

                    <View
                      style={[
                        styles.radio,
                        active ? styles.radioActive : null,
                      ]}
                    />
                  </View>

                  <Text style={styles.cardBrand}>
                    {method.brand ?? "Tarjeta"}
                  </Text>

                  <Text style={styles.cardNumber}>
                    •••• •••• •••• {method.last4 ?? "demo"}
                  </Text>

                  <Text style={styles.muted}>
                    Expira{" "}
                    {formatExpiration(
                      method.expirationMonth,
                      method.expirationYear,
                    )}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <Pressable
          onPress={() =>
            router.push({
              pathname: "/(protected)/account/new-payment-method",
              params: { returnTo: "checkout" },
            })
          }
          style={styles.addPaymentButton}
        >
          <Text style={styles.addPaymentText}>+ Agregar nueva tarjeta</Text>
        </Pressable>
      </View>

      <View style={styles.securityRow}>
        <View style={styles.securityIcon}>
          <Text style={styles.securityIconText}>✓</Text>
        </View>

        <View style={styles.securityContent}>
          <Text style={styles.securityTitle}>Pago seguro</Text>
          <Text style={styles.muted}>
            Esta aplicación utiliza un pago simulado. No se solicita ni
            almacena información bancaria real.
          </Text>
        </View>
      </View>

      <Pressable
        onPress={() => router.push("/(protected)/checkout/review")}
        style={styles.primaryButton}
      >
        <Text style={styles.primaryText}>Revisar pedido</Text>
      </Pressable>

      <Text style={styles.checkoutFooter}>
        Aún no se realizará ningún cobro.
      </Text>
    </KeyboardAwareContainer>
  );
}

function MockCheckoutReviewScreen() {
  const repositories = useRepositories();
  const { session } = useSession();
  const checkout = useCheckout();
  const { currency, lines, reload } = useCart();
  const [error, setError] = useState<string | null>(null);
  const [deliveryLabel, setDeliveryLabel] = useState("Pendiente");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { shipping } = useBusinessConfig();
  const totals = calculateCheckoutTotals(lines, checkout.deliveryMethod, shipping);

  useEffect(() => {
    async function loadDeliveryLabel() {
      if (checkout.deliveryMethod === DeliveryMethod.HomeDelivery && checkout.addressId) {
        const address = await repositories.addressRepository.getById(checkout.addressId);
        setDeliveryLabel(address ? `${address.label}: ${address.addressLine}` : "Direccion pendiente");
      } else if (checkout.deliveryMethod === DeliveryMethod.StorePickup && checkout.pickupBranchId) {
        const branch = await repositories.branchRepository.getById(checkout.pickupBranchId);
        setDeliveryLabel(branch ? `${branch.name}: ${branch.address}` : "Sucursal pendiente");
      } else {
        setDeliveryLabel("Pendiente");
      }
    }
    const timeout = setTimeout(() => void loadDeliveryLabel(), 0);
    return () => clearTimeout(timeout);
  }, [checkout.addressId, checkout.deliveryMethod, checkout.pickupBranchId, repositories.addressRepository, repositories.branchRepository]);

  async function confirm() {
    if (!session) {
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      if (!checkout.contactPhone.trim() || !checkout.billingName.trim()) {
        throw new Error("Contact and billing required");
      }
      const result = await placeOrder(repositories, session, checkout);
      checkout.setLastOrderId(result.order.id);
      checkout.resetCheckout();
      await reload();
      router.replace({ pathname: "/(protected)/checkout/success", params: { orderId: result.order.id } });
    } catch {
      setError("Completa entrega, pago y carrito antes de confirmar.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <CheckoutHero
        badge="3 de 3 · Confirmación"
        description="Revisa los detalles de tu compra antes de confirmar."
        icon="document-text-outline"
        title="Revisar pedido"
      />

      <View style={styles.checkoutSection}>
        <Text style={styles.sectionTitle}>Productos</Text>

        {lines.map((line) => (
          <View key={line.id} style={styles.reviewProduct}>
            <View style={styles.reviewProductInfo}>
              <Text style={styles.reviewProductName}>{line.productName}</Text>
              <Text style={styles.muted}>
                Cantidad: {line.quantity}
              </Text>
            </View>

            <Text style={styles.reviewPrice}>
              {formatCurrency(line.lineSubtotal, currency)}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.checkoutSection}>
        <Text style={styles.sectionTitle}>Entrega</Text>

        <View style={styles.reviewDetail}>
          <Text style={styles.reviewDetailLabel}>Método</Text>
          <Text style={styles.reviewDetailValue}>
            {checkout.deliveryMethod === DeliveryMethod.HomeDelivery
              ? "Envío a casa"
              : "Retiro en tienda"}
          </Text>
        </View>

        <View style={styles.reviewDetail}>
          <Text style={styles.reviewDetailLabel}>Dirección</Text>
          <Text style={styles.reviewDetailValue}>{deliveryLabel}</Text>
        </View>

        <View style={styles.reviewDetail}>
          <Text style={styles.reviewDetailLabel}>Teléfono</Text>
          <Text style={styles.reviewDetailValue}>
            {checkout.contactPhone || "Pendiente"}
          </Text>
        </View>
      </View>

      <View style={styles.checkoutSection}>
        <Text style={styles.sectionTitle}>Facturación</Text>

        <View style={styles.reviewDetail}>
          <Text style={styles.reviewDetailLabel}>Nombre</Text>
          <Text style={styles.reviewDetailValue}>
            {checkout.billingName || "Pendiente"}
          </Text>
        </View>

        <View style={styles.reviewDetail}>
          <Text style={styles.reviewDetailLabel}>NIT</Text>
          <Text style={styles.reviewDetailValue}>
            {checkout.nit?.trim() || "CF"}
          </Text>
        </View>
      </View>

      <View style={styles.checkoutSection}>
        <Text style={styles.sectionTitle}>Pago</Text>

        <View style={styles.reviewDetail}>
          <Text style={styles.reviewDetailLabel}>Método</Text>
          <Text style={styles.reviewDetailValue}>Tarjeta</Text>
        </View>

        <Text style={styles.muted}>
          El pago se procesa de forma simulada para esta demostración.
        </Text>
      </View>

      <View style={styles.checkoutSummary}>
        <Text style={styles.sectionTitle}>Resumen</Text>

        <View style={styles.summaryRow}>
          <Text style={styles.muted}>Subtotal</Text>
          <Text style={styles.summaryValue}>
            {formatCurrency(totals.subtotal, currency)}
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.muted}>Descuento</Text>
          <Text style={styles.summaryValue}>
            {formatCurrency(totals.discount, currency)}
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.muted}>Envío</Text>
          <Text style={styles.summaryValue}>
            {formatCurrency(totals.shippingCost, currency)}
          </Text>
        </View>

        <View style={styles.summaryDivider} />

        <View style={styles.summaryRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.total}>
            {formatCurrency(totals.total, currency)}
          </Text>
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        disabled={isSubmitting || lines.length === 0}
        onPress={confirm}
        style={[
          styles.primaryButton,
          isSubmitting || lines.length === 0 ? styles.disabled : null,
        ]}
      >
        {isSubmitting ? (
          <ActivityIndicator color={colors.surface} />
        ) : (
          <Text style={styles.primaryText}>Confirmar pedido</Text>
        )}
      </Pressable>

      <Text style={styles.reviewFooter}>
        Verifica que tus datos sean correctos antes de confirmar.
      </Text>
    </ScrollView>
  );
}

function MockCheckoutSuccessScreen() {
  const { orderId } = useLocalSearchParams<{ orderId?: string }>();
  const { orderRepository, businessConfigRepository } = useRepositories();
  const {
    downloadInvoice,
    error: invoiceError,
    isGenerating,
  } = useInvoiceDownload();

  const [order, setOrder] =
    useState<Awaited<ReturnType<typeof orderRepository.getById>>>(null);

  const [currency, setCurrency] = useState("GTQ");

  useEffect(() => {
    async function load() {
      setCurrency(
        (await businessConfigRepository.getCurrent()).currency,
      );

      if (orderId) {
        setOrder(await orderRepository.getById(orderId));
      }
    }

    void load();
  }, [businessConfigRepository, orderId, orderRepository]);

  const orderNumber = order?.number ?? "Pedido creado";
  const orderStatus = order?.status ?? OrderStatus.Confirmed;

  return (
    <ScrollView contentContainerStyle={styles.successContent}>
      <View style={styles.successHero}>
        <View style={styles.checkoutHeroDecorationOne} />
        <View style={styles.checkoutHeroDecorationTwo} />

        <View style={styles.successHeroTop}>
          <View>
            <Text style={styles.checkoutBrand}>FERREPHARMA</Text>

            <Text style={styles.successHeroTitle}>
              ¡Pedido confirmado!
            </Text>
          </View>

          <View style={styles.successHeroIcon}>
            <Ionicons
              color="#3E668F"
              name="checkmark-circle"
              size={30}
            />
          </View>
        </View>

        <Text style={styles.successHeroDescription}>
          Tu compra fue realizada con éxito. Ya estamos preparando
          tu pedido.
        </Text>

        <View style={styles.successOrderBadge}>
          <Ionicons
            color="#3E668F"
            name="receipt-outline"
            size={15}
          />

          <Text style={styles.successOrderBadgeText}>
            {orderNumber}
          </Text>
        </View>
      </View>

      <View style={styles.successCard}>
        <View style={styles.successCardHeader}>
          <View>
            <Text style={styles.successEyebrow}>
              RESUMEN DEL PEDIDO
            </Text>

            <Text style={styles.successCardTitle}>
              Compra completada
            </Text>
          </View>

          <View style={styles.successMiniIcon}>
            <Ionicons
              color="#3E668F"
              name="bag-check-outline"
              size={22}
            />
          </View>
        </View>

        <View style={styles.successInfoRow}>
          <View style={styles.successInfoIcon}>
            <Ionicons
              color="#3E668F"
              name="receipt-outline"
              size={18}
            />
          </View>

          <View style={styles.successInfoContent}>
            <Text style={styles.successInfoLabel}>
              Número de pedido
            </Text>

            <Text style={styles.successInfoValue}>
              {orderNumber}
            </Text>
          </View>
        </View>

        <View style={styles.successDivider} />

        <View style={styles.successInfoRow}>
          <View style={styles.successInfoIcon}>
            <Ionicons
              color="#247A52"
              name="checkmark-circle-outline"
              size={19}
            />
          </View>

          <View style={styles.successInfoContent}>
            <Text style={styles.successInfoLabel}>
              Estado
            </Text>

            <View style={styles.successStatusBadge}>
              <View style={styles.successStatusDot} />

              <Text style={styles.successStatusText}>
                {orderStatus}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.successDivider} />

        <View style={styles.successTotalRow}>
          <View>
            <Text style={styles.successInfoLabel}>
              Total pagado
            </Text>

            <Text style={styles.successTotalHint}>
              Gracias por comprar en FERREPHARMA
            </Text>
          </View>

          <Text style={styles.successTotal}>
            {formatCurrency(order?.total ?? 0, currency)}
          </Text>
        </View>
      </View>

      <View style={styles.successActions}>
        <Pressable
          disabled={!order}
          onPress={() => {
            if (!order) {
              return;
            }

            router.push({
              pathname: "/(protected)/orders/[id]",
              params: { id: order.id },
            });
          }}
          style={({ pressed }) => [
            styles.successSecondaryButton,
            !order ? styles.disabled : null,
            pressed && order ? styles.pressed : null,
          ]}
        >
          <View style={styles.successActionIcon}>
            <Ionicons
              color="#3E668F"
              name="eye-outline"
              size={20}
            />
          </View>

          <Text style={styles.successSecondaryText}>
            Ver pedido
          </Text>

          <Ionicons
            color="#3E668F"
            name="chevron-forward"
            size={19}
          />
        </Pressable>

        <Pressable
          disabled={!order || isGenerating}
          onPress={() =>
            order ? void downloadInvoice(order) : undefined
          }
          style={({ pressed }) => [
            styles.successSecondaryButton,
            !order || isGenerating ? styles.disabled : null,
            pressed && order && !isGenerating
              ? styles.pressed
              : null,
          ]}
        >
          <View style={styles.successActionIcon}>
            {isGenerating ? (
              <ActivityIndicator
                color="#3E668F"
                size="small"
              />
            ) : (
              <Ionicons
                color="#3E668F"
                name="download-outline"
                size={20}
              />
            )}
          </View>

          <Text style={styles.successSecondaryText}>
            {isGenerating
              ? "Generando factura..."
              : "Descargar factura"}
          </Text>

          {!isGenerating ? (
            <Ionicons
              color="#3E668F"
              name="chevron-forward"
              size={19}
            />
          ) : null}
        </Pressable>

        {invoiceError ? (
          <Text style={styles.successError}>
            {invoiceError}
          </Text>
        ) : null}

        <Pressable
          onPress={() =>
            router.replace("/(protected)/(tabs)")
          }
          style={({ pressed }) => [
            styles.successPrimaryButton,
            pressed ? styles.pressed : null,
          ]}
        >
          <View>
            <Text style={styles.successPrimaryTitle}>
              Volver al inicio
            </Text>

            <Text style={styles.successPrimarySubtitle}>
              Continúa explorando FERREPHARMA
            </Text>
          </View>

          <View style={styles.successPrimaryArrow}>
            <Ionicons
              color="#3E668F"
              name="arrow-forward"
              size={19}
            />
          </View>
        </Pressable>

        <View style={styles.successSecureRow}>
          <Ionicons
            color="#247A52"
            name="shield-checkmark-outline"
            size={14}
          />

          <Text style={styles.successSecureText}>
            Tu pedido quedó registrado correctamente
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

export function CheckoutDeliveryScreen() {
  if (isApiMode()) {
    return <ApiCheckoutDeliveryScreen />;
  }

  return <MockCheckoutDeliveryScreen />;
}

export function CheckoutPaymentScreen() {
  if (isApiMode()) {
    return <ApiCheckoutPaymentScreen />;
  }

  return <MockCheckoutPaymentScreen />;
}

export function CheckoutReviewScreen() {
  if (isApiMode()) {
    return <ApiCheckoutReviewScreen />;
  }

  return <MockCheckoutReviewScreen />;
}

export function CheckoutSuccessScreen() {
  if (isApiMode()) {
    return <ApiCheckoutSuccessScreen />;
  }

  return <MockCheckoutSuccessScreen />;
}

function Field({
  autoCapitalize,
  keyboardType = "default",
  label,
  onChangeText,
  value,
}: {
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  keyboardType?: "default" | "phone-pad";
  label: string;
  onChangeText(value: string): void;
  value: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput autoCapitalize={autoCapitalize} keyboardType={keyboardType} onChangeText={onChangeText} placeholder={label} placeholderTextColor={colors.textMuted} style={styles.input} value={value} />
    </View>
  );
}

function formatExpiration(month?: number, year?: number): string {
  if (!month || !year) {
    return "demo";
  }

  return `${month.toString().padStart(2, "0")}/${year}`;
}

const styles = StyleSheet.create({
  successContent: {
    backgroundColor: "#FFF2D0",
    flexGrow: 1,
    paddingBottom: 34,
  },

  successHero: {
    backgroundColor: "#3E668F",
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    marginBottom: 18,
    minHeight: 228,
    overflow: "hidden",
    paddingBottom: 24,
    paddingHorizontal: 20,
    paddingTop: 44,
  },

  successHeroTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },

  successHeroTitle: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "900",
    marginTop: 2,
  },

  successHeroIcon: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 25,
    height: 50,
    justifyContent: "center",
    width: 50,
  },

  successHeroDescription: {
    color: "#EAF1F8",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 16,
    maxWidth: "82%",
  },

  successOrderBadge: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#FFDB83",
    borderRadius: 18,
    flexDirection: "row",
    gap: 6,
    marginTop: 14,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },

  successOrderBadgeText: {
    color: "#3E668F",
    fontSize: 11,
    fontWeight: "900",
  },

  successCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#AAB4E7",
    borderRadius: 21,
    borderWidth: 1,
    marginHorizontal: 16,
    padding: 18,
    shadowColor: "#172033",
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },

  successCardHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
  },

  successEyebrow: {
    color: "#81A9EE",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.4,
  },

  successCardTitle: {
    color: "#172033",
    fontSize: 19,
    fontWeight: "900",
    marginTop: 2,
  },

  successMiniIcon: {
    alignItems: "center",
    backgroundColor: "#EEF3FB",
    borderRadius: 12,
    height: 42,
    justifyContent: "center",
    width: 42,
  },

  successInfoRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },

  successInfoIcon: {
    alignItems: "center",
    backgroundColor: "#F4F7FA",
    borderRadius: 11,
    height: 40,
    justifyContent: "center",
    width: 40,
  },

  successInfoContent: {
    flex: 1,
  },

  successInfoLabel: {
    color: "#687286",
    fontSize: 10,
    fontWeight: "700",
  },

  successInfoValue: {
    color: "#172033",
    fontSize: 14,
    fontWeight: "900",
    marginTop: 3,
  },

  successDivider: {
    backgroundColor: "#E5EAF0",
    height: 1,
    marginVertical: 14,
  },

  successStatusBadge: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#EAF7F0",
    borderRadius: 10,
    flexDirection: "row",
    gap: 6,
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },

  successStatusDot: {
    backgroundColor: "#247A52",
    borderRadius: 4,
    height: 7,
    width: 7,
  },

  successStatusText: {
    color: "#247A52",
    fontSize: 10,
    fontWeight: "900",
  },

  successTotalRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },

  successTotalHint: {
    color: "#687286",
    fontSize: 9,
    marginTop: 3,
  },

  successTotal: {
    color: "#3E668F",
    fontSize: 23,
    fontWeight: "900",
  },

  successActions: {
    gap: 11,
    marginHorizontal: 16,
    marginTop: 16,
  },

  successSecondaryButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#AAB4E7",
    borderRadius: 15,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 58,
    paddingHorizontal: 14,
  },

  successActionIcon: {
    alignItems: "center",
    backgroundColor: "#EEF3FB",
    borderRadius: 10,
    height: 38,
    justifyContent: "center",
    marginRight: 11,
    width: 38,
  },

  successSecondaryText: {
    color: "#172033",
    flex: 1,
    fontSize: 13,
    fontWeight: "900",
  },

  successError: {
    color: "#C84646",
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
  },

  successPrimaryButton: {
    alignItems: "center",
    backgroundColor: "#3E668F",
    borderRadius: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 5,
    minHeight: 66,
    paddingHorizontal: 17,
  },

  successPrimaryTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },

  successPrimarySubtitle: {
    color: "#DCE9F4",
    fontSize: 10,
    marginTop: 3,
  },

  successPrimaryArrow: {
    alignItems: "center",
    backgroundColor: "#FFDB83",
    borderRadius: 19,
    height: 38,
    justifyContent: "center",
    width: 38,
  },

  successSecureRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
    justifyContent: "center",
    marginTop: 2,
  },

  successSecureText: {
    color: "#247A52",
    fontSize: 10,
    fontWeight: "700",
  },

  checkoutHero: {
    backgroundColor: "#3E668F",
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    marginBottom: 18,
    minHeight: 212,
    overflow: "hidden",
    paddingBottom: 24,
    paddingHorizontal: 20,
    paddingTop: 44,
  },

  checkoutHeroDecorationOne: {
    backgroundColor: "#81A9EE",
    borderRadius: 100,
    height: 180,
    opacity: 0.18,
    position: "absolute",
    right: -55,
    top: -70,
    width: 180,
  },

  checkoutHeroDecorationTwo: {
    backgroundColor: "#FFDB83",
    borderRadius: 55,
    bottom: -48,
    height: 105,
    opacity: 0.18,
    position: "absolute",
    right: 65,
    width: 105,
  },

  checkoutHeroTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },

  checkoutHeroTitleArea: {
    alignItems: "center",
    flexDirection: "row",
    flex: 1,
    gap: 10,
    paddingRight: 10,
  },

  checkoutBackButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },

  checkoutBrand: {
    color: "#FFDB83",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.7,
  },

  checkoutHeroTitle: {
    color: "#FFFFFF",
    fontSize: 29,
    fontWeight: "900",
    marginTop: 2,
    maxWidth: 220,
  },

  checkoutHeroIcon: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 23,
    height: 46,
    justifyContent: "center",
    width: 46,
  },

  checkoutHeroDescription: {
    color: "#EAF1F8",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 15,
    maxWidth: "80%",
  },

  checkoutStepBadge: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#FFDB83",
    borderRadius: 18,
    flexDirection: "row",
    gap: 6,
    marginTop: 13,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },

  checkoutStepText: {
    color: "#3E668F",
    fontSize: 11,
    fontWeight: "800",
  },

  pressed: {
    opacity: 0.72,
  },
  screenIntro: {
    color: "#687286",
    fontSize: 15,
    lineHeight: 21,
    marginBottom: spacing.sm,
  },
  checkoutSection: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
    marginHorizontal: 18,
  },
  checkoutSummary: {
    backgroundColor: "#FFFFFF",
    borderColor: "#AAB4E7",
    borderRadius: 21,
    borderWidth: 1,
    gap: spacing.sm,
    marginHorizontal: 18,
    padding: 18,
    shadowColor: "#172033",
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  securityRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
    marginHorizontal: 18,
    paddingVertical: spacing.sm,
  },
  securityIcon: {
    alignItems: "center",
    backgroundColor: "#EAF7F0",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  securityIconText: {
    color: "#247A52",
    fontWeight: "900",
  },
  securityContent: {
    flex: 1,
    gap: 3,
  },
  checkoutHeader: {
    gap: spacing.xs,
  },
  checkoutFooter: {
    color: colors.textMuted,
    fontSize: typography.caption,
    marginHorizontal: 18,
    paddingBottom: spacing.md,
    textAlign: "center",
  },
  deliveryOptions: {
    gap: spacing.sm,
  },
  deliveryOption: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
  },
  deliveryOptionActive: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  optionIcon: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: 10,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  optionIconText: {
    color: colors.primary,
    fontSize: typography.subtitle,
    fontWeight: "700",
  },
  optionContent: {
    flex: 1,
    gap: spacing.xs,
  },
  optionTitle: {
    color: colors.text,
    fontWeight: "700",
  },
  radio: {
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 2,
    height: 20,
    width: 20,
  },
  radioActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    borderWidth: 5,
  },
  addressOption: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
  },
  addressOptionActive: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  emptyBox: {
    backgroundColor: colors.background,
    borderRadius: 10,
    gap: spacing.sm,
    padding: spacing.md,
  },
  paymentType: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  paymentIcon: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: 10,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  paymentIconText: {
    color: colors.primary,
    fontSize: typography.subtitle,
    fontWeight: "700",
  },
  paymentCard: {
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  paymentCardActive: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  paymentCardTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cardBrand: {
    color: colors.text,
    fontSize: typography.subtitle,
    fontWeight: "700",
  },
  cardNumber: {
    color: colors.text,
    fontWeight: "600",
    letterSpacing: 1,
  },
  addPaymentButton: {
    alignItems: "center",
    borderColor: colors.primary,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
  },
  addPaymentText: {
    color: colors.primary,
    fontWeight: "700",
  },
  securityBox: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  securityTitle: {
    color: colors.text,
    fontWeight: "700",
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  sectionTitle: {
    color: "#3E668F",
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 2,
  },
  reviewHeader: {
    gap: spacing.xs,
  },
  reviewProduct: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
  },
  reviewProductInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  reviewProductName: {
    color: colors.text,
    fontWeight: "700",
  },
  reviewPrice: {
    color: colors.text,
    fontWeight: "700",
  },
  reviewDetail: {
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  reviewDetailLabel: {
    color: colors.textMuted,
  },
  reviewDetailValue: {
    color: colors.text,
    flex: 1,
    fontWeight: "600",
    textAlign: "right",
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  summaryRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  summaryValue: {
    color: colors.text,
    fontWeight: "600",
  },
  summaryDivider: {
    backgroundColor: colors.border,
    height: 1,
    marginVertical: spacing.xs,
  },
  totalLabel: {
    color: colors.text,
    fontSize: typography.subtitle,
    fontWeight: "700",
  },
  reviewFooter: {
    color: colors.textMuted,
    fontSize: typography.caption,
    marginHorizontal: 18,
    paddingBottom: spacing.md,
    textAlign: "center",
  },

  choice: { borderColor: colors.border, borderRadius: 8, borderWidth: 1, padding: spacing.md },
  choiceActive: { backgroundColor: colors.accent },
  choiceText: { color: colors.text },
  content: {
    backgroundColor: "#FFF2D0",
    flexGrow: 1,
    gap: spacing.md,
    paddingBottom: 32,
  },
  disabled: { opacity: 0.7 },
  error: {
    color: colors.danger,
    marginHorizontal: 18,
  },
  field: { gap: spacing.xs },
  group: { gap: spacing.sm },
  input: {
    backgroundColor: "#FAFBFD",
    borderColor: "#DDE3EE",
    borderRadius: 12,
    borderWidth: 1,
    color: "#172033",
    minHeight: 48,
    paddingHorizontal: 14,
  },
  label: {
    color: "#3E668F",
    fontSize: typography.caption,
    fontWeight: "800",
  },
  link: { color: colors.primary },
  loading: { flex: 1 },
  muted: { color: colors.textMuted },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#3E668F",
    borderRadius: 15,
    justifyContent: "center",
    marginHorizontal: 18,
    minHeight: 56,
  },
  primaryText: { color: colors.surface, fontWeight: "700" },
  row: { flexDirection: "row", gap: spacing.sm },
  secondaryButton: { alignItems: "center", borderColor: colors.border, borderRadius: 8, borderWidth: 1, minHeight: 44, justifyContent: "center" },
  title: { color: colors.text, fontSize: typography.title, fontWeight: "700" },
  total: { fontSize: typography.subtitle, fontWeight: "700" },
});
