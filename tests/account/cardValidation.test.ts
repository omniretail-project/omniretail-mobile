import { describe, expect, it } from "vitest";
import {
  buildSafePaymentMethodInput,
  validateCardForm,
  type CardFormState,
} from "../../src/modules/account/application/cardValidation";
import { GUATEMALA_BANKS } from "../../src/config";

const validCard: CardFormState = {
  cardNumber: "4111 1111 1111 1111",
  expiration: "12/30",
  cvv: "123",
  issuingBank: GUATEMALA_BANKS[0],
  cardholderName: "Cliente de Prueba",
};

describe("Validación de tarjetas", () => {
  it("acepta una tarjeta Visa de prueba válida", () => {
    expect(validateCardForm(validCard)).toBeNull();
  });

  it("rechaza un número que no supera Luhn", () => {
    expect(
      validateCardForm({
        ...validCard,
        cardNumber: "4111 1111 1111 1112",
      }),
    ).not.toBeNull();
  });

  it("rechaza un CVV incorrecto", () => {
    expect(
      validateCardForm({
        ...validCard,
        cvv: "12",
      }),
    ).not.toBeNull();
  });

  it("acepta American Express con CVV de cuatro dígitos", () => {
    expect(
      validateCardForm({
        ...validCard,
        cardNumber: "3782 822463 10005",
        cvv: "1234",
      }),
    ).toBeNull();
  });

  it("solo prepara metadatos para guardar", () => {
    const result = buildSafePaymentMethodInput(
      validCard,
      { tenantId: "tenant-test", customerId: "customer-test" },
      true,
    );

    expect(result.brand).toBe("Visa");
    expect(result.last4).toBe("1111");
    expect(result.expirationMonth).toBe(12);
    expect(result.expirationYear).toBe(2030);
    expect(result).not.toHaveProperty("cardNumber");
    expect(result).not.toHaveProperty("cvv");
    expect(JSON.stringify(result)).not.toContain("4111111111111111");
  });

  it("acepta Mastercard con número válido", () => {
    expect(validateCardForm({
      ...validCard,
      cardNumber: "5555 5555 5555 4444",
    })).toBeNull();
  });

  it("rechaza tarjetas vencidas", () => {
    expect(validateCardForm({
      ...validCard,
      expiration: "01/20",
    })).toBe("La tarjeta está vencida.");
  });

  it("rechaza fechas incorrectas", () => {
    expect(validateCardForm({
      ...validCard,
      expiration: "13/30",
    })).not.toBeNull();
  });

  it("rechaza bancos desconocidos", () => {
    expect(validateCardForm({
      ...validCard,
      issuingBank: "Banco Inexistente",
    })).not.toBeNull();
  });

  it("rechaza titulares vacíos", () => {
    expect(validateCardForm({
      ...validCard,
      cardholderName: "   ",
    })).not.toBeNull();
  });

  it("rechaza números vacíos", () => {
    expect(validateCardForm({
      ...validCard,
      cardNumber: "",
    })).not.toBeNull();
  });

  it("impide preparar una tarjeta inválida", () => {
    expect(() => buildSafePaymentMethodInput(
      { ...validCard, cvv: "12" },
      { tenantId: "tenant-test", customerId: "customer-test" },
      false,
    )).toThrow();
  });

  it("no incluye datos sensibles en los metadatos", () => {
    const result = buildSafePaymentMethodInput(
      validCard,
      { tenantId: "tenant-test", customerId: "customer-test" },
      false,
    );

    expect(result).not.toHaveProperty("cvv");
    expect(result).not.toHaveProperty("cardNumber");
  });

});
