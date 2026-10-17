import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { GUATEMALA_BANKS } from "@/config";
import {
  detectStorefrontCardBrand,
  formatCardNumber,
  formatCardExpiration,
  getSecurityCodeLength,
} from "@/modules/checkout/application/cardPaymentValidation";
import { getErrorMessage } from "@/infrastructure";
import { useSession } from "@/modules/auth";
import { KeyboardAwareContainer, OptionPicker } from "@/shared";

import {
  buildSafePaymentMethodInput,
  type CardFormState,
  validateCardForm,
} from "../application/cardValidation";
import { usePaymentMethods } from "../hooks/usePaymentMethods";

const palette = {
  deepBlue: "#3E668F",
  dreamyBlue: "#81A9EE",
  silkyLilac: "#AAB4E7",
  butterHoney: "#FFDB83",
  vanillaMilk: "#FFF2D0",
  white: "#FFFFFF",
  text: "#172033",
  muted: "#687286",
  border: "#DDE3EE",
  danger: "#B94343",
  success: "#247A52",
};

const initialCardForm: CardFormState = {
  cardNumber: "",
  expiration: "",
  cvv: "",
  issuingBank: "",
  cardholderName: "",
};

export function PaymentMethodsScreen() {
  const { archive, isLoading, methods, reload, setDefault } =
    usePaymentMethods();
  const [error, setError] = useState<string | null>(null);

  async function runAction(action: () => Promise<unknown>) {
    setError(null);

    try {
      await action();
    } catch (actionError) {
      setError(getErrorMessage(actionError));
    }
  }

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  if (isLoading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color={palette.deepBlue} />
        <Text style={styles.loadingText}>Cargando métodos de pago...</Text>
      </View>
    );
  }

  return (
    <FlatList
      contentContainerStyle={styles.listContainer}
      data={methods}
      keyExtractor={(item) => item.id}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <>
          <PaymentHero
            description="Administra las tarjetas que puedes utilizar en tus compras."
            title="Métodos de pago"
          />

          <View style={styles.sectionHeading}>
            <View style={styles.sectionHeadingText}>
              <Text style={styles.eyebrow}>TARJETAS GUARDADAS</Text>
              <Text style={styles.sectionTitle}>Tus métodos de pago</Text>
            </View>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons
                name="alert-circle-outline"
                size={19}
                color={palette.danger}
              />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
        </>
      }
      ListEmptyComponent={
        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <Ionicons
              name="card-outline"
              size={34}
              color={palette.deepBlue}
            />
          </View>

          <Text style={styles.emptyTitle}>Aún no tienes tarjetas</Text>

          <Text style={styles.emptyDescription}>
            Agrega una tarjeta para tenerla disponible al realizar tus compras.
          </Text>

          <Pressable
            onPress={() =>
              router.push("/(protected)/account/new-payment-method")
            }
            style={styles.emptyButton}
          >
            <Ionicons name="add" size={19} color={palette.white} />
            <Text style={styles.emptyButtonText}>Agregar nueva tarjeta</Text>
          </Pressable>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.savedCard}>
          <View style={styles.savedCardTop}>
            <View style={styles.savedCardIcon}>
              <Ionicons name="card" size={24} color={palette.deepBlue} />
            </View>

            <View style={styles.savedCardInfo}>
              <View style={styles.savedCardTitleRow}>
                <Text style={styles.savedCardTitle}>
                  {item.brand ?? "Tarjeta"} •••• {item.last4 ?? "----"}
                </Text>

                {item.isDefault ? (
                  <View style={styles.defaultBadge}>
                    <Text style={styles.defaultBadgeText}>Predeterminada</Text>
                  </View>
                ) : null}
              </View>

              {item.issuingBank ? (
                <Text style={styles.savedCardBank}>{item.issuingBank}</Text>
              ) : null}
            </View>
          </View>

          <View style={styles.cardDetails}>
            <View style={styles.cardDetail}>
              <Text style={styles.cardDetailLabel}>TITULAR</Text>
              <Text style={styles.cardDetailValue}>
                {item.cardholderName ?? "Sin especificar"}
              </Text>
            </View>

            <View style={styles.cardDetail}>
              <Text style={styles.cardDetailLabel}>VENCE</Text>
              <Text style={styles.cardDetailValue}>
                {formatExpiration(
                  item.expirationMonth,
                  item.expirationYear,
                )}
              </Text>
            </View>
          </View>

          <View style={styles.cardActions}>
            {!item.isDefault ? (
              <Pressable
                onPress={() => void runAction(() => setDefault(item.id))}
                style={styles.secondaryAction}
              >
                <Ionicons
                  name="checkmark-circle-outline"
                  size={17}
                  color={palette.deepBlue}
                />
                <Text style={styles.secondaryActionText}>
                  Predeterminada
                </Text>
              </Pressable>
            ) : null}

            <Pressable
              onPress={() => void runAction(() => archive(item.id))}
              style={styles.deleteAction}
            >
              <Ionicons
                name="trash-outline"
                size={17}
                color={palette.danger}
              />
              <Text style={styles.deleteActionText}>Eliminar</Text>
            </Pressable>
          </View>
        </View>
      )}
      ListFooterComponent={
        methods.length > 0 ? (
          <Pressable
            onPress={() =>
              router.push("/(protected)/account/new-payment-method")
            }
            style={styles.footerAddButton}
          >
            <Ionicons name="add" size={19} color={palette.white} />
            <Text style={styles.footerAddButtonText}>
              Agregar otra tarjeta
            </Text>
          </Pressable>
        ) : null
      }
    />
  );
}

export function NewPaymentMethodScreen() {
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const { session } = useSession();
  const { create, methods } = usePaymentMethods();
  const [form, setForm] = useState<CardFormState>(initialCardForm);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function save() {
    if (!session) {
      return;
    }

    const validationError = validateCardForm(form);

    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await create(
        buildSafePaymentMethodInput(
          form,
          session,
          methods.length === 0,
        ),
      );

      setForm(initialCardForm);

      router.replace(
        returnTo === "checkout"
          ? "/(protected)/checkout/payment"
          : "/(protected)/account/payment-methods",
      );
    } catch (saveError) {
      setError(
        getErrorMessage(saveError, "No se pudo guardar la tarjeta."),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <KeyboardAwareContainer
      contentContainerStyle={styles.formContainer}
      extraBottomSpace={80}
    >
      <PaymentHero
        description="Agrega los datos de la tarjeta que deseas utilizar en tus compras."
        title="Agregar tarjeta"
      />

      {error ? (
        <View style={styles.errorBox}>
          <Ionicons
            name="alert-circle-outline"
            size={19}
            color={palette.danger}
          />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.formCard}>
        <Text style={styles.eyebrow}>DATOS DE LA TARJETA</Text>
        <Text style={styles.formSectionTitle}>Información de pago</Text>
        <Text style={styles.formSectionDescription}>
          Completa los datos solicitados para guardar tu tarjeta.
        </Text>

        <Field
          keyboardType="number-pad"
          label="Número de tarjeta"
          maxLength={23}
          onChangeText={(value) =>
            setForm((current) => ({
              ...current,
              cardNumber: formatCardNumber(value),
            }))
          }
          value={form.cardNumber}
        />

        <Text style={styles.fieldHint}>
          Marca detectada: {
            detectStorefrontCardBrand(
              form.cardNumber.replace(/\\D/g, "")
            ) ?? "Sin identificar"
          }
        </Text>

        <View style={styles.pickerSection}>
          <Text style={styles.fieldLabel}>Banco emisor</Text>
          <Text style={styles.fieldHint}>
            Selecciona el banco que emitió la tarjeta.
          </Text>

          <OptionPicker
            label=""
            onChange={(issuingBank) =>
              setForm((current) => ({ ...current, issuingBank }))
            }
            options={GUATEMALA_BANKS}
            value={form.issuingBank}
          />
        </View>

        <Field
          label="Titular de la tarjeta"
          maxLength={60}
          onChangeText={(cardholderName) =>
            setForm((current) => ({ ...current, cardholderName }))
          }
          value={form.cardholderName}
        />

        <View style={styles.expirationRow}>
          <Field
            keyboardType="number-pad"
            label="Vencimiento (MM/AA)"
            maxLength={5}
            onChangeText={(value) =>
              setForm((current) => ({
                ...current,
                expiration: formatCardExpiration(value),
              }))
            }
            value={form.expiration}
          />

          <Field
            keyboardType="number-pad"
            label="CVV"
            secureTextEntry
            maxLength={
              getSecurityCodeLength(
                detectStorefrontCardBrand(
                  form.cardNumber.replace(/\\D/g, "")
                )
              )
            }
            onChangeText={(value) =>
              setForm((current) => ({
                ...current,
                cvv: value.replace(/\\D/g, "").slice(0, 4),
              }))
            }
            value={form.cvv}
          />
        </View>

      </View>

      <View style={styles.securityNote}>
        <Ionicons
          name="shield-checkmark-outline"
          size={21}
          color={palette.success}
        />
        <Text style={styles.securityNoteText}>
          La aplicación no almacena el número completo de tu tarjeta ni el CVV.
        </Text>
      </View>

      <Pressable
        disabled={isSubmitting}
        onPress={save}
        style={[
          styles.saveButton,
          isSubmitting ? styles.disabled : null,
        ]}
      >
        <Ionicons
          name="card-outline"
          size={20}
          color={palette.white}
        />
        <Text style={styles.saveButtonText}>
          {isSubmitting ? "Guardando..." : "Guardar tarjeta"}
        </Text>
      </Pressable>
    </KeyboardAwareContainer>
  );
}

function PaymentHero({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <View style={styles.hero}>
      <View style={styles.heroCircleLarge} />
      <View style={styles.heroCircleSmall} />

      <View style={styles.heroTopRow}>
        <Pressable accessibilityLabel="Regresar" onPress={() => router.back()} style={styles.backButton}>
          <Ionicons color={palette.deepBlue} name="arrow-back" size={20} />
        </Pressable>
<View style={styles.heroText}>
          <Text style={styles.heroBrand}>FERREPHARMA</Text>
          <Text style={styles.heroTitle}>{title}</Text>
        </View>

        <View style={styles.heroIcon}>
          <Ionicons
            name="card-outline"
            size={23}
            color={palette.deepBlue}
          />
        </View>
      </View>

      <Text style={styles.heroDescription}>{description}</Text>
    </View>
  );
}

function Field({
  keyboardType = "default",
  label,
  maxLength,
  onChangeText,
  secureTextEntry = false,
  value,
}: {
  keyboardType?: "default" | "number-pad";
  label: string;
  maxLength?: number;
  onChangeText(value: string): void;
  secureTextEntry?: boolean;
  value: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>

      <TextInput
        keyboardType={keyboardType}
        maxLength={maxLength}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        placeholder={label}
        placeholderTextColor={palette.muted}
        style={styles.input}
        value={value}
      />
    </View>
  );
}

function formatExpiration(month?: number, year?: number): string {
  if (!month || !year) {
    return "--/--";
  }

  return `${month.toString().padStart(2, "0")}/${year}`;
}

const styles = StyleSheet.create({
  listContainer: {
    backgroundColor: palette.vanillaMilk,
    flexGrow: 1,
    gap: 14,
    paddingBottom: 48,
    paddingHorizontal: 18,
  },

  formContainer: {
    backgroundColor: palette.vanillaMilk,
    flexGrow: 1,
    gap: 16,
    paddingBottom: 48,
    paddingHorizontal: 18,
  },

  hero: {
    backgroundColor: palette.deepBlue,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    marginHorizontal: -18,
    minHeight: 190,
    overflow: "hidden",
    paddingBottom: 27,
    paddingHorizontal: 20,
    paddingTop: 48,
  },

  heroCircleLarge: {
    backgroundColor: palette.dreamyBlue,
    borderRadius: 100,
    height: 180,
    opacity: 0.18,
    position: "absolute",
    right: -55,
    top: -65,
    width: 180,
  },

  heroCircleSmall: {
    backgroundColor: palette.butterHoney,
    borderRadius: 55,
    bottom: -50,
    height: 110,
    opacity: 0.2,
    position: "absolute",
    right: 45,
    width: 110,
  },

  heroTopRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },

  backButton: {
    alignItems: "center",
    backgroundColor: palette.white,
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },

  heroText: {
    flex: 1,
},

  heroBrand: {
    color: palette.butterHoney,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.7,
  },

  heroTitle: {
    color: palette.white,
    fontSize: 26,
    fontWeight: "900",
    marginTop: 2,
  },

  heroIcon: {
    alignItems: "center",
    backgroundColor: palette.butterHoney,
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },

  heroDescription: {
    color: "#EDF4FC",
    fontSize: 13,
    lineHeight: 19,
    marginRight: 12,
    marginTop: 15,
  },

  sectionHeading: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 5,
    paddingHorizontal: 2,
  },

  sectionHeadingText: {
    flex: 1,
  },

  eyebrow: {
    color: palette.deepBlue,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
  },

  sectionTitle: {
    color: palette.text,
    fontSize: 20,
    fontWeight: "900",
    marginTop: 2,
  },

  emptyCard: {
    alignItems: "center",
    backgroundColor: palette.white,
    borderColor: palette.silkyLilac,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
  },

  emptyIcon: {
    alignItems: "center",
    backgroundColor: "#FFF5DA",
    borderRadius: 32,
    height: 64,
    justifyContent: "center",
    marginBottom: 15,
    width: 64,
  },

  emptyTitle: {
    color: palette.text,
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
  },

  emptyDescription: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 7,
    maxWidth: 280,
    textAlign: "center",
  },

  emptyButton: {
    alignItems: "center",
    backgroundColor: palette.deepBlue,
    borderRadius: 13,
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
    marginTop: 20,
    minHeight: 48,
    paddingHorizontal: 18,
  },

  emptyButtonText: {
    color: palette.white,
    fontSize: 13,
    fontWeight: "900",
  },

  savedCard: {
    backgroundColor: palette.white,
    borderColor: palette.silkyLilac,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },

  savedCardTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: 11,
  },

  savedCardIcon: {
    alignItems: "center",
    backgroundColor: "#FFF5DA",
    borderRadius: 13,
    height: 46,
    justifyContent: "center",
    width: 46,
  },

  savedCardInfo: {
    flex: 1,
  },

  savedCardTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },

  savedCardTitle: {
    color: palette.text,
    fontSize: 15,
    fontWeight: "900",
  },

  savedCardBank: {
    color: palette.muted,
    fontSize: 12,
    marginTop: 3,
  },

  defaultBadge: {
    backgroundColor: "#EAF7F0",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },

  defaultBadgeText: {
    color: palette.success,
    fontSize: 9,
    fontWeight: "900",
  },

  cardDetails: {
    borderBottomColor: palette.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 20,
    marginTop: 16,
    paddingBottom: 14,
  },

  cardDetail: {
    flex: 1,
    gap: 3,
  },

  cardDetailLabel: {
    color: palette.muted,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  cardDetailValue: {
    color: palette.text,
    fontSize: 12,
    fontWeight: "700",
  },

  cardActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 13,
  },

  secondaryAction: {
    alignItems: "center",
    backgroundColor: "#EEF3FB",
    borderRadius: 10,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },

  secondaryActionText: {
    color: palette.deepBlue,
    fontSize: 11,
    fontWeight: "800",
  },

  deleteAction: {
    alignItems: "center",
    backgroundColor: "#FFF0F0",
    borderRadius: 10,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },

  deleteActionText: {
    color: palette.danger,
    fontSize: 11,
    fontWeight: "800",
  },

  footerAddButton: {
    alignItems: "center",
    alignSelf: "stretch",
    backgroundColor: palette.deepBlue,
    borderRadius: 14,
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
    marginTop: 2,
    minHeight: 52,
  },

  footerAddButtonText: {
    color: palette.white,
    fontSize: 13,
    fontWeight: "900",
  },

  demoCard: {
    alignItems: "center",
    backgroundColor: palette.white,
    borderColor: palette.silkyLilac,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 11,
    padding: 14,
  },

  demoIcon: {
    alignItems: "center",
    backgroundColor: "#FFF5DA",
    borderRadius: 12,
    height: 42,
    justifyContent: "center",
    width: 42,
  },

  demoContent: {
    flex: 1,
  },

  demoTitle: {
    color: palette.text,
    fontSize: 13,
    fontWeight: "900",
  },

  demoDescription: {
    color: palette.muted,
    fontSize: 10,
    lineHeight: 14,
    marginTop: 2,
  },

  demoButton: {
    backgroundColor: "#EEF3FB",
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },

  demoButtonText: {
    color: palette.deepBlue,
    fontSize: 10,
    fontWeight: "900",
  },

  formCard: {
    backgroundColor: palette.white,
    borderColor: palette.border,
    borderRadius: 18,
    borderWidth: 1,
    gap: 17,
    padding: 16,
  },

  formSectionTitle: {
    color: palette.text,
    fontSize: 18,
    fontWeight: "900",
    marginTop: -10,
  },

  formSectionDescription: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: -10,
  },

  field: {
    flex: 1,
    gap: 6,
  },

  fieldLabel: {
    color: palette.text,
    fontSize: 14,
    fontWeight: "800",
  },

  fieldHint: {
    color: palette.muted,
    fontSize: 11,
    lineHeight: 16,
  },

  input: {
    backgroundColor: "#FAFBFD",
    borderColor: palette.border,
    borderRadius: 12,
    borderWidth: 1,
    color: palette.text,
    fontSize: 14,
    minHeight: 50,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },

  pickerSection: {
    gap: 6,
  },

  expirationRow: {
    flexDirection: "row",
    gap: 12,
  },

  securityNote: {
    alignItems: "center",
    backgroundColor: "#EDF8F2",
    borderColor: "#CFE8DA",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 13,
  },

  securityNoteText: {
    color: palette.success,
    flex: 1,
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 16,
  },

  saveButton: {
    alignItems: "center",
    backgroundColor: palette.deepBlue,
    borderRadius: 14,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 54,
  },

  saveButtonText: {
    color: palette.white,
    fontSize: 14,
    fontWeight: "900",
  },

  errorBox: {
    alignItems: "center",
    backgroundColor: "#FFF0F0",
    borderColor: "#E9BDBD",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    padding: 12,
  },

  errorText: {
    color: palette.danger,
    flex: 1,
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 16,
  },

  loadingScreen: {
    alignItems: "center",
    backgroundColor: palette.vanillaMilk,
    flex: 1,
    gap: 10,
    justifyContent: "center",
  },

  loadingText: {
    color: palette.muted,
    fontSize: 12,
  },

  disabled: {
    opacity: 0.6,
  },
});
