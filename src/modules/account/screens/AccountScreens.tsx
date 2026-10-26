import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useSession } from "@/modules/auth";
import {
  GUATEMALA_DEPARTMENTS,
  getGuatemalaMunicipalities,
  matchLocationName,
} from "@/config";
import { getErrorMessage, isApiMode, useRepositories } from "@/infrastructure";
import { KeyboardAwareContainer, OptionPicker } from "@/shared";
import { colors, radius, spacing, typography } from "@/theme";

import {
  DELIVERY_ADDRESS_LIMITS,
  sanitizeAddressLabel,
  sanitizeAddressText,
  sanitizeRecipientName,
  validateDeliveryAddress,
} from "../application/deliveryAddressValidation";

export function AccountScreen() {
  const { customer, logout } = useSession();

  async function handleLogout() {
    await logout();
    router.replace("/(auth)/login");
  }

  const initials = getInitials(customer?.name ?? "Cliente");

  return (
    <KeyboardAwareContainer
      contentContainerStyle={accountStyles.container}
      extraBottomSpace={40}
    >
      <View style={accountStyles.hero}>
        <View style={accountStyles.heroCircleLarge} />
        <View style={accountStyles.heroCircleSmall} />

        <View style={accountStyles.brandRow}>
          <View>
            <Text style={accountStyles.brandLabel}>FERREPHARMA</Text>
            <Text style={accountStyles.heroTitle}>Mi cuenta</Text>
          </View>

          <View style={accountStyles.headerIcon}>
            <Ionicons name="settings-outline" size={22} color="#3E668F" />
          </View>
        </View>

        <View style={accountStyles.profileRow}>
          <View style={accountStyles.avatar}>
            <Text style={accountStyles.avatarText}>{initials}</Text>
          </View>

          <View style={accountStyles.profileInfo}>
            <Text style={accountStyles.profileName}>
              {customer?.name ?? "Cliente"}
            </Text>

            <Text numberOfLines={1} style={accountStyles.profileEmail}>
              {customer?.email ?? "Sin correo"}
            </Text>

            <View style={accountStyles.memberBadge}>
              <Ionicons name="checkmark-circle" size={13} color="#3E668F" />
              <Text style={accountStyles.memberBadgeText}>
                Cliente FerrePharma
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={accountStyles.profileCard}>
        <View style={accountStyles.cardHeaderRow}>
          <View>
            <Text style={accountStyles.miniLabel}>PERFIL</Text>
            <Text style={accountStyles.cardTitle}>Datos personales</Text>
          </View>

          <View style={accountStyles.cardHeaderIcon}>
            <Ionicons name="person-outline" size={20} color="#3E668F" />
          </View>
        </View>

        <Text style={accountStyles.cardDescription}>
          Mantén tus datos actualizados para facilitar tus compras y entregas.
        </Text>

        <ProfileEditor />
      </View>

      <AccountSection title="Compras">
        <AccountMenuItem
          icon="bag-handle-outline"
          iconBackground="#E9F1FF"
          label="Mis pedidos"
          description="Consulta compras y seguimiento"
          route="/(protected)/(tabs)/orders"
          isLast
        />
      </AccountSection>

      <AccountSection title="Cuenta y seguridad">
          <AccountMenuItem
            icon="shield-checkmark-outline"
            iconBackground="#EEF1FF"
            label="Seguridad"
            description="Contraseña y protección"
            route="/(protected)/account/security"
          />

          <AccountMenuItem
            icon="location-outline"
            iconBackground="#FFF5DA"
            label="Mis direcciones"
            description="Administra lugares de entrega"
            route="/(protected)/addresses"
          />

          <AccountMenuItem
            icon="card-outline"
            iconBackground="#EAF7F3"
            label="Métodos de pago"
            description="Administra tus tarjetas"
            route="/(protected)/account/payment-methods"
            isLast
          />
        </AccountSection>

      <AccountSection title="Preferencias y ayuda">
        <AccountMenuItem
          icon="notifications-outline"
          iconBackground="#FFF5DA"
          label="Notificaciones"
          description="Avisos y novedades"
          route="/(protected)/notifications"
        />

        <AccountMenuItem
          icon="storefront-outline"
          iconBackground="#EAF1FF"
          label="Sucursales"
          description="Encuentra una tienda cercana"
          route="/(protected)/branches"
        />

        <AccountMenuItem
          icon="help-circle-outline"
          iconBackground="#F1EDFF"
          label="Soporte"
          description="Ayuda y atención al cliente"
          route="/(protected)/support"
          isLast
        />
      </AccountSection>

      <Pressable
        onPress={handleLogout}
        style={({ pressed }) => [
          accountStyles.logoutButton,
          pressed ? accountStyles.pressed : null,
        ]}
      >
        <Ionicons name="log-out-outline" size={20} color="#B94343" />

        <Text style={accountStyles.logoutButtonText}>Cerrar sesión</Text>
      </Pressable>

      <Text style={accountStyles.footer}>
        FerrePharma · Ferretería & Farmacia
      </Text>
    </KeyboardAwareContainer>
  );
}

type AccountSectionProps = {
  children: React.ReactNode;
  title: string;
};

function AccountSection({ children, title }: AccountSectionProps) {
  return (
    <View style={accountStyles.section}>
      <Text style={accountStyles.sectionHeading}>{title}</Text>

      <View style={accountStyles.menuCard}>{children}</View>
    </View>
  );
}

type AccountMenuItemProps = {
  description: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  iconBackground: string;
  isLast?: boolean;
  label: string;
  route: string;
};

function AccountMenuItem({
  description,
  icon,
  iconBackground,
  isLast,
  label,
  route,
}: AccountMenuItemProps) {
  return (
    <Pressable
      onPress={() => router.push(route as never)}
      style={({ pressed }) => [
        accountStyles.menuItem,
        !isLast ? accountStyles.menuItemBorder : null,
        pressed ? accountStyles.menuItemPressed : null,
      ]}
    >
      <View
        style={[accountStyles.menuIcon, { backgroundColor: iconBackground }]}
      >
        <Ionicons name={icon} size={22} color="#3E668F" />
      </View>

      <View style={accountStyles.menuText}>
        <Text style={accountStyles.menuLabel}>{label}</Text>

        <Text numberOfLines={1} style={accountStyles.menuDescription}>
          {description}
        </Text>
      </View>

      <View style={accountStyles.chevronCircle}>
        <Ionicons name="chevron-forward" size={17} color="#3E668F" />
      </View>
    </Pressable>
  );
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);

  return parts.map((part) => part[0]?.toUpperCase()).join("") || "C";
}

export function AddressesScreen() {
  const { addressRepository } = useRepositories();
  const { session } = useSession();
  const [addresses, setAddresses] = useState<
    Awaited<ReturnType<typeof addressRepository.getByCustomer>>
  >([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) {
      return;
    }

    try {
      setAddresses(
        await addressRepository.getByCustomer(
          session.tenantId,
          session.customerId,
        ),
      );
      setError(null);
    } catch (loadError) {
      setError(
        getErrorMessage(loadError, "No se pudieron cargar las direcciones."),
      );
    }
  }, [addressRepository, session]);

  async function runAction(action: () => Promise<unknown>) {
    try {
      await action();
      await load();
    } catch (actionError) {
      setError(getErrorMessage(actionError));
    }
  }

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <FlatList
      contentContainerStyle={styles.addressListContainer}
      data={addresses}
      keyExtractor={(item) => item.id}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <>
          <View style={styles.addressListHero}>
            <View style={styles.addressHeroCircleLarge} />
            <View style={styles.addressHeroCircleSmall} />

            <View style={styles.addressHeroTopRow}>
              <Pressable accessibilityLabel="Regresar" onPress={() => router.back()} style={styles.addressBackButton}>
                <Ionicons color={accountPalette.deepBlue} name="arrow-back" size={20} />
              </Pressable>
<View style={styles.addressHeroText}>
                <Text style={styles.addressHeroBrand}>FERREPHARMA</Text>
                <Text style={styles.addressHeroTitle}>Mis direcciones</Text>
              </View>

              <View style={styles.addressHeroIcon}>
                <Ionicons
                  name="location-outline"
                  size={23}
                  color={accountPalette.deepBlue}
                />
              </View>
            </View>

            <Text style={styles.addressHeroDescription}>
              Administra los lugares donde quieres recibir tus pedidos.
            </Text>
          </View>

          <View style={styles.addressListHeading}>
            <View style={styles.addressListHeadingText}>
              <Text style={styles.addressListEyebrow}>
                DIRECCIONES DE ENTREGA
              </Text>
              <Text style={styles.addressListTitle}>
                Tus lugares guardados
              </Text>
            </View>

          </View>



          {error ? (
            <View style={styles.addressErrorBox}>
              <Text style={styles.addressErrorText}>{error}</Text>
            </View>
          ) : null}
        </>
      }
      ListEmptyComponent={
        <View style={styles.addressEmptyCard}>
          <View style={styles.addressEmptyIcon}>
            <Ionicons
              name="location-outline"
              size={34}
              color={accountPalette.deepBlue}
            />
          </View>

          <Text style={styles.addressEmptyTitle}>
            Aún no tienes direcciones
          </Text>

          <Text style={styles.addressEmptyDescription}>
            Agrega una dirección para facilitar tus próximas compras y entregas.
          </Text>

          <Pressable
            onPress={() => router.push("/(protected)/addresses/new")}
            style={styles.addressEmptyButton}
          >
            <Ionicons
              name="add"
              size={19}
              color={accountPalette.white}
            />
            <Text style={styles.addressEmptyButtonText}>
              Agregar nueva dirección
            </Text>
          </Pressable>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.addressSavedCard}>
          <View style={styles.addressSavedHeader}>
            <View style={styles.addressSavedIcon}>
              <Ionicons
                name="location"
                size={21}
                color={accountPalette.deepBlue}
              />
            </View>

            <View style={styles.addressSavedHeaderText}>
              <View style={styles.addressSavedTitleRow}>
                <Text style={styles.addressSavedTitle}>
                  {item.label}
                </Text>

                {item.isDefault ? (
                  <View style={styles.addressDefaultBadge}>
                    <Text style={styles.addressDefaultBadgeText}>
                      Predeterminada
                    </Text>
                  </View>
                ) : null}
              </View>

              {item.recipientName ? (
                <Text style={styles.addressSavedRecipient}>
                  {item.recipientName}
                </Text>
              ) : null}
            </View>
          </View>

          <View style={styles.addressSavedBody}>
            <Text style={styles.addressSavedLine}>
              {[item.addressLine, item.addressLine2]
                .filter(Boolean)
                .join(", ")}
            </Text>

            <Text style={styles.addressSavedLocation}>
              {[item.municipality, item.department]
                .filter(Boolean)
                .join(", ")}
            </Text>

            {item.references ? (
              <Text style={styles.addressSavedReference}>
                Ref: {item.references}
              </Text>
            ) : null}
          </View>

          <View style={styles.addressActions}>
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/(protected)/addresses/[id]",
                  params: { id: item.id },
                })
              }
              style={styles.addressActionButton}
            >
              <Ionicons
                name="create-outline"
                size={17}
                color={accountPalette.deepBlue}
              />
              <Text style={styles.addressActionText}>Editar</Text>
            </Pressable>

            {!item.isDefault ? (
              <Pressable
                onPress={() =>
                  void runAction(() =>
                    addressRepository.setDefault(item.customerId, item.id),
                  )
                }
                style={styles.addressActionButton}
              >
                <Ionicons
                  name="checkmark-circle-outline"
                  size={17}
                  color={accountPalette.deepBlue}
                />
                <Text style={styles.addressActionText}>
                  Predeterminada
                </Text>
              </Pressable>
            ) : null}

            <Pressable
              onPress={() =>
                void runAction(() => addressRepository.archive(item.id))
              }
              style={[
                styles.addressActionButton,
                styles.addressDeleteButton,
              ]}
            >
              <Ionicons
                name="trash-outline"
                size={17}
                color={accountPalette.danger}
              />
              <Text style={styles.addressDeleteText}>
                Eliminar
              </Text>
            </Pressable>
          </View>
        </View>
      )}
      ListFooterComponent={
        addresses.length > 0 ? (
          <Pressable
              accessibilityLabel="Agregar nueva dirección"
              onPress={() => router.push("/(protected)/addresses/new")}
              style={styles.addressEmptyButton}
            >
              <Ionicons
                name="add"
                size={19}
                color={accountPalette.white}
              />
              <Text style={styles.addressEmptyButtonText}>
                Agregar nueva dirección
              </Text>
            </Pressable>
        ) : null
      }
    />
  );
}

export function NewAddressScreen() {
  return <AddressForm mode="create" />;
}

export function AddressDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <AddressForm addressId={id} mode="edit" />;
}

function ProfileEditor() {
  const { customer, refreshSession } = useSession();
  const { customerRepository } = useRepositories();
  const [name, setName] = useState(customer?.name ?? "");
  const [phone, setPhone] = useState(customer?.phone ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function save() {
    if (!customer || isSaving) {
      return;
    }

    if (!name.trim()) {
      setError("El nombre es requerido.");
      return;
    }

    setError(null);
    setMessage(null);
    setIsSaving(true);
    try {
      await customerRepository.updateProfile(customer.id, {
        name: name.trim(),
        phone: phone.trim(),
      });

      await refreshSession();
      setMessage("Perfil actualizado correctamente.");
    } catch (saveError) {
      setError(getErrorMessage(saveError, "No se pudo actualizar el perfil."));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <View style={accountStyles.editor}>
      <View style={accountStyles.field}>
        <Text style={accountStyles.fieldLabel}>Correo electrónico</Text>

        <View style={accountStyles.readonlyInput}>
          <Text style={accountStyles.readonlyText}>
            {customer?.email ?? "Sin correo"}
          </Text>
        </View>
      </View>

      <View style={accountStyles.field}>
        <Text style={accountStyles.fieldLabel}>Nombre</Text>

        <TextInput
          onChangeText={setName}
          placeholder="Tu nombre"
          placeholderTextColor="#7A8798"
          style={accountStyles.input}
          value={name}
        />
      </View>

      <View style={accountStyles.field}>
        <Text style={accountStyles.fieldLabel}>Teléfono</Text>

        <TextInput
          keyboardType="phone-pad"
          maxLength={8}
          onChangeText={(value) => setPhone(value.replace(/\D/g, ""))}
          placeholder="Agregar teléfono (8 dígitos)"
          placeholderTextColor="#7A8798"
          style={accountStyles.input}
          value={phone}
        />
      </View>

      <Pressable
        disabled={isSaving}
        onPress={save}
        style={({ pressed }) => [
          accountStyles.saveButton,
          pressed || isSaving ? accountStyles.pressed : null,
        ]}
      >
        <Text style={accountStyles.saveButtonText}>
          {isSaving ? "Guardando..." : "Guardar cambios"}
        </Text>
      </Pressable>

      {error ? (
        <Text style={accountStyles.errorText}>{error}</Text>
      ) : null}

      {message ? (
        <View style={accountStyles.successBox}>
          <Text style={accountStyles.successText}>{message}</Text>
        </View>
      ) : null}
    </View>
  );
}

function AddressForm({
  addressId,
  mode,
}: {
  addressId?: string;
  mode: "create" | "edit";
}) {
  const { addressRepository } = useRepositories();
  const { customer, session } = useSession();
  const [label, setLabel] = useState("");
  const [recipientName, setRecipientName] = useState(customer?.name ?? "");
  const [addressLine, setAddressLine] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [municipality, setMunicipality] = useState("");
  const [department, setDepartment] = useState("");
  const [references, setReferences] = useState("");
  const [phone, setPhone] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [isLoading, setIsLoading] = useState(mode === "edit");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const apiMode = isApiMode();

  useEffect(() => {
    async function load() {
      try {
        if (mode === "edit" && addressId) {
          const address = await addressRepository.getById(addressId);
          if (address) {
            const nextDepartment = matchLocationName(
              address.department,
              GUATEMALA_DEPARTMENTS,
            );

            setLabel(address.label);
            setRecipientName(address.recipientName ?? customer?.name ?? "");
            setAddressLine(address.addressLine);
            setAddressLine2(address.addressLine2 ?? "");
            setDepartment(nextDepartment || (address.department ?? ""));
            setMunicipality(
              matchLocationName(
                address.municipality,
                getGuatemalaMunicipalities(nextDepartment),
              ) || (address.municipality ?? ""),
            );
            setReferences(address.references ?? "");
            setPhone(address.phone ?? "");
            setIsDefault(address.isDefault);
          }
        }
      } catch (loadError) {
        setError(getErrorMessage(loadError, "No se pudo cargar la dirección."));
      } finally {
        setIsLoading(false);
      }
    }
    void load();
  }, [addressId, addressRepository, customer?.name, mode]);

  function selectDepartment(value: string) {
    setDepartment(value);
    if (!getGuatemalaMunicipalities(value).includes(municipality)) {
      setMunicipality("");
    }
  }

  async function save() {
    if (!session || isSaving) {
      return;
    }
    const validationError = validateDeliveryAddress({
      label,
      recipientName,
      addressLine,
      department,
      municipality,
      references,
    });

    if (validationError) {
      setError(validationError);
      return;
    }

    const input = {
      label: label.trim(),
      recipientName: recipientName.trim() || undefined,
      addressLine: addressLine.trim(),
      addressLine2: addressLine2.trim() || undefined,
      municipality: municipality.trim() || undefined,
      department: department.trim() || undefined,
      references: references.trim() || undefined,
      phone: phone.trim() || undefined,
      isDefault,
    };

    setError(null);
    setIsSaving(true);
    try {
      if (mode === "create") {
        await addressRepository.create({
          ...input,
          tenantId: session.tenantId,
          customerId: session.customerId,
        });
      } else if (addressId) {
        await addressRepository.update(addressId, input);
        if (isDefault) {
          await addressRepository.setDefault(session.customerId, addressId);
        }
      }
      router.replace("/(protected)/addresses");
    } catch (saveError) {
      setError(getErrorMessage(saveError, "No se pudo guardar la dirección."));
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <ActivityIndicator color={colors.primary} style={styles.loading} />;
  }

  return (
    <KeyboardAwareContainer
      contentContainerStyle={styles.addressFormContainer}
      extraBottomSpace={100}
    >
      <View style={styles.addressHero}>
        <View style={styles.addressHeroCircleLarge} />
        <View style={styles.addressHeroCircleSmall} />

        <View style={styles.addressHeroTopRow}>
          <Pressable accessibilityLabel="Regresar" onPress={() => router.back()} style={styles.addressBackButton}>
            <Ionicons color={accountPalette.deepBlue} name="arrow-back" size={20} />
          </Pressable>
<View style={styles.addressHeroText}>
            <Text style={styles.addressHeroBrand}>FERREPHARMA</Text>
            <Text style={styles.addressHeroTitle}>
              {mode === "create" ? "Nueva dirección" : "Editar dirección"}
            </Text>
          </View>

          <View style={styles.addressHeroIcon}>
            <Ionicons
              name="location-outline"
              size={23}
              color={accountPalette.deepBlue}
            />
          </View>
        </View>

        <Text style={styles.addressHeroDescription}>
          Completa los datos del lugar donde quieres recibir tus pedidos.
        </Text>
      </View>

      {error ? (
        <View style={styles.addressErrorBox}>
          <Text style={styles.addressErrorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.addressFormCard}>
        <View style={styles.addressField}>
          <Text style={styles.addressFieldLabel}>
            Nombre de la dirección <Text style={styles.requiredMark}>*</Text>
          </Text>
          <Text style={styles.addressFieldHint}>
            Por ejemplo: Casa, Trabajo o Casa de mamá.
          </Text>
          <TextInput
            style={styles.addressInput}
            value={label}
            onChangeText={(value) => setLabel(sanitizeAddressLabel(value))}
            maxLength={DELIVERY_ADDRESS_LIMITS.label}
            placeholder="Casa"
            placeholderTextColor={accountPalette.muted}
          />
        </View>

        <View style={styles.addressField}>
          <Text style={styles.addressFieldLabel}>
            Destinatario <Text style={styles.requiredMark}>*</Text>
          </Text>
          <TextInput
            style={styles.addressInput}
            value={recipientName}
            onChangeText={(value) => setRecipientName(sanitizeRecipientName(value))}
            maxLength={DELIVERY_ADDRESS_LIMITS.recipientName}
            placeholder="Nombre de quien recibirá el pedido"
            placeholderTextColor={accountPalette.muted}
          />
        </View>

        <View style={styles.addressField}>
          <Text style={styles.addressFieldLabel}>
            Dirección <Text style={styles.requiredMark}>*</Text>
          </Text>
          <TextInput
            style={styles.addressInput}
            value={addressLine}
            onChangeText={(value) => setAddressLine(sanitizeAddressText(value, "line"))}
            maxLength={DELIVERY_ADDRESS_LIMITS.line}
            placeholder="Calle, avenida, zona y número de casa"
            placeholderTextColor={accountPalette.muted}
          />
        </View>

      </View>

      <View style={styles.addressFormCard}>
        <Text style={styles.addressSectionTitle}>Ubicación</Text>
        <Text style={styles.addressSectionDescription}>
          Selecciona el departamento y después el municipio.
        </Text>

        {apiMode ? (
          <>
            <OptionPicker
              label="Departamento *"
              onChange={selectDepartment}
              options={GUATEMALA_DEPARTMENTS}
              value={department}
            />
            <OptionPicker
              emptyText="Selecciona primero un departamento."
              label="Municipio *"
              onChange={setMunicipality}
              options={getGuatemalaMunicipalities(department)}
              value={municipality}
            />
          </>
        ) : (
          <>
            <View style={styles.addressField}>
              <Text style={styles.addressFieldLabel}>Municipio</Text>
              <TextInput
                style={styles.addressInput}
                value={municipality}
                onChangeText={(value) => setMunicipality(sanitizeRecipientName(value))}
                maxLength={DELIVERY_ADDRESS_LIMITS.recipientName}
                placeholder="Municipio"
                placeholderTextColor={accountPalette.muted}
              />
            </View>

            <View style={styles.addressField}>
              <Text style={styles.addressFieldLabel}>Departamento</Text>
              <TextInput
                style={styles.addressInput}
                value={department}
                onChangeText={(value) => setDepartment(sanitizeRecipientName(value))}
                maxLength={DELIVERY_ADDRESS_LIMITS.recipientName}
                placeholder="Departamento"
                placeholderTextColor={accountPalette.muted}
              />
            </View>

            <View style={styles.addressField}>
              <Text style={styles.addressFieldLabel}>Teléfono</Text>
              <TextInput
                style={styles.addressInput}
                value={phone}
                onChangeText={setPhone}
                placeholder="Teléfono"
                placeholderTextColor={accountPalette.muted}
              />
            </View>
          </>
        )}
      </View>

      <View style={styles.addressFormCard}>
        <View style={styles.addressField}>
          <Text style={styles.addressFieldLabel}>Referencias</Text>
          <Text style={styles.addressFieldHint}>
            Opcional. Agrega información que facilite encontrar el lugar.
          </Text>
          <TextInput
            style={[styles.addressInput, styles.addressReferencesInput]}
            value={references}
            onChangeText={(value) => setReferences(sanitizeAddressText(value, "references"))}
            maxLength={DELIVERY_ADDRESS_LIMITS.references}
            placeholder="Ejemplo: portón negro, frente al parque..."
            placeholderTextColor={accountPalette.muted}
            multiline
            textAlignVertical="top"
          />
        </View>

        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: isDefault }}
          onPress={() => setIsDefault((value) => !value)}
          style={[
            styles.addressDefaultOption,
            isDefault ? styles.addressDefaultOptionSelected : null,
          ]}
        >
          <View
            style={[
              styles.addressCheckbox,
              isDefault ? styles.addressCheckboxSelected : null,
            ]}
          >
            {isDefault ? <Text style={styles.addressCheckmark}>✓</Text> : null}
          </View>

          <View style={styles.addressDefaultTextContainer}>
            <Text style={styles.addressDefaultTitle}>
              Usar como dirección predeterminada
            </Text>
            <Text style={styles.addressDefaultDescription}>
              La seleccionaremos automáticamente en futuras compras.
            </Text>
          </View>
        </Pressable>
      </View>

      <Text style={styles.addressRequiredNote}>* Campos obligatorios</Text>

      <Pressable
        disabled={isSaving}
        onPress={save}
        style={[
          styles.addressSaveButton,
          isSaving ? styles.addressSaveButtonDisabled : null,
        ]}
      >
        <Text style={styles.addressSaveButtonText}>
          {isSaving ? "Guardando..." : "Guardar dirección"}
        </Text>
      </Pressable>
    </KeyboardAwareContainer>
  );
}

const accountPalette = {
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

const accountStyles = StyleSheet.create({
  container: {
    backgroundColor: accountPalette.vanillaMilk,
    flexGrow: 1,
    paddingBottom: 38,
  },

  hero: {
    backgroundColor: accountPalette.deepBlue,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    minHeight: 220,
    overflow: "hidden",
    paddingBottom: 28,
    paddingHorizontal: 22,
    paddingTop: 44,
  },

  heroCircleLarge: {
    backgroundColor: accountPalette.dreamyBlue,
    borderRadius: 100,
    height: 180,
    opacity: 0.18,
    position: "absolute",
    right: -55,
    top: -60,
    width: 180,
  },

  heroCircleSmall: {
    backgroundColor: accountPalette.butterHoney,
    borderRadius: 55,
    bottom: -42,
    height: 105,
    opacity: 0.2,
    position: "absolute",
    right: 55,
    width: 105,
  },

  brandRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },

  brandLabel: {
    color: accountPalette.butterHoney,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.7,
  },

  heroTitle: {
    color: accountPalette.white,
    fontSize: 29,
    fontWeight: "900",
    marginTop: 2,
  },

  headerIcon: {
    alignItems: "center",
    backgroundColor: accountPalette.white,
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },

  profileRow: {
    alignItems: "center",
    flexDirection: "row",
    marginTop: 28,
  },

  avatar: {
    alignItems: "center",
    backgroundColor: accountPalette.butterHoney,
    borderColor: accountPalette.white,
    borderRadius: 36,
    borderWidth: 3,
    height: 72,
    justifyContent: "center",
    marginRight: 15,
    width: 72,
  },

  avatarText: {
    color: accountPalette.deepBlue,
    fontSize: 23,
    fontWeight: "900",
  },

  profileInfo: {
    flex: 1,
  },

  profileName: {
    color: accountPalette.white,
    fontSize: 20,
    fontWeight: "900",
  },

  profileEmail: {
    color: "#EDF4FC",
    fontSize: 13,
    marginTop: 3,
  },

  memberBadge: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: accountPalette.butterHoney,
    borderRadius: 20,
    flexDirection: "row",
    gap: 4,
    marginTop: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },

  memberBadgeText: {
    color: accountPalette.deepBlue,
    fontSize: 11,
    fontWeight: "800",
  },

  profileCard: {
    backgroundColor: accountPalette.white,
    borderColor: accountPalette.silkyLilac,
    borderRadius: 22,
    borderWidth: 1,
    marginHorizontal: 16,
    marginTop: 18,
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

  cardHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },

  miniLabel: {
    color: accountPalette.dreamyBlue,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.4,
  },

  cardTitle: {
    color: accountPalette.text,
    fontSize: 19,
    fontWeight: "900",
    marginTop: 2,
  },

  cardHeaderIcon: {
    alignItems: "center",
    backgroundColor: "#EEF3FB",
    borderRadius: 12,
    height: 40,
    justifyContent: "center",
    width: 40,
  },

  cardDescription: {
    color: accountPalette.muted,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 15,
    marginTop: 7,
  },

  editor: {
    gap: 12,
  },

  field: {
    gap: 5,
  },

  fieldLabel: {
    color: accountPalette.deepBlue,
    fontSize: 12,
    fontWeight: "800",
  },

  input: {
    backgroundColor: "#FAFBFD",
    borderColor: accountPalette.border,
    borderRadius: 12,
    borderWidth: 1,
    color: accountPalette.text,
    fontSize: 14,
    minHeight: 47,
    paddingHorizontal: 14,
  },

  readonlyInput: {
    backgroundColor: "#F1F4F8",
    borderColor: accountPalette.border,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 47,
    paddingHorizontal: 14,
  },

  readonlyText: {
    color: accountPalette.muted,
    fontSize: 14,
  },

  saveButton: {
    alignItems: "center",
    backgroundColor: accountPalette.deepBlue,
    borderRadius: 12,
    justifyContent: "center",
    marginTop: 3,
    minHeight: 48,
  },

  saveButtonText: {
    color: accountPalette.white,
    fontSize: 14,
    fontWeight: "900",
  },

  successBox: {
    backgroundColor: "#EAF7F0",
    borderColor: "#B8DDC9",
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
  },

  successText: {
    color: accountPalette.success,
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
  },

  errorText: {
    color: accountPalette.danger,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },

  section: {
    marginHorizontal: 16,
    marginTop: 23,
  },

  sectionHeading: {
    color: accountPalette.deepBlue,
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 9,
    paddingHorizontal: 3,
  },

  menuCard: {
    backgroundColor: accountPalette.white,
    borderColor: accountPalette.silkyLilac,
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#172033",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.04,
    shadowRadius: 7,
    elevation: 2,
  },

  menuItem: {
    alignItems: "center",
    flexDirection: "row",
    minHeight: 70,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },

  menuItemBorder: {
    borderBottomColor: "#E8ECF2",
    borderBottomWidth: 1,
  },

  menuItemPressed: {
    backgroundColor: "#F7F9FC",
  },

  menuIcon: {
    alignItems: "center",
    borderRadius: 13,
    height: 44,
    justifyContent: "center",
    marginRight: 12,
    width: 44,
  },

  menuText: {
    flex: 1,
    justifyContent: "center",
  },

  menuLabel: {
    color: accountPalette.text,
    fontSize: 15,
    fontWeight: "800",
  },

  menuDescription: {
    color: accountPalette.muted,
    fontSize: 12,
    marginTop: 3,
  },

  chevronCircle: {
    alignItems: "center",
    backgroundColor: "#F1F5FB",
    borderRadius: 15,
    height: 30,
    justifyContent: "center",
    marginLeft: 8,
    width: 30,
  },

  logoutButton: {
    alignItems: "center",
    backgroundColor: accountPalette.white,
    borderColor: "#E9BDBD",
    borderRadius: 15,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginHorizontal: 16,
    marginTop: 26,
    minHeight: 51,
  },

  logoutButtonText: {
    color: accountPalette.danger,
    fontSize: 14,
    fontWeight: "900",
  },

  pressed: {
    opacity: 0.7,
  },

  footer: {
    color: accountPalette.deepBlue,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 20,
    opacity: 0.65,
    textAlign: "center",
  },
});

const styles = StyleSheet.create({
  addressListContainer: {
    backgroundColor: accountPalette.vanillaMilk,
    flexGrow: 1,
    gap: 14,
    paddingBottom: 48,
    paddingHorizontal: 18,
  },

  addressListHero: {
    backgroundColor: accountPalette.deepBlue,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    marginHorizontal: -18,
    minHeight: 190,
    overflow: "hidden",
    paddingBottom: 27,
    paddingHorizontal: 20,
    paddingTop: 48,
  },

  addressListHeading: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    marginTop: 5,
    paddingHorizontal: 2,
  },

  addressListHeadingText: {
    flex: 1,
  },

  addressListEyebrow: {
    color: accountPalette.deepBlue,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
  },

  addressListTitle: {
    color: accountPalette.text,
    fontSize: 20,
    fontWeight: "900",
    marginTop: 2,
  },

  addressAddButton: {
    backgroundColor: accountPalette.deepBlue,
    borderRadius: 12,
    color: accountPalette.white,
    fontSize: 12,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 14,
    paddingVertical: 11,
  },

  addressEmptyCard: {
    alignItems: "center",
    backgroundColor: accountPalette.white,
    borderColor: accountPalette.silkyLilac,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 2,
    paddingHorizontal: 24,
    paddingVertical: 32,
  },

  addressEmptyIcon: {
    alignItems: "center",
    backgroundColor: "#FFF5DA",
    borderRadius: 32,
    height: 64,
    justifyContent: "center",
    marginBottom: 15,
    width: 64,
  },

  addressEmptyTitle: {
    color: accountPalette.text,
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
  },

  addressEmptyDescription: {
    color: accountPalette.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 7,
    maxWidth: 280,
    textAlign: "center",
  },

  addressEmptyButton: {
    alignItems: "center",
    backgroundColor: accountPalette.deepBlue,
    borderRadius: 13,
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
    marginTop: 20,
    minHeight: 48,
    paddingHorizontal: 18,
  },

  addressEmptyButtonText: {
    color: accountPalette.white,
    fontSize: 13,
    fontWeight: "900",
  },

  addressSavedCard: {
    backgroundColor: accountPalette.white,
    borderColor: accountPalette.silkyLilac,
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    padding: 16,
  },

  addressSavedHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 11,
  },

  addressSavedIcon: {
    alignItems: "center",
    backgroundColor: "#FFF5DA",
    borderRadius: 13,
    height: 44,
    justifyContent: "center",
    width: 44,
  },

  addressSavedHeaderText: {
    flex: 1,
  },

  addressSavedTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },

  addressSavedTitle: {
    color: accountPalette.text,
    fontSize: 16,
    fontWeight: "900",
  },

  addressSavedRecipient: {
    color: accountPalette.muted,
    fontSize: 12,
    marginTop: 2,
  },

  addressDefaultBadge: {
    backgroundColor: "#EAF7F0",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },

  addressDefaultBadgeText: {
    color: accountPalette.success,
    fontSize: 9,
    fontWeight: "900",
  },

  addressSavedBody: {
    borderBottomColor: accountPalette.border,
    borderBottomWidth: 1,
    gap: 4,
    marginTop: 14,
    paddingBottom: 14,
  },

  addressSavedLine: {
    color: accountPalette.text,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },

  addressSavedLocation: {
    color: accountPalette.muted,
    fontSize: 12,
    lineHeight: 17,
  },

  addressSavedReference: {
    color: accountPalette.muted,
    fontSize: 11,
    fontStyle: "italic",
    lineHeight: 16,
    marginTop: 3,
  },

  addressActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 13,
  },

  addressActionButton: {
    alignItems: "center",
    backgroundColor: "#EEF3FB",
    borderRadius: 10,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },

  addressActionText: {
    color: accountPalette.deepBlue,
    fontSize: 11,
    fontWeight: "800",
  },

  addressDeleteButton: {
    backgroundColor: "#FFF0F0",
  },

  addressDeleteText: {
    color: accountPalette.danger,
    fontSize: 11,
    fontWeight: "800",
  },

  addressFormContainer: {
    backgroundColor: accountPalette.vanillaMilk,
    flexGrow: 1,
    gap: 16,
    paddingBottom: 48,
    paddingHorizontal: 18,
    paddingTop: 22,
  },

  addressHero: {
    backgroundColor: accountPalette.deepBlue,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    marginBottom: 4,
    marginHorizontal: -18,
    marginTop: -22,
    minHeight: 190,
    overflow: "hidden",
    paddingBottom: 27,
    paddingHorizontal: 20,
    paddingTop: 48,
  },

  addressHeroCircleLarge: {
    backgroundColor: accountPalette.dreamyBlue,
    borderRadius: 100,
    height: 180,
    opacity: 0.18,
    position: "absolute",
    right: -55,
    top: -65,
    width: 180,
  },

  addressHeroCircleSmall: {
    backgroundColor: accountPalette.butterHoney,
    borderRadius: 55,
    bottom: -50,
    height: 110,
    opacity: 0.2,
    position: "absolute",
    right: 45,
    width: 110,
  },

  addressHeroTopRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },

  addressHeroText: {
    flex: 1,
},

  addressHeroBrand: {
    color: accountPalette.butterHoney,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.7,
  },

  addressHeroTitle: {
    color: accountPalette.white,
    fontSize: 27,
    fontWeight: "900",
    marginTop: 2,
  },

  addressHeroDescription: {
    color: "#EDF4FC",
    fontSize: 13,
    lineHeight: 19,
    marginRight: 12,
    marginTop: 15,
  },

  addressBackButton: {
    alignItems: "center",
    backgroundColor: accountPalette.white,
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },

  addressHeroIcon: {
    alignItems: "center",
    backgroundColor: accountPalette.butterHoney,
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },

  addressFormEyebrow: {
    color: accountPalette.deepBlue,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.4,
  },

  addressFormTitle: {
    color: accountPalette.text,
    fontSize: 28,
    fontWeight: "900",
  },

  addressFormDescription: {
    color: accountPalette.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 2,
  },

  addressFormCard: {
    backgroundColor: accountPalette.white,
    borderColor: accountPalette.border,
    borderRadius: 18,
    borderWidth: 1,
    gap: 17,
    padding: 16,
  },

  addressField: {
    gap: 6,
  },

  addressFieldLabel: {
    color: accountPalette.text,
    fontSize: 14,
    fontWeight: "800",
  },

  addressFieldHint: {
    color: accountPalette.muted,
    fontSize: 11,
    lineHeight: 16,
  },

  requiredMark: {
    color: accountPalette.danger,
  },

  addressInput: {
    backgroundColor: "#FAFBFD",
    borderColor: accountPalette.border,
    borderRadius: 12,
    borderWidth: 1,
    color: accountPalette.text,
    fontSize: 14,
    minHeight: 50,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },

  addressReferencesInput: {
    minHeight: 88,
  },

  addressSectionTitle: {
    color: accountPalette.deepBlue,
    fontSize: 17,
    fontWeight: "900",
  },

  addressSectionDescription: {
    color: accountPalette.muted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: -10,
  },

  addressDefaultOption: {
    alignItems: "center",
    backgroundColor: "#FAFBFD",
    borderColor: accountPalette.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 14,
  },

  addressDefaultOptionSelected: {
    backgroundColor: "#EEF4FC",
    borderColor: accountPalette.deepBlue,
  },

  addressCheckbox: {
    alignItems: "center",
    borderColor: accountPalette.muted,
    borderRadius: 6,
    borderWidth: 2,
    height: 24,
    justifyContent: "center",
    width: 24,
  },

  addressCheckboxSelected: {
    backgroundColor: accountPalette.deepBlue,
    borderColor: accountPalette.deepBlue,
  },

  addressCheckmark: {
    color: accountPalette.white,
    fontSize: 15,
    fontWeight: "900",
  },

  addressDefaultTextContainer: {
    flex: 1,
  },

  addressDefaultTitle: {
    color: accountPalette.text,
    fontSize: 13,
    fontWeight: "800",
  },

  addressDefaultDescription: {
    color: accountPalette.muted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },

  addressRequiredNote: {
    color: accountPalette.muted,
    fontSize: 11,
    marginHorizontal: 3,
  },

  addressSaveButton: {
    alignItems: "center",
    backgroundColor: accountPalette.deepBlue,
    borderRadius: 14,
    justifyContent: "center",
    minHeight: 54,
  },

  addressSaveButtonDisabled: {
    opacity: 0.6,
  },

  addressSaveButtonText: {
    color: accountPalette.white,
    fontSize: 15,
    fontWeight: "900",
  },

  addressErrorBox: {
    backgroundColor: "#FFF0F0",
    borderColor: "#F0C4C4",
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },

  addressErrorText: {
    color: accountPalette.danger,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
  },

  button: {
    alignItems: "center",
    backgroundColor: colors.danger,
    borderRadius: radius.md,
    minHeight: 48,
    justifyContent: "center",
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  buttonText: {
    color: colors.surface,
    fontSize: typography.body,
    fontWeight: "700",
  },
  container: {
    backgroundColor: colors.background,
    flex: 1,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  input: {
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.text,
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  label: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: "700",
  },
  link: {
    color: colors.primary,
    fontSize: typography.body,
    marginTop: spacing.md,
    textAlign: "center",
  },
  linkText: { color: colors.primary },
  loading: { flex: 1 },
  panel: {
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  remove: { color: colors.danger },
  row: { flexDirection: "row", gap: spacing.md },
  secondaryButton: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: "center",
  },
  sectionTitle: {
    color: colors.text,
    fontSize: typography.subtitle,
    fontWeight: "700",
  },
  success: { color: colors.success },
  title: {
    color: colors.text,
    fontSize: typography.title,
    fontWeight: "700",
    marginBottom: spacing.md,
  },
  value: {
    color: colors.text,
    fontSize: typography.body,
    marginBottom: spacing.sm,
  },
});
