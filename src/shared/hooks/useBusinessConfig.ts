import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

import type { BusinessConfig, BusinessHeroSlide } from "@/core";
import { useRepositories } from "@/infrastructure/repositories";

/** Nombre que se muestra mientras llega la configuración o si no se puede leer. */
export const DEFAULT_STORE_NAME = "FERREPHARMA";

// Referencia estable: evita recalcular el carrusel en cada render mientras no hay configuracion.
const NO_SLIDES: BusinessHeroSlide[] = [];

// Ultima configuracion leida, compartida por todas las pantallas. Asi, tras la primera lectura,
// cualquier pantalla que se monte arranca ya con el nombre y el logo reales y no parpadea con el
// nombre por defecto.
let cachedBusinessConfig: BusinessConfig | null = null;

/** Descarta la configuracion en memoria (las pruebas la usan para partir de cero). */
export function clearBusinessConfigCache() {
  cachedBusinessConfig = null;
}

/**
 * Configuración pública de la tienda (nombre, logo, carrusel y contacto) configurada desde el
 * panel web. Se vuelve a leer cada vez que la pantalla toma el foco; el servicio la cachea unos
 * segundos, así que varias pantallas no repiten la petición. Sin conexión se conservan los
 * últimos valores leídos (o los valores por defecto).
 */
export function useBusinessConfig() {
  const { businessConfigRepository } = useRepositories();
  const [config, setConfig] = useState<BusinessConfig | null>(cachedBusinessConfig);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      businessConfigRepository.getCurrent().then(
        (current) => {
          cachedBusinessConfig = current;
          if (active) setConfig(current);
        },
        () => undefined,
      );

      return () => {
        active = false;
      };
    }, [businessConfigRepository]),
  );

  return {
    config,
    storeName: config?.name?.trim() || DEFAULT_STORE_NAME,
    logoUri: config?.logoUri,
    heroSlides: config?.heroSlides ?? NO_SLIDES,
    shipping: config?.shipping,
  };
}
