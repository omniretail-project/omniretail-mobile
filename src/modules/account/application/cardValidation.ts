import type { CreateCustomerPaymentMethodInput } from "@/core";
import { GUATEMALA_BANKS } from "@/config";
import {
  detectStorefrontCardBrand,
  validateCardNumber,
  validateCardExpiration,
  validateCardholderName,
  getSecurityCodeLength,
} from "@/modules/checkout/application/cardPaymentValidation";

export type CardFormState = {
  cardNumber: string;
  expiration: string;
  cvv: string;
  issuingBank: string;
  cardholderName: string;
};

export function validateCardForm(input: CardFormState): string | null {
  const digits = input.cardNumber.replace(/\D/g, "");
  const numberError = validateCardNumber(digits);
  if (numberError) return numberError;

  const brand = detectStorefrontCardBrand(digits);
  if (!brand) return "La marca de la tarjeta no es válida.";

  const expirationError = validateCardExpiration(input.expiration);
  if (expirationError) return expirationError;

  if (!new RegExp(`^\\d{${getSecurityCodeLength(brand)}}$`).test(input.cvv)) {
    return brand === "American Express"
      ? "El código de seguridad debe tener 4 dígitos."
      : "El código de seguridad debe tener 3 dígitos.";
  }

  const nameError = validateCardholderName(input.cardholderName);
  if (nameError) return nameError;

  if (!GUATEMALA_BANKS.includes(
    input.issuingBank as (typeof GUATEMALA_BANKS)[number]
  )) {
    return "Selecciona un banco emisor válido.";
  }

  return null;
}

export function buildSafePaymentMethodInput(
  input: CardFormState,
  owner: { tenantId: string; customerId: string },
  isDefault: boolean,
): CreateCustomerPaymentMethodInput {
  const digits = input.cardNumber.replace(/\D/g, "");
  const brand = detectStorefrontCardBrand(digits);

  if (!brand || validateCardForm(input)) {
    throw new Error("Los datos de la tarjeta no son válidos.");
  }

  const [month, year] = input.expiration.split("/");

  return {
    tenantId: owner.tenantId,
    customerId: owner.customerId,
    providerTokenId: createPaymentMethodReference(brand, digits.slice(-4)),
    brand,
    issuingBank: input.issuingBank.trim(),
    last4: digits.slice(-4),
    expirationMonth: Number(month),
    expirationYear: 2000 + Number(year),
    cardholderName: input.cardholderName.trim(),
    isDefault,
  };
}

function createPaymentMethodReference(brand: string, last4: string): string {
  return `mobile-card-${brand.toLowerCase().replace(/\s+/g, "-")}-${last4}-${Date.now().toString(36)}`;
}
