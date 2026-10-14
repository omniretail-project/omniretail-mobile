import Constants, { ExecutionEnvironment } from "expo-constants";
import { router } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";

const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

function openNotificationOrder(response: any) {
  const orderId = response?.notification?.request?.content?.data?.orderId;

  if (typeof orderId !== "string" || !orderId.trim()) {
    return;
  }

  router.push({
    pathname: "/(protected)/orders/[id]",
    params: {
      id: orderId.startsWith("api:") ? orderId : `api:${orderId}`,
    },
  });
}

export function NotificationNavigationHandler() {
  useEffect(() => {
    if (isExpoGo || Platform.OS === "web") {
      return;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Notifications = require("expo-notifications");
      const subscription =
        Notifications.addNotificationResponseReceivedListener(
          openNotificationOrder,
        );

      void Notifications.getLastNotificationResponseAsync().then(
        (response: any) => {
          if (response) {
            openNotificationOrder(response);
          }
        },
      );

      return () => {
        subscription.remove();
      };
    } catch {
      // In environments where expo-notifications native module is missing
    }
  }, []);

  return null;
}
