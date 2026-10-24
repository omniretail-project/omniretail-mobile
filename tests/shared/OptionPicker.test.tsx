import { fireEvent, render } from "@testing-library/react";
import React from "react";
import { Platform } from "react-native";
import { describe, expect, it, vi } from "vitest";

import { OptionPicker } from "@/shared/components/OptionPicker";

describe("OptionPicker", () => {
  it("muestra el label y el valor seleccionado", () => {
    const { getByText } = render(
      <OptionPicker
        label="Departamento"
        onChange={vi.fn()}
        options={["Guatemala", "Escuintla"]}
        value="Guatemala"
      />,
    );

    expect(getByText("Departamento")).not.toBeNull();
    expect(getByText("Guatemala")).not.toBeNull();
  });

  it("abre el modal y permite seleccionar una opción", () => {
    const handleChange = vi.fn();
    const { getByText, getAllByText } = render(
      <OptionPicker
        label="Departamento"
        onChange={handleChange}
        options={["Guatemala", "Escuintla"]}
        value=""
      />,
    );

    fireEvent.click(getByText("Selecciona departamento"));
    // En el modal abierto, seleccionamos "Escuintla"
    const escuintlaOptions = getAllByText("Escuintla");
    fireEvent.click(escuintlaOptions[0]);

    expect(handleChange).toHaveBeenCalledWith("Escuintla");
  });

  it("filtra opciones mediante el buscador cuando hay más de 12 opciones", () => {
    const options = Array.from({ length: 15 }, (_, i) => `Opcion ${i + 1}`);
    const { getByPlaceholderText, getByText } = render(
      <OptionPicker
        label="Opciones"
        onChange={vi.fn()}
        options={options}
        value=""
      />,
    );

    fireEvent.click(getByText("Selecciona opciones"));
    const searchInput = getByPlaceholderText("Buscar opciones");
    fireEvent.change(searchInput, { target: { value: "Opcion 15" } });

    expect(getByText("Opcion 15")).not.toBeNull();
  });

  it("muestra el mensaje de vacío si no hay opciones", () => {
    const { getByText } = render(
      <OptionPicker
        emptyText="No hay municipios"
        label="Municipio"
        onChange={vi.fn()}
        options={[]}
        value=""
      />,
    );

    expect(getByText("No hay municipios")).not.toBeNull();
  });

  it("filtra departamentos ignorando tildes", () => {
    const handleChange = vi.fn();

    const options = [
      "Alta Verapaz",
      "Baja Verapaz",
      "Chimaltenango",
      "Chiquimula",
      "El Progreso",
      "Escuintla",
      "Guatemala",
      "Huehuetenango",
      "Izabal",
      "Jalapa",
      "Jutiapa",
      "Petén",
      "Quetzaltenango",
      "Quiché",
      "Retalhuleu",
    ];

    const { getByText, getByPlaceholderText, queryByText } = render(
      <OptionPicker
        label="Departamento"
        onChange={handleChange}
        options={options}
        value=""
      />,
    );

    fireEvent.click(getByText("Selecciona departamento"));

    const buscador = getByPlaceholderText("Buscar departamento");

    fireEvent.change(buscador, {
      target: { value: "peten" },
    });

    expect(getByText("Petén")).not.toBeNull();
    expect(queryByText("Guatemala")).toBeNull();

    fireEvent.click(getByText("Petén"));

    expect(handleChange).toHaveBeenCalledWith("Petén");
  });

  it("filtra municipios y permite seleccionar el resultado", () => {
    const handleChange = vi.fn();

    const options = [
      "Aguacatán",
      "Barillas",
      "Chiantla",
      "Colotenango",
      "Concepción Huista",
      "Cuilco",
      "Huehuetenango",
      "Jacaltenango",
      "La Democracia",
      "Malacatancito",
      "Nentón",
      "San Pedro Necta",
      "Santa Eulalia",
    ];

    const { getByText, getByPlaceholderText } = render(
      <OptionPicker
        label="Municipio"
        onChange={handleChange}
        options={options}
        value=""
      />,
    );

    fireEvent.click(getByText("Selecciona municipio"));

    fireEvent.change(getByPlaceholderText("Buscar municipio"), {
      target: { value: "chiantla" },
    });

    fireEvent.click(getByText("Chiantla"));

    expect(handleChange).toHaveBeenCalledWith("Chiantla");
  });

  it("muestra un mensaje cuando la búsqueda no tiene resultados", () => {
    const options = Array.from(
      { length: 15 },
      (_, index) => `Municipio ${index + 1}`,
    );

    const { getByText, getByPlaceholderText } = render(
      <OptionPicker
        label="Municipio"
        emptyText="Sin resultados"
        onChange={vi.fn()}
        options={options}
        value=""
      />,
    );

    fireEvent.click(getByText("Selecciona municipio"));

    fireEvent.change(getByPlaceholderText("Buscar municipio"), {
      target: { value: "NoExiste" },
    });

    expect(getByText("Sin resultados")).not.toBeNull();
  });


  it.each(["android", "ios"] as const)(
    "presenta correctamente el selector en Android e iOS: %s",
    (platform) => {
      const original = Object.getOwnPropertyDescriptor(Platform, "OS");

      Object.defineProperty(Platform, "OS", {
        configurable: true,
        value: platform,
      });

      try {
        const options = Array.from(
          { length: 15 },
          (_, index) => `Departamento ${index + 1}`,
        );

        const onChange = vi.fn();

        const { getByText, getByPlaceholderText } = render(
          <OptionPicker
            label="Departamento"
            onChange={onChange}
            options={options}
            value=""
          />,
        );

        fireEvent.click(getByText("Selecciona departamento"));

        fireEvent.change(
          getByPlaceholderText("Buscar departamento"),
          { target: { value: "Departamento 15" } },
        );

        fireEvent.click(getByText("Departamento 15"));

        expect(onChange).toHaveBeenCalledWith("Departamento 15");
        expect(getByText("Selecciona departamento")).not.toBeNull();
      } finally {
        if (original) {
          Object.defineProperty(Platform, "OS", original);
        }
      }
    },
  );

  it("permite cerrar y volver a abrir el selector", () => {
    const options = Array.from(
      { length: 15 },
      (_, index) => `Municipio ${index + 1}`,
    );

    const { getByText, getByPlaceholderText, getByLabelText } = render(
      <OptionPicker
        label="Municipio"
        onChange={vi.fn()}
        options={options}
        value=""
      />,
    );

    fireEvent.click(getByText("Selecciona municipio"));

    fireEvent.change(
      getByPlaceholderText("Buscar municipio"),
      { target: { value: "Municipio 15" } },
    );

    fireEvent.click(getByLabelText("Cerrar selector"));
    fireEvent.click(getByText("Selecciona municipio"));

    expect(getByPlaceholderText("Buscar municipio")).not.toBeNull();
    expect(getByText("Municipio 1")).not.toBeNull();
  });

});
