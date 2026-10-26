import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const bottomInset = Platform.OS === "android"
    ? Math.max(insets.bottom, 24)
    : insets.bottom;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,

        tabBarActiveTintColor: "#3E668F",
        tabBarInactiveTintColor: "#687286",

        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
          marginTop: 0,
        },

        tabBarIconStyle: {
          marginTop: 1,
        },

        tabBarStyle: {
          backgroundColor: "#E7E8F8",
          borderTopColor: "#AAB4E7",
          borderTopWidth: 1,
          height: 58 + bottomInset,
          paddingBottom: 5 + bottomInset,
          paddingTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Inicio",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              color={color}
              name={focused ? "home" : "home-outline"}
              size={20}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="categories"
        options={{
          title: "Categorías",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              color={color}
              name={focused ? "grid" : "grid-outline"}
              size={20}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="cart"
        options={{
          title: "Carrito",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              color={color}
              name={focused ? "cart" : "cart-outline"}
              size={20}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="orders"
        options={{
          title: "Pedidos",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              color={color}
              name={focused ? "receipt" : "receipt-outline"}
              size={20}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="account"
        options={{
          title: "Cuenta",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              color={color}
              name={focused ? "person" : "person-outline"}
              size={20}
            />
          ),
        }}
      />
    </Tabs>
  );
}
