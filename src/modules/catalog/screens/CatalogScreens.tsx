import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { CartToast, formatCurrency, StockLimitModal, StoreBrandText, useCartToast } from "@/shared";
import { useSession } from "@/modules/auth";

import { calculatePrice } from "../application/pricing";
import { ProductCard } from "../components/ProductCard";
import { useCommerceCatalog } from "../hooks/useCommerceCatalog";
import { useProductDetail } from "../hooks/useProductDetail";

export function CategoriesScreen() {
  const params = useLocalSearchParams<{ categoryId?: string }>();
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    params.categoryId,
  );
  const [query, setQuery] = useState("");
  const { cartToastMessage, showCartToast } = useCartToast();

  const { addToCart, categories, currency, error, isLoading, products } =
    useCommerceCatalog(selectedCategoryId, query);

  if (isLoading) {
    return (
      <View style={categoryStyles.loadingContainer}>
        <ActivityIndicator color={categoryPalette.deepBlue} size="large" />
        <Text style={categoryStyles.loadingText}>Preparando catálogo...</Text>
      </View>
    );
  }

  const selectedCategory = categories.find(
    (category) => category.id === selectedCategoryId,
  );

  return (
    <View style={categoryStyles.screen}>
      <FlatList
      contentContainerStyle={categoryStyles.content}
      data={products}
      keyExtractor={(item) => item.product.id}
      ListHeaderComponent={
        <>
          <View style={categoryStyles.hero}>
            <View style={categoryStyles.decorationOne} />
            <View style={categoryStyles.decorationTwo} />

            <View style={categoryStyles.heroTop}>
              <View style={categoryStyles.heroText}>
                <StoreBrandText style={categoryStyles.brand} />

                <Text style={categoryStyles.heroTitle}>Categorías</Text>
              </View>

              <View style={categoryStyles.heroIcon}>
                <Ionicons
                  color={categoryPalette.deepBlue}
                  name="grid-outline"
                  size={23}
                />
              </View>
            </View>

            <Text style={categoryStyles.heroDescription}>
              Encuentra productos para tu hogar, proyectos y cuidado diario.
            </Text>

            <View style={categoryStyles.searchBox}>
              <Ionicons
                color={categoryPalette.deepBlue}
                name="search-outline"
                size={20}
              />

              <TextInput
                onChangeText={setQuery}
                placeholder="¿Qué estás buscando?"
                placeholderTextColor={categoryPalette.muted}
                style={categoryStyles.searchInput}
                value={query}
              />

              {query.length > 0 ? (
                <Pressable
                  accessibilityLabel="Limpiar búsqueda"
                  onPress={() => setQuery("")}
                  style={categoryStyles.clearButton}
                >
                  <Ionicons
                    color={categoryPalette.deepBlue}
                    name="close"
                    size={17}
                  />
                </Pressable>
              ) : null}
            </View>
          </View>

          <View style={categoryStyles.catalogHeader}>
            <View style={categoryStyles.catalogTitleRow}>
              <View>
                <Text style={categoryStyles.eyebrow}>EXPLORA</Text>

                <Text style={categoryStyles.sectionTitle}>
                  Nuestro catálogo
                </Text>
              </View>

              <View style={categoryStyles.resultBadge}>
                <Text style={categoryStyles.resultNumber}>
                  {products.length}
                </Text>
                <Text style={categoryStyles.resultLabel}>productos</Text>
              </View>
            </View>

            {error ? (
              <View style={categoryStyles.errorBox}>
                <Ionicons
                  color={categoryPalette.danger}
                  name="alert-circle-outline"
                  size={17}
                />
                <Text style={categoryStyles.errorText}>{error}</Text>
              </View>
            ) : null}

            <ScrollView
              contentContainerStyle={categoryStyles.pillsContent}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={categoryStyles.pillsScroll}
            >
              <Pressable
                onPress={() => setSelectedCategoryId(undefined)}
                style={[
                  categoryStyles.categoryPill,
                  !selectedCategoryId ? categoryStyles.categorySelected : null,
                ]}
              >
                <Ionicons
                  color={
                    !selectedCategoryId
                      ? categoryPalette.white
                      : categoryPalette.deepBlue
                  }
                  name="apps-outline"
                  size={15}
                />

                <Text
                  style={[
                    categoryStyles.categoryText,
                    !selectedCategoryId
                      ? categoryStyles.categoryTextSelected
                      : null,
                  ]}
                >
                  Todas
                </Text>
              </Pressable>

              {categories.map((category) => {
                const selected = selectedCategoryId === category.id;

                return (
                  <Pressable
                    key={category.id}
                    onPress={() => setSelectedCategoryId(category.id)}
                    style={[
                      categoryStyles.categoryPill,
                      selected ? categoryStyles.categorySelected : null,
                    ]}
                  >
                    <Ionicons
                      color={
                        selected
                          ? categoryPalette.white
                          : categoryPalette.deepBlue
                      }
                      name="pricetag-outline"
                      size={14}
                    />

                    <Text
                      style={[
                        categoryStyles.categoryText,
                        selected ? categoryStyles.categoryTextSelected : null,
                      ]}
                    >
                      {category.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={categoryStyles.filterSummary}>
              <Ionicons
                color={categoryPalette.deepBlue}
                name="options-outline"
                size={16}
              />

              <Text style={categoryStyles.filterSummaryText}>
                {selectedCategory
                  ? `Mostrando ${selectedCategory.name}`
                  : "Mostrando todas las categorías"}
              </Text>
            </View>
          </View>
        </>
      }
      ListEmptyComponent={
        <View style={categoryStyles.emptyCard}>
          <View style={categoryStyles.emptyIcon}>
            <Ionicons
              color={categoryPalette.deepBlue}
              name="search-outline"
              size={35}
            />
          </View>

          <Text style={categoryStyles.emptyTitle}>
            No encontramos productos
          </Text>

          <Text style={categoryStyles.emptyDescription}>
            Prueba con otra búsqueda o selecciona una categoría diferente.
          </Text>

          <Pressable
            onPress={() => {
              setQuery("");
              setSelectedCategoryId(undefined);
            }}
            style={categoryStyles.resetButton}
          >
            <Text style={categoryStyles.resetButtonText}>
              Ver todo el catálogo
            </Text>
          </Pressable>
        </View>
      }
      renderItem={({ item }) => (
        <ProductCard currency={currency} item={item} onAddToCart={addToCart} onCartNotice={showCartToast} />
      )}
      />
      <CartToast message={cartToastMessage} />
    </View>
  );
}

export function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isAuthenticated } = useSession();
  const { addToCart, currency } = useCommerceCatalog();
  const {
    error: detailError,
    isLoading,
    product: productVm,
  } = useProductDetail(id);
  const [quantity, setQuantity] = useState(1);
  const [quantityInput, setQuantityInput] = useState("1");
  const [message, setMessage] = useState<string | null>(null);
  const [imageFailed, setImageFailed] = useState(false);
  const [stockLimit, setStockLimit] = useState<number | null>(null);

  function setSelectedQuantity(nextQuantity: number) {
    if (!productVm) {
      return null;
    }

    const availableQuantity = productVm.availableQuantity;

    if (availableQuantity !== null && nextQuantity > availableQuantity) {
      setStockLimit(availableQuantity);
      setQuantity(Math.max(1, availableQuantity));
      setQuantityInput(String(Math.max(1, availableQuantity)));
      return null;
    }

    const boundedQuantity = Math.max(1, nextQuantity);
    setQuantity(boundedQuantity);
    setQuantityInput(String(boundedQuantity));
    return boundedQuantity;
  }

  function submitQuantity() {
    const nextQuantity = Number.parseInt(quantityInput, 10);

    if (!Number.isFinite(nextQuantity) || nextQuantity < 1) {
      setQuantityInput(String(quantity));
      return;
    }

    setSelectedQuantity(nextQuantity);
  }

  async function handleAdd() {
    if (!productVm) {
      return;
    }

    if (!isAuthenticated) {
      router.push({
        pathname: "/(auth)/login",
        params: { reason: "cart" },
      });
      return;
    }

    const requestedQuantity = Number.parseInt(quantityInput, 10);

    if (!Number.isFinite(requestedQuantity) || requestedQuantity < 1) {
      setQuantityInput(String(quantity));
      return;
    }

    const quantityToAdd = setSelectedQuantity(requestedQuantity);

    if (!quantityToAdd) {
      return;
    }

    let addedQuantity = 0;

    for (let index = 0; index < quantityToAdd; index += 1) {
      const result = await addToCart(productVm.product.id);

      if (result?.status !== "added") {
        setStockLimit(result?.availableQuantity ?? 0);
        break;
      }

      addedQuantity += 1;
    }

    if (addedQuantity > 0) {
      setMessage(
        addedQuantity === quantityToAdd
          ? "Producto agregado al carrito."
          : `${addedQuantity} unidades se agregaron al carrito.`,
      );
    }
  }

  if (isLoading) {
    return (
      <View style={detailStyles.loadingContainer}>
        <ActivityIndicator color={categoryPalette.deepBlue} size="large" />
        <Text style={detailStyles.loadingText}>Preparando producto...</Text>
      </View>
    );
  }

  if (!productVm) {
    return (
      <View style={detailStyles.loadingContainer}>
        <Ionicons
          color={categoryPalette.deepBlue}
          name="cube-outline"
          size={48}
        />
        <Text style={detailStyles.notFoundTitle}>
          {detailError ?? "Producto no encontrado"}
        </Text>
      </View>
    );
  }

  const price = calculatePrice(
    productVm.product,
    productVm.price.promotion ? [productVm.price.promotion] : [],
  );

  return (
    <ScrollView
      contentContainerStyle={detailStyles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={detailStyles.hero}>
        <View style={detailStyles.decorationOne} />
        <View style={detailStyles.decorationTwo} />

        <StoreBrandText style={detailStyles.brand} />
        <Text style={detailStyles.heroTitle}>Detalle del producto</Text>
        <Text style={detailStyles.heroDescription}>
          Información, disponibilidad y precio del producto.
        </Text>
      </View>

      <View style={detailStyles.imageCard}>
        <Image
          accessibilityLabel={productVm.primaryImage.altText}
          onError={() => setImageFailed(true)}
          resizeMode="contain"
          source={
            imageFailed
              ? productVm.primaryImage.fallbackSource
              : productVm.primaryImage.source
          }
          style={detailStyles.detailImage}
        />

        {productVm.price.discount > 0 ? (
          <View style={detailStyles.offerBadge}>
            <Ionicons
              color={categoryPalette.deepBlue}
              name="flash"
              size={13}
            />
            <Text style={detailStyles.offerText}>OFERTA</Text>
          </View>
        ) : null}
      </View>

      {productVm.images.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={detailStyles.mediaStrip}
        >
          {productVm.images.map((image) => (
            <Image
              accessibilityLabel={image.altText}
              key={image.media?.id ?? image.altText}
              resizeMode="contain"
              source={image.source}
              style={detailStyles.thumbnail}
            />
          ))}
        </ScrollView>
      ) : null}

      <View style={detailStyles.infoCard}>
        <Text style={detailStyles.eyebrow}>PRODUCTO</Text>

        <Text style={detailStyles.title}>
          {productVm.product.name}
        </Text>

        <View style={detailStyles.skuRow}>
          <Ionicons
            color={categoryPalette.muted}
            name="barcode-outline"
            size={16}
          />
          <Text style={detailStyles.muted}>
            SKU {productVm.product.sku}
          </Text>
        </View>

        {productVm.product.description ? (
          <Text style={detailStyles.description}>
            {productVm.product.description}
          </Text>
        ) : null}

        <View style={detailStyles.divider} />

        <View style={detailStyles.priceRow}>
          <View>
            <Text style={detailStyles.priceLabel}>Precio</Text>
            <Text style={detailStyles.price}>
              {formatCurrency(price.effectivePrice, currency)}
            </Text>
          </View>

          <View
            style={[
              detailStyles.stockBadge,
              !productVm.available ? detailStyles.stockBadgeEmpty : null,
            ]}
          >
            <View
              style={[
                detailStyles.stockDot,
                !productVm.available ? detailStyles.stockDotEmpty : null,
              ]}
            />
            <Text
              style={[
                detailStyles.stockText,
                !productVm.available ? detailStyles.stockTextEmpty : null,
              ]}
            >
              {productVm.available ? "Disponible" : "Agotado"}
            </Text>
          </View>
        </View>

        {price.discount > 0 ? (
          <Text style={detailStyles.discountText}>
            Antes {formatCurrency(price.basePrice, currency)} · Ahorras{" "}
            {formatCurrency(price.discount, currency)}
          </Text>
        ) : null}
      </View>

      <View style={detailStyles.purchaseCard}>
        <View style={detailStyles.quantityHeader}>
          <View>
            <Text style={detailStyles.eyebrow}>SELECCIONA</Text>
            <Text style={detailStyles.sectionTitle}>Cantidad</Text>
          </View>

          <Text style={detailStyles.availableText}>
            {productVm.availableQuantity === null
              ? "Disponible"
              : `${productVm.availableQuantity} disponibles`}
          </Text>
        </View>

        <View style={detailStyles.quantityRow}>
          <Pressable
            accessibilityLabel="Disminuir cantidad"
            onPress={() => setSelectedQuantity(quantity - 1)}
            style={({ pressed }) => [
              detailStyles.quantityButton,
              pressed ? detailStyles.pressed : null,
            ]}
          >
            <Ionicons
              color={categoryPalette.deepBlue}
              name="remove"
              size={21}
            />
          </Pressable>

          <TextInput
            accessibilityLabel="Cantidad seleccionada"
            keyboardType="number-pad"
            maxLength={4}
            onChangeText={(value) => setQuantityInput(value.replace(/\D/g, ""))}
            onEndEditing={submitQuantity}
            onSubmitEditing={submitQuantity}
            selectTextOnFocus
            style={detailStyles.quantityInput}
            value={quantityInput}
          />

          <Pressable
            accessibilityLabel="Aumentar cantidad"
            disabled={!productVm.available}
            onPress={() => setSelectedQuantity(quantity + 1)}
            style={({ pressed }) => [
              detailStyles.quantityButton,
              pressed ? detailStyles.pressed : null,
            ]}
          >
            <Ionicons
              color={categoryPalette.deepBlue}
              name="add"
              size={21}
            />
          </Pressable>
        </View>

        <Pressable
          disabled={!productVm.available}
          onPress={handleAdd}
          style={({ pressed }) => [
            detailStyles.primaryButton,
            !productVm.available ? detailStyles.disabled : null,
            pressed ? detailStyles.pressed : null,
          ]}
        >
          <Ionicons color={categoryPalette.white} name="cart-outline" size={20} />
          <Text style={detailStyles.primaryText}>
            Agregar al carrito
          </Text>
        </Pressable>

        <Pressable
          accessibilityLabel="Ver mi carrito"
          accessibilityRole="button"
          onPress={() => router.push("/(protected)/(tabs)/cart")}
          style={detailStyles.viewCartButton}
        >
          <Ionicons
            color={categoryPalette.deepBlue}
            name="cart-outline"
            size={20}
          />
          <Text style={detailStyles.viewCartText}>
            Ver mi carrito
          </Text>
          <Ionicons
            color={categoryPalette.deepBlue}
            name="arrow-forward"
            size={18}
          />
        </Pressable>

        {message ? (
          <View style={detailStyles.successBox}>
            <Ionicons
              color="#27845B"
              name="checkmark-circle"
              size={18}
            />
            <Text style={detailStyles.success}>{message}</Text>
          </View>
        ) : null}
      </View>

      <StockLimitModal
        availableQuantity={stockLimit ?? 0}
        onClose={() => setStockLimit(null)}
        visible={stockLimit !== null}
      />
    </ScrollView>
  );
}

const categoryPalette = {
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
};

const categoryStyles = StyleSheet.create({
  screen: {
    backgroundColor: categoryPalette.vanillaMilk,
    flex: 1,
  },
  content: {
    backgroundColor: categoryPalette.vanillaMilk,
    flexGrow: 1,
    paddingBottom: 32,
  },

  loadingContainer: {
    alignItems: "center",
    backgroundColor: categoryPalette.vanillaMilk,
    flex: 1,
    gap: 10,
    justifyContent: "center",
  },

  loadingText: {
    color: categoryPalette.deepBlue,
    fontSize: 12,
    fontWeight: "800",
  },

  hero: {
    backgroundColor: categoryPalette.deepBlue,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    marginBottom: 20,
    minHeight: 235,
    overflow: "hidden",
    paddingBottom: 24,
    paddingHorizontal: 20,
    paddingTop: 44,
  },

  decorationOne: {
    backgroundColor: categoryPalette.dreamyBlue,
    borderRadius: 120,
    height: 190,
    opacity: 0.17,
    position: "absolute",
    right: -55,
    top: -55,
    width: 190,
  },

  decorationTwo: {
    backgroundColor: categoryPalette.butterHoney,
    borderRadius: 60,
    bottom: -45,
    height: 115,
    opacity: 0.16,
    position: "absolute",
    right: 55,
    width: 115,
  },

  heroTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },

  heroText: {
    flex: 1,
  },

  brand: {
    color: categoryPalette.butterHoney,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.8,
  },

  heroTitle: {
    color: categoryPalette.white,
    fontSize: 30,
    fontWeight: "900",
    marginTop: 3,
  },

  heroIcon: {
    alignItems: "center",
    backgroundColor: categoryPalette.white,
    borderRadius: 23,
    height: 46,
    justifyContent: "center",
    width: 46,
  },

  heroDescription: {
    color: "#EAF1F8",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
    maxWidth: "82%",
  },

  searchBox: {
    alignItems: "center",
    backgroundColor: categoryPalette.white,
    borderRadius: 15,
    flexDirection: "row",
    gap: 9,
    marginTop: 17,
    minHeight: 50,
    paddingHorizontal: 14,
  },

  searchInput: {
    color: categoryPalette.text,
    flex: 1,
    fontSize: 13,
    minHeight: 50,
  },

  clearButton: {
    alignItems: "center",
    backgroundColor: "#EEF3FB",
    borderRadius: 10,
    height: 30,
    justifyContent: "center",
    width: 30,
  },

  catalogHeader: {
    marginBottom: 12,
  },

  catalogTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 18,
  },

  eyebrow: {
    color: categoryPalette.dreamyBlue,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.5,
  },

  sectionTitle: {
    color: categoryPalette.text,
    fontSize: 21,
    fontWeight: "900",
    marginTop: 2,
  },

  resultBadge: {
    alignItems: "center",
    backgroundColor: categoryPalette.butterHoney,
    borderRadius: 13,
    minWidth: 62,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },

  resultNumber: {
    color: categoryPalette.deepBlue,
    fontSize: 14,
    fontWeight: "900",
  },

  resultLabel: {
    color: categoryPalette.deepBlue,
    fontSize: 8,
    fontWeight: "700",
  },

  errorBox: {
    alignItems: "center",
    backgroundColor: "#FFF0F0",
    borderRadius: 12,
    flexDirection: "row",
    gap: 7,
    marginHorizontal: 18,
    marginTop: 12,
    padding: 11,
  },

  errorText: {
    color: categoryPalette.danger,
    flex: 1,
    fontSize: 11,
  },

  pillsScroll: {
    flexGrow: 0,
    marginTop: 15,
  },

  pillsContent: {
    paddingHorizontal: 18,
  },

  categoryPill: {
    alignItems: "center",
    backgroundColor: categoryPalette.white,
    borderColor: categoryPalette.silkyLilac,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 5,
    marginRight: 8,
    minHeight: 37,
    paddingHorizontal: 12,
  },

  categorySelected: {
    backgroundColor: categoryPalette.deepBlue,
    borderColor: categoryPalette.deepBlue,
  },

  categoryText: {
    color: categoryPalette.deepBlue,
    fontSize: 11,
    fontWeight: "800",
  },

  categoryTextSelected: {
    color: categoryPalette.white,
  },

  filterSummary: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    marginHorizontal: 19,
    marginTop: 13,
  },

  filterSummaryText: {
    color: categoryPalette.muted,
    fontSize: 10,
    fontWeight: "600",
  },

  emptyCard: {
    alignItems: "center",
    backgroundColor: categoryPalette.white,
    borderColor: categoryPalette.silkyLilac,
    borderRadius: 22,
    borderWidth: 1,
    marginHorizontal: 18,
    marginTop: 8,
    padding: 28,
  },

  emptyIcon: {
    alignItems: "center",
    backgroundColor: categoryPalette.butterHoney,
    borderRadius: 34,
    height: 68,
    justifyContent: "center",
    width: 68,
  },

  emptyTitle: {
    color: categoryPalette.text,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 17,
  },

  emptyDescription: {
    color: categoryPalette.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
    textAlign: "center",
  },

  resetButton: {
    backgroundColor: categoryPalette.deepBlue,
    borderRadius: 12,
    marginTop: 17,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },

  resetButtonText: {
    color: categoryPalette.white,
    fontSize: 11,
    fontWeight: "900",
  },
});


const detailStyles = StyleSheet.create({
  viewCartButton: {
    alignItems: "center",
    backgroundColor: categoryPalette.white,
    borderColor: categoryPalette.deepBlue,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    marginTop: 12,
    minHeight: 48,
    paddingHorizontal: 16,
  },
  viewCartText: {
    color: categoryPalette.deepBlue,
    fontSize: 14,
    fontWeight: "800",
  },
  content: {
    backgroundColor: categoryPalette.vanillaMilk,
    flexGrow: 1,
    paddingBottom: 34,
  },

  loadingContainer: {
    alignItems: "center",
    backgroundColor: categoryPalette.vanillaMilk,
    flex: 1,
    gap: 12,
    justifyContent: "center",
  },

  loadingText: {
    color: categoryPalette.deepBlue,
    fontSize: 12,
    fontWeight: "800",
  },

  notFoundTitle: {
    color: categoryPalette.text,
    fontSize: 20,
    fontWeight: "900",
  },

  hero: {
    backgroundColor: categoryPalette.deepBlue,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    minHeight: 175,
    overflow: "hidden",
    paddingBottom: 28,
    paddingHorizontal: 22,
    paddingTop: 45,
  },

  decorationOne: {
    backgroundColor: categoryPalette.dreamyBlue,
    borderRadius: 100,
    height: 180,
    opacity: 0.17,
    position: "absolute",
    right: -55,
    top: -65,
    width: 180,
  },

  decorationTwo: {
    backgroundColor: categoryPalette.butterHoney,
    borderRadius: 55,
    bottom: -55,
    height: 110,
    opacity: 0.15,
    position: "absolute",
    right: 70,
    width: 110,
  },

  brand: {
    color: categoryPalette.butterHoney,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.8,
  },

  heroTitle: {
    color: categoryPalette.white,
    fontSize: 29,
    fontWeight: "900",
    marginTop: 4,
  },

  heroDescription: {
    color: "#EAF1F8",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },

  imageCard: {
    backgroundColor: categoryPalette.white,
    borderColor: categoryPalette.silkyLilac,
    borderRadius: 24,
    borderWidth: 1,
    marginHorizontal: 18,
    marginTop: -22,
    overflow: "hidden",
    padding: 16,
    position: "relative",
  },

  detailImage: {
    height: 225,
    width: "100%",
  },

  offerBadge: {
    alignItems: "center",
    backgroundColor: categoryPalette.butterHoney,
    borderRadius: 12,
    flexDirection: "row",
    gap: 4,
    left: 14,
    paddingHorizontal: 10,
    paddingVertical: 7,
    position: "absolute",
    top: 14,
  },

  offerText: {
    color: categoryPalette.deepBlue,
    fontSize: 9,
    fontWeight: "900",
  },

  mediaStrip: {
    flexGrow: 0,
    marginHorizontal: 18,
    marginTop: 10,
  },

  thumbnail: {
    backgroundColor: categoryPalette.white,
    borderColor: categoryPalette.border,
    borderRadius: 12,
    borderWidth: 1,
    height: 64,
    marginRight: 8,
    width: 64,
  },

  infoCard: {
    backgroundColor: categoryPalette.white,
    borderColor: categoryPalette.border,
    borderRadius: 22,
    borderWidth: 1,
    marginHorizontal: 18,
    marginTop: 16,
    padding: 20,
  },

  eyebrow: {
    color: categoryPalette.dreamyBlue,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.5,
  },

  title: {
    color: categoryPalette.text,
    fontSize: 25,
    fontWeight: "900",
    lineHeight: 31,
    marginTop: 5,
  },

  skuRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    marginTop: 8,
  },

  muted: {
    color: categoryPalette.muted,
    fontSize: 11,
    fontWeight: "600",
  },

  description: {
    color: categoryPalette.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 16,
  },

  divider: {
    backgroundColor: categoryPalette.border,
    height: 1,
    marginVertical: 18,
  },

  priceRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },

  priceLabel: {
    color: categoryPalette.muted,
    fontSize: 10,
    fontWeight: "700",
  },

  price: {
    color: categoryPalette.deepBlue,
    fontSize: 27,
    fontWeight: "900",
    marginTop: 2,
  },

  stockBadge: {
    alignItems: "center",
    backgroundColor: "#EAF7EF",
    borderRadius: 16,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },

  stockBadgeEmpty: {
    backgroundColor: "#FFF0F0",
  },

  stockDot: {
    backgroundColor: "#27845B",
    borderRadius: 5,
    height: 9,
    width: 9,
  },

  stockDotEmpty: {
    backgroundColor: categoryPalette.danger,
  },

  stockText: {
    color: "#27845B",
    fontSize: 10,
    fontWeight: "900",
  },

  stockTextEmpty: {
    color: categoryPalette.danger,
  },

  discountText: {
    color: categoryPalette.muted,
    fontSize: 10,
    marginTop: 8,
  },

  purchaseCard: {
    backgroundColor: categoryPalette.white,
    borderColor: categoryPalette.border,
    borderRadius: 22,
    borderWidth: 1,
    marginHorizontal: 18,
    marginTop: 14,
    padding: 20,
  },

  quantityHeader: {
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "space-between",
  },

  sectionTitle: {
    color: categoryPalette.text,
    fontSize: 20,
    fontWeight: "900",
    marginTop: 2,
  },

  availableText: {
    color: categoryPalette.muted,
    fontSize: 10,
    fontWeight: "700",
  },

  quantityRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    marginTop: 17,
  },

  quantityButton: {
    alignItems: "center",
    backgroundColor: "#F3F6FB",
    borderColor: categoryPalette.silkyLilac,
    borderRadius: 13,
    borderWidth: 1,
    height: 48,
    justifyContent: "center",
    width: 48,
  },

  quantityValue: {
    alignItems: "center",
    backgroundColor: categoryPalette.white,
    borderColor: categoryPalette.border,
    borderRadius: 13,
    borderWidth: 1,
    height: 48,
    justifyContent: "center",
    minWidth: 62,
  },

  quantityText: {
    color: categoryPalette.text,
    fontSize: 17,
    fontWeight: "900",
  },

  quantityInput: {
    backgroundColor: categoryPalette.white,
    borderColor: categoryPalette.border,
    borderRadius: 13,
    borderWidth: 1,
    color: categoryPalette.text,
    fontSize: 17,
    fontWeight: "900",
    height: 48,
    minWidth: 62,
    paddingHorizontal: 8,
    textAlign: "center",
  },

  primaryButton: {
    alignItems: "center",
    backgroundColor: categoryPalette.deepBlue,
    borderRadius: 15,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginTop: 18,
    minHeight: 54,
  },

  primaryText: {
    color: categoryPalette.white,
    fontSize: 13,
    fontWeight: "900",
  },

  successBox: {
    alignItems: "center",
    backgroundColor: "#EAF7EF",
    borderRadius: 12,
    flexDirection: "row",
    gap: 7,
    marginTop: 12,
    padding: 11,
  },

  success: {
    color: "#27845B",
    flex: 1,
    fontSize: 11,
    fontWeight: "700",
  },

  disabled: {
    opacity: 0.45,
  },

  pressed: {
    opacity: 0.8,
  },
});
