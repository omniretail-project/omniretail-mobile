import Constants, { ExecutionEnvironment } from "expo-constants";
import { router } from "expo-router";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";

import { isApiMode } from "@/infrastructure/api/config";
import { useSession } from "@/modules/auth";
import {
  registerOrderPushDevice,
  unregisterOrderPushDevice,
} from "./orderPushRegistration";

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
  const { session } = useSession();
  const hadSessionRef = useRef(false);

  // Registrar el dispositivo al iniciar o cambiar sesión
  useEffect(() => {
    if (!session || !isApiMode()) {
      return;
    }

    hadSessionRef.current = true;
    void registerOrderPushDevice(session.customerId);
  }, [session]);

  // Desvincular el dispositivo al cerrar sesión
  useEffect(() => {
    if (!session && hadSessionRef.current && isApiMode()) {
      hadSessionRef.current = false;
      void unregisterOrderPushDevice();
    }
  }, [session]);

  // Abrir el pedido al tocar una notificación
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
      // Entornos donde el módulo nativo no esté disponible
    }
  }, []);

  return null;
}
