import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { Category } from "@/core";
import {
  apiConfig,
  isApiMode,
  useRepositories,
} from "@/infrastructure";
import { useSession } from "@/modules/auth";

import {
  createProductCardViewModel,
  resolveAvailableQuantity,
  type ProductCardViewModel,
} from "../application/productViewModels";

type CatalogState = {
  businessName: string;
  currency: string;
  categories: Category[];
  products: ProductCardViewModel[];
  isLoading: boolean;
  error: string | null;
};

export type AddToCartResult =
  | { status: "added"; availableQuantity: number | null }
  | { status: "limit-reached"; availableQuantity: number }
  | { status: "unavailable"; availableQuantity: number };

export function useCommerceCatalog(
  categoryId?: string,
  query = "",
) {
  const repositories = useRepositories();
  const { session } = useSession();

  const [state, setState] = useState<CatalogState>({
    businessName: "",
    currency: "GTQ",
    categories: [],
    products: [],
    isLoading: true,
    error: null,
  });

  const load = useCallback(async () => {
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

      // El nombre sale de la configuracion de la tienda (panel web); sin conexion se usa el de siempre.
      const businessName = await repositories.businessConfigRepository
        .getCurrent()
        .then(
          (config) => config.name,
          () => "FERREPHARMA",
        );

      const allProducts =
        await repositories.productRepository.getAll(tenantId);

      const categories =
        await repositories.categoryRepository.getAll(tenantId);

      const promotions =
        await repositories.promotionRepository.getActive(tenantId);

      const favorites = session
        ? await repositories.favoriteRepository.getByCustomer(
            session.tenantId,
            session.customerId,
          )
        : [];

      const media = (
        await Promise.all(
          allProducts.map((product) =>
            repositories.productMediaRepository.getByProduct(
              product.id,
            ),
          ),
        )
      ).flat();

      const availability = (
        await Promise.all(
          allProducts.map((product) =>
            repositories.productAvailabilityRepository.getByProduct(
              tenantId,
              product.id,
            ),
          ),
        )
      ).flat();

      const favoriteIds = favorites.map(
        (favorite) => favorite.productId,
      );

      setState({
        businessName,
        currency: "GTQ",
        categories,
        products: allProducts.map((product) =>
          createProductCardViewModel(
            product,
            media,
            promotions,
            availability,
            favoriteIds,
          ),
        ),
        isLoading: false,
        error: null,
      });
    } catch {
      setState((current) => ({
        ...current,
        isLoading: false,
        error: "No se pudo cargar el catalogo.",
      }));
    }
  }, [repositories, session]);

  useEffect(() => {
    const timeout = setTimeout(() => void load(), 0);

    return () => clearTimeout(timeout);
  }, [load]);

  const filteredProducts = useMemo(() => {
    const normalizedQuery =
      query.trim().toLocaleLowerCase();

    return state.products.filter((item) => {
      const product = item.product;

      const matchesCategory =
        !categoryId ||
        product.categoryId === categoryId;

      const matchesQuery =
        !normalizedQuery ||
        product.name
          .toLocaleLowerCase()
          .includes(normalizedQuery) ||
        product.sku
          .toLocaleLowerCase()
          .includes(normalizedQuery) ||
        product.description
          ?.toLocaleLowerCase()
          .includes(normalizedQuery);

      return matchesCategory && matchesQuery;
    });
  }, [categoryId, query, state.products]);

  async function toggleFavorite(productId: string) {
    if (!session) {
      return;
    }

    const exists =
      await repositories.favoriteRepository.isFavorite(
        session.tenantId,
        session.customerId,
        productId,
      );

    if (exists) {
      await repositories.favoriteRepository.remove(
        session.tenantId,
        session.customerId,
        productId,
      );
    } else {
      await repositories.favoriteRepository.add({
        tenantId: session.tenantId,
        customerId: session.customerId,
        productId,
        createdAt: new Date().toISOString(),
      });
    }

    await load();
  }

  async function addToCart(productId: string): Promise<AddToCartResult | undefined> {
    if (!session) {
      return undefined;
    }

    const product =
      await repositories.productRepository.getById(productId);

    if (!product) {
      return undefined;
    }

    const availability =
      await repositories.productAvailabilityRepository.getByProduct(
        session.tenantId,
        product.id,
      );

    const availableQuantity = resolveAvailableQuantity(availability);
    const isAvailable = availability.some((item) => item.available);

    const cart =
      await repositories.cartRepository.getOrCreate(
        session.tenantId,
        session.customerId,
      );

    const cartItems =
      await repositories.cartRepository.getItems(cart.id);

    const currentQuantity = cartItems
      .filter(
        (item) =>
          item.cartId === cart.id &&
          item.productId === product.id,
      )
      .reduce((sum, item) => sum + item.quantity, 0);

    if (!isAvailable || (availableQuantity !== null && availableQuantity <= 0)) {
      return { status: "unavailable", availableQuantity: availableQuantity ?? 0 };
    }

    if (availableQuantity !== null && currentQuantity >= availableQuantity) {
      return { status: "limit-reached", availableQuantity };
    }

    const promotions =
      await repositories.promotionRepository.getByProduct(
        session.tenantId,
        product.id,
      );

    const viewModel = createProductCardViewModel(
      product,
      [],
      promotions,
      availability,
      [],
    );

    await repositories.cartRepository.addItem({
      cartId: cart.id,
      productId: product.id,
      quantity: 1,
      unitId: product.unitId,
      unitPriceSnapshot: viewModel.price.basePrice,
      effectiveUnitPriceSnapshot:
        viewModel.price.effectivePrice,
    });

    // No recargamos el catálogo: así el usuario permanece donde agregó el producto.
    return { status: "added", availableQuantity };
  }

  return {
    ...state,
    products: filteredProducts,
    addToCart,
    reload: load,
    toggleFavorite,
  };
}
