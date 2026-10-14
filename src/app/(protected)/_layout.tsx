import { Redirect, Stack } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { useSession } from "@/modules/auth";
import { CheckoutProvider } from "@/modules/checkout";
import { colors } from "@/theme";

export default function ProtectedLayout() {
  const { isAuthenticated, isLoading } = useSession();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <CheckoutProvider>
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="products/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="favorites" options={{ title: "Favoritos" }} />
      <Stack.Screen name="notifications" options={{ headerShown: false }} />
      <Stack.Screen name="checkout/delivery" options={{ headerShown: false }} />
      <Stack.Screen name="checkout/payment" options={{ headerShown: false }} />
      <Stack.Screen name="checkout/review" options={{ headerShown: false }} />
      <Stack.Screen name="checkout/success" options={{ headerShown: false }} />
      <Stack.Screen name="orders/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="addresses/index" options={{ headerShown: false }} />
      <Stack.Screen name="addresses/new" options={{ headerShown: false }} />
      <Stack.Screen name="addresses/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="account/security" options={{ headerShown: false }} />
      <Stack.Screen name="account/payment-methods" options={{ headerShown: false }} />
      <Stack.Screen name="account/new-payment-method" options={{ headerShown: false }} />
      <Stack.Screen name="branches/index" options={{ headerShown: false }} />
      <Stack.Screen name="branches/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="support/index" options={{ headerShown: false }} />
    </Stack>
    </CheckoutProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: "center",
  },
});
