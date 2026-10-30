import { useCallback, useEffect, useState } from "react";

import { apiConfig, isApiMode, useRepositories } from "@/infrastructure";
import { useSession } from "@/modules/auth";

import {
  createProductCardViewModel,
  type ProductCardViewModel,
} from "../application/productViewModels";

type ProductDetailState = {
  product: ProductCardViewModel | null;
  isLoading: boolean;
  error: string | null;
};

export function useProductDetail(productId?: string) {
  const repositories = useRepositories();
  const { session } = useSession();

  const [state, setState] = useState<ProductDetailState>({
    product: null,
    isLoading: true,
    error: null,
  });

  const load = useCallback(async () => {
    if (!productId) {
      setState({
        product: null,
        isLoading: false,
        error: "Producto no encontrado.",
      });
      return;
    }

    const apiMode = isApiMode();

    setState((current) => ({
      ...current,
      isLoading: true,
      error: null,
    }));

    try {
      const tenantId =
        session?.tenantId ??
        (apiMode ? apiConfig.tenantSlug : "tenant-omniretail-demo");

      const product =
        await repositories.productRepository.getById(productId);

      if (!product) {
        setState({
          product: null,
          isLoading: false,
          error: "Producto no encontrado.",
        });
        return;
      }

      const availability =
        await repositories.productAvailabilityRepository.getByProduct(
          tenantId,
          product.id,
        );

      const promotions =
        await repositories.promotionRepository.getByProduct(
          tenantId,
          product.id,
        );

      const media = await repositories.productMediaRepository.getByProduct(
        product.id,
      );

      const favoriteIds = session
        ? (
            await repositories.favoriteRepository.getByCustomer(
              session.tenantId,
              session.customerId,
            )
          ).map((favorite) => favorite.productId)
        : [];

      setState({
        product: createProductCardViewModel(
          product,
          media,
          promotions,
          availability,
          favoriteIds,
        ),
        isLoading: false,
        error: null,
      });
    } catch {
      setState({
        product: null,
        isLoading: false,
        error: "No se pudo cargar el producto.",
      });
    }
  }, [productId, repositories, session]);

  useEffect(() => {
    const timeout = setTimeout(() => void load(), 0);

    return () => clearTimeout(timeout);
  }, [load]);

  return {
    ...state,
    reload: load,
  };
}
