import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Device from "expo-device";
import { Platform } from "react-native";

import { ApiTokenStorage } from "@/infrastructure/api/auth/ApiTokenStorage";
import { createApiClient } from "@/infrastructure/api/createApiClient";
import { isApiMode } from "@/infrastructure/api/config";
import { SecureKeyValueStorage } from "@/infrastructure/storage";

import { configureSystemNotifications } from "./systemNotifications";

const tokenStorage = new ApiTokenStorage(new SecureKeyValueStorage());
const client = createApiClient(() => tokenStorage.getToken());

let activeCustomerId: string | null = null;
let registeredToken: string | null = null;
let registrationVersion = 0;

async function obtainExpoToken(): Promise<string | null> {
  if (
    !isApiMode() ||
    !Device.isDevice ||
    Platform.OS === "web" ||
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient
  ) {
    return null;
  }

  const projectId =
    Constants.easConfig?.projectId ??
    Constants.expoConfig?.extra?.eas?.projectId;

  if (!projectId) {
    console.warn("[Push] Falta configurar el proyecto EAS.");
    return null;
  }

  const granted = await configureSystemNotifications();

  if (!granted) {
    return null;
  }

  const Notifications = require("expo-notifications");

  const result = await Notifications.getExpoPushTokenAsync({
    projectId,
  });

  return result.data;
}

export async function registerOrderPushDevice(
  customerId: string,
): Promise<void> {
  if (!isApiMode()) {
    return;
  }

  if (activeCustomerId !== customerId) {
    registrationVersion++;
    registeredToken = null;
    activeCustomerId = customerId;
  }

  const version = registrationVersion;

  try {
    const token = await obtainExpoToken();

    if (
      !token ||
      version !== registrationVersion ||
      activeCustomerId !== customerId
    ) {
      return;
    }

    if (registeredToken === token) {
      return;
    }

    await client.post<void>("/customer/push-devices", {
      token,
      platform: Platform.OS,
    });

    if (
      version === registrationVersion &&
      activeCustomerId === customerId
    ) {
      registeredToken = token;
      console.info("[Push] Dispositivo registrado.");
    }
  } catch (error) {
    console.warn("[Push] Error al registrar dispositivo:", error);
  }
}

export async function unregisterOrderPushDevice(): Promise<void> {
  registrationVersion++;
  activeCustomerId = null;

  const previousToken = registeredToken;
  registeredToken = null;

  if (!isApiMode()) {
    return;
  }

  try {
    const token = previousToken ?? (await obtainExpoToken());

    if (!token) {
      return;
    }

    await client.request<void>("/customer/push-devices", {
      method: "DELETE",
      body: { token },
    });

    console.info("[Push] Dispositivo desactivado.");
  } catch (error) {
    console.warn("[Push] No se pudo desactivar dispositivo:", error);
  }
}
