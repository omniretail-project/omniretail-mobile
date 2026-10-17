import { Link, router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  ApiError,
  DEMO_RESET_CODE,
  getErrorMessage,
  isApiMode,
  useRepositories,
} from "@/infrastructure";
import { radius, spacing, typography } from "@/theme";

import { useSession } from "../hooks/useSession";
import {
  validateEmail,
  validateNewPassword,
  validatePasswordConfirmation,
  validateRequiredPassword,
} from "../validation";

export function LoginScreen() {
  const { completeMfaLogin, login } = useSession();
  const params = useLocalSearchParams<{ reason?: string }>();
  const [email, setEmail] = useState(
    isApiMode() ? "" : "cliente@demo.com",
  );
  const [password, setPassword] = useState(
    isApiMode() ? "" : "Demo1234",
  );
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(true);
  const [mfaChallenge, setMfaChallenge] = useState<{
    challengeToken: string;
    method: "email" | "totp";
  } | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    let navigated = false;
    const validationError =
      validateEmail(email) ?? validateRequiredPassword(password);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const result = await login({
        email: email.trim(),
        password,
        rememberMe,
      });

      if ("kind" in result && result.kind === "mfaRequired") {
        setMfaChallenge(result);
        return;
      }

      navigated = true;
      setIsSubmitting(false);
      router.replace("/(protected)/(tabs)");
      return;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setError("Correo o contraseña incorrectos.");
      } else {
        setError(getErrorMessage(error, "No se pudo iniciar sesión."));
      }
    } finally {
      if (!navigated) {
        setIsSubmitting(false);
      }
    }
  }

  async function handleMfaSubmit() {
    let navigated = false;
    if (!mfaChallenge || !mfaCode.trim()) {
      setError("Ingresa el código de verificación.");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await completeMfaLogin(mfaChallenge.challengeToken, mfaCode.trim());
      navigated = true;
      setIsSubmitting(false);
      router.replace("/(protected)/(tabs)");
    } catch (error) {
      setError(getErrorMessage(error, "No se pudo verificar el código."));
      setMfaCode("");
    } finally {
      if (!navigated) {
        setIsSubmitting(false);
      }
    }
  }

  if (mfaChallenge) {
    return (
      <AuthForm
        title="Verificación en dos pasos"
        subtitle={
          mfaChallenge.method === "email"
            ? "Te enviamos un código de verificación a tu correo."
            : "Ingresa el código de tu aplicación autenticadora."
        }
        error={error}
      >
        <AuthTextInput
          keyboardType="number-pad"
          label="Código de verificación"
          onChangeText={(value) => setMfaCode(value.replace(/\D/g, "").slice(0, 6))}
          placeholder="123456"
          value={mfaCode}
        />
        <PrimaryButton
          disabled={isSubmitting || mfaCode.length < 6}
          label="Verificar"
          loading={isSubmitting}
          onPress={handleMfaSubmit}
        />
        <Pressable
          disabled={isSubmitting}
          onPress={() => {
            setError(null);
            setMfaCode("");
            setMfaChallenge(null);
          }}
          style={styles.backHomeButton}
        >
          <Text style={styles.backHomeText}>Volver al inicio de sesión</Text>
        </Pressable>
      </AuthForm>
    );
  }

  return (
    <AuthForm
      title="Bienvenido de nuevo"
      subtitle="Ingresa tus datos para continuar."
      error={error}
      message={
        infoMessage ??
        (params.reason === "cart"
          ? "Para comprar en la app, inicia sesión o regístrate para acceder a promociones exclusivas."
          : null)
      }
    >
      <AuthTextInput
        autoCapitalize="none"
        keyboardType="email-address"
        label="Correo electrónico"
        onChangeText={setEmail}
        placeholder="tu@correo.com"
        value={email}
      />
      <AuthTextInput
        label="Contraseña"
        onChangeText={setPassword}
        placeholder="Ingresa tu contraseña"
        secureTextEntry
        value={password}
      />

      <View style={styles.loginActions}>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: rememberMe }}
          onPress={() => setRememberMe((current) => !current)}
          style={styles.rememberMe}
        >
          <View style={[styles.checkbox, rememberMe ? styles.checkboxChecked : null]}>
            {rememberMe ? <Ionicons color={palette.white} name="checkmark" size={14} /> : null}
          </View>
          <Text style={styles.rememberMeText}>Recordarme</Text>
        </Pressable>

        <Link href="/(auth)/forgot-password" asChild>
          <Pressable style={styles.forgotPasswordButton}>
            <Text style={styles.forgotPasswordText}>¿Olvidaste tu contraseña?</Text>
          </Pressable>
        </Link>
      </View>

      <PrimaryButton
        disabled={isSubmitting}
        label="Iniciar sesión"
        loading={isSubmitting}
        onPress={handleSubmit}
      />

      <View style={styles.separator}>
        <View style={styles.separatorLine} />
        <Text style={styles.separatorText}>O CONTINÚA CON</Text>
        <View style={styles.separatorLine} />
      </View>

      <Pressable
        onPress={() => setInfoMessage("El inicio de sesión con Google no está disponible actualmente.")}
        style={({ pressed }) => [styles.googleButton, pressed ? styles.buttonPressed : null]}
      >
        <Text style={styles.googleIcon}>G</Text>
        <Text style={styles.googleButtonText}>Google</Text>
      </Pressable>

      <View style={styles.registrationRow}>
        <Text style={styles.registrationText}>¿No tienes cuenta? </Text>
        <Link href="/(auth)/register" style={styles.registrationLink}>Regístrate</Link>
      </View>

      {isApiMode() ? (
        <InlineLink href="/(auth)/verify-email" label="Verificar mi correo" />
      ) : null}

      <Link href="/" asChild>
        <Pressable style={styles.backHomeButton}>
          <Text style={styles.backHomeText}>Volver al inicio</Text>
        </Pressable>
      </Link>
    </AuthForm>
  );
}

export function RegisterScreen() {
  const { register } = useSession();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    const validationError =
      (!name.trim() ? "El nombre es requerido." : null) ??
      validateEmail(email) ??
      (phone && !/^\d{8}$/.test(phone) ? "El teléfono debe tener 8 dígitos." : null) ??
      validateRequiredPassword(password) ??
      validatePasswordConfirmation(password, confirmPassword);

    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setMessage(null);
    setIsSubmitting(true);
    try {
      const result = await register({
        name: name.trim(),
        email: email.trim(),
        phone: phone || undefined,
        password,
      });

      if (result.kind === "authenticated") {
        router.replace("/(protected)/(tabs)");
        return;
      }

      setMessage(
        result.message ??
          "Revisa tu correo para continuar con la verificación.",
      );
    } catch (error) {
      setError(getErrorMessage(error, "No se pudo crear la cuenta."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthForm
      title="Registro"
      subtitle="Crea tu cuenta para comenzar a comprar."
      error={error}
      message={message}
    >
      <AuthTextInput label="Nombre" onChangeText={setName} value={name} />
      <AuthTextInput
        autoCapitalize="none"
        keyboardType="email-address"
        label="Correo"
        onChangeText={setEmail}
        value={email}
      />
      <AuthTextInput
        keyboardType="phone-pad"
        label="Telefono (opcional, 8 digitos)"
        onChangeText={(value) => setPhone(value.replace(/\D/g, "").slice(0, 8))}
        value={phone}
      />
      <AuthTextInput
        label="Contrasena"
        onChangeText={setPassword}
        secureTextEntry
        value={password}
      />
      <AuthTextInput
        label="Confirmar contrasena"
        onChangeText={setConfirmPassword}
        secureTextEntry
        value={confirmPassword}
      />
      <PrimaryButton
        disabled={isSubmitting}
        label="Crear cuenta"
        loading={isSubmitting}
        onPress={handleSubmit}
      />
      {message ? (
        <InlineLink
          href={{ pathname: "/(auth)/verify-email", params: { email } }}
          label="Verificar mi correo"
        />
      ) : null}
      <InlineLink href="/(auth)/login" label="Ya tengo cuenta" />
    </AuthForm>
  );
}

export function VerifyEmailScreen() {
  const { authRepository } = useRepositories();
  const params = useLocalSearchParams<{ token?: string; email?: string }>();
  const [token, setToken] = useState(params.token ?? "");
  const [email, setEmail] = useState(params.email ?? "");
  const [resendSeconds, setResendSeconds] = useState(0);
  const [isResending, setIsResending] = useState(false);
  const resendLock = useRef(false);
  const resendAvailableAt = useRef(0);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (resendSeconds <= 0) return;

    const interval = setInterval(() => {
      setResendSeconds(
        Math.max(0, Math.ceil(
          (resendAvailableAt.current - Date.now()) / 1000
        ))
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [resendSeconds]);

  async function handleResend() {
    if (resendLock.current ||
        Date.now() < resendAvailableAt.current) return;

    const validationError = validateEmail(email.trim());
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!authRepository.resendVerificationEmail) {
      setError("El reenvío no está disponible en modo demo.");
      return;
    }

    resendLock.current = true;
    setIsResending(true);
    setError(null);
    setMessage(null);

    try {
      const responseMessage =
        await authRepository.resendVerificationEmail(email.trim());

      resendAvailableAt.current = Date.now() + 30000;
      setResendSeconds(30);
      setMessage(responseMessage ||
        "Si el correo es válido, te enviamos un mensaje para continuar.");
    } catch (error) {
      setError(getErrorMessage(error, "No se pudo reenviar el enlace."));
    } finally {
      resendLock.current = false;
      setIsResending(false);
    }
  }

  async function handleSubmit() {
    if (!token.trim()) {
      setError("Pega el enlace o el token que recibiste por correo.");
      return;
    }

    if (!authRepository.verifyEmail) {
      setError("La verificación de correo no aplica en modo demo.");
      return;
    }

    setError(null);
    setMessage(null);
    setIsSubmitting(true);
    try {
      await authRepository.verifyEmail(token);
      setMessage("Correo verificado. Ya puedes iniciar sesión.");
    } catch (error) {
      setError(getErrorMessage(error, "No se pudo verificar el correo."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthForm
      title="Verificar correo"
      subtitle="Pega el enlace completo del correo de verificación (o solo el token)."
      error={error}
      message={message}
    >
      <AuthTextInput
        autoCapitalize="none"
        label="Enlace o token"
        onChangeText={setToken}
        value={token}
      />
      <PrimaryButton
        disabled={isSubmitting}
        label="Verificar"
        loading={isSubmitting}
        onPress={handleSubmit}
      />
      <AuthTextInput
        autoCapitalize="none"
        keyboardType="email-address"
        label="Correo para reenviar enlace"
        onChangeText={setEmail}
        placeholder="tu@correo.com"
        value={email}
      />
      <PrimaryButton
        disabled={isResending || resendSeconds > 0}
        label={
          resendSeconds > 0
            ? `Reenviar enlace (${resendSeconds}s)`
            : "Reenviar enlace"
        }
        loading={isResending}
        onPress={handleResend}
      />
      <InlineLink href="/(auth)/login" label="Ir a iniciar sesion" />
    </AuthForm>
  );
}

export function ForgotPasswordScreen() {
  const { authRepository } = useRepositories();
  const [email, setEmail] = useState(isApiMode() ? "" : "cliente@demo.com");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    const validationError = validateEmail(email);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setMessage(null);
    setIsSubmitting(true);
    try {
      await authRepository.requestPasswordReset({ email: email.trim() });
      setMessage(
        isApiMode()
          ? "Si existe una cuenta con ese correo, recibirás un enlace para restablecer tu contraseña."
          : `Recuperacion simulada solicitada. Codigo de demostracion: ${DEMO_RESET_CODE}`,
      );
    } catch (error) {
      setError(getErrorMessage(error, "No se pudo solicitar la recuperación."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthForm
      title="Recuperar contrasena"
      subtitle="Recupera el acceso a tu cuenta."
      error={error}
      message={message}
    >
      <AuthTextInput
        autoCapitalize="none"
        keyboardType="email-address"
        label="Correo"
        onChangeText={setEmail}
        value={email}
      />
      <PrimaryButton
        disabled={isSubmitting}
        label={isApiMode() ? "Enviar enlace" : "Solicitar codigo"}
        loading={isSubmitting}
        onPress={handleSubmit}
      />
      <InlineLink
        href={{ pathname: "/(auth)/reset-password", params: { email } }}
        label="Continuar a reset"
      />
    </AuthForm>
  );
}

export function ResetPasswordScreen() {
  const { authRepository } = useRepositories();
  const apiMode = isApiMode();
  const params = useLocalSearchParams<{ email?: string; token?: string }>();
  const [email, setEmail] = useState(
    params.email ?? (apiMode ? "" : "cliente@demo.com"),
  );
  const [code, setCode] = useState(params.token ?? (apiMode ? "" : DEMO_RESET_CODE));
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    const validationError =
      (apiMode ? null : validateEmail(email)) ??
      (!code.trim()
        ? apiMode
          ? "Pega el enlace o el token del correo."
          : "El codigo es requerido."
        : null) ??
      validateRequiredPassword(password) ??
      validatePasswordConfirmation(password, confirmPassword);

    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setMessage(null);
    setIsSubmitting(true);
    try {
      await authRepository.resetPassword({
        email: email.trim(),
        code: code.trim(),
        newPassword: password,
      });
      setMessage("Contrasena actualizada. Ya puedes iniciar sesion.");
      router.replace("/(auth)/login");
    } catch (error) {
      setError(
        apiMode
          ? getErrorMessage(error, "No se pudo restablecer la contraseña.")
          : "El codigo no es valido.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthForm
      title="Restablecer contrasena"
      subtitle="Define una nueva contraseña para tu cuenta."
      error={error}
      message={message}
    >
      {apiMode ? (
        <AuthTextInput
          autoCapitalize="none"
          label="Enlace o token del correo"
          onChangeText={setCode}
          value={code}
        />
      ) : (
        <>
          <Text style={styles.helpText}>
            Codigo de demostracion: {DEMO_RESET_CODE}
          </Text>
          <AuthTextInput
            autoCapitalize="none"
            keyboardType="email-address"
            label="Correo"
            onChangeText={setEmail}
            value={email}
          />
          <AuthTextInput
            keyboardType="number-pad"
            label="Codigo"
            onChangeText={setCode}
            value={code}
          />
        </>
      )}
      <AuthTextInput
        label="Nueva contrasena"
        onChangeText={setPassword}
        secureTextEntry
        value={password}
      />
      <AuthTextInput
        label="Confirmar contrasena"
        onChangeText={setConfirmPassword}
        secureTextEntry
        value={confirmPassword}
      />
      <PrimaryButton
        disabled={isSubmitting}
        label="Restablecer"
        loading={isSubmitting}
        onPress={handleSubmit}
      />
    </AuthForm>
  );
}

export function ChangePasswordScreen() {
  const { authRepository } = useRepositories();
  const { session } = useSession();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    const validationError = validateNewPassword(
      currentPassword,
      newPassword,
      confirmPassword,
    );
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!session) {
      setError("Necesitas iniciar sesion.");
      return;
    }

    setError(null);
    setMessage(null);
    setIsSubmitting(true);
    try {
      await authRepository.changePassword({
        userId: session.userId,
        currentPassword,
        newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage("Contrasena actualizada.");
    } catch (error) {
      setError(
        isApiMode()
          ? getErrorMessage(error, "No se pudo cambiar la contraseña.")
          : "La contrasena actual es incorrecta.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthForm
      title="Seguridad"
      subtitle="Actualiza la seguridad de tu cuenta."
      error={error}
      message={message}
      showBackButton
    >
      <AuthTextInput
        label="Contrasena actual"
        onChangeText={setCurrentPassword}
        secureTextEntry
        value={currentPassword}
      />
      <AuthTextInput
        label="Nueva contrasena"
        onChangeText={setNewPassword}
        secureTextEntry
        value={newPassword}
      />
      <AuthTextInput
        label="Confirmar contrasena"
        onChangeText={setConfirmPassword}
        secureTextEntry
        value={confirmPassword}
      />
      <PrimaryButton
        disabled={isSubmitting}
        label="Cambiar contrasena"
        loading={isSubmitting}
        onPress={handleSubmit}
      />
    </AuthForm>
  );
}

type AuthFormProps = {
  children: ReactNode;
  error?: string | null;
  message?: string | null;
  showBackButton?: boolean;
  subtitle: string;
  title: string;
};

function AuthForm({
  children,
  error,
  message,
  showBackButton = false,
  subtitle,
  title,
}: AuthFormProps) {
  return (
    <ScrollView
      automaticallyAdjustKeyboardInsets
      contentContainerStyle={[styles.scrollContent, { paddingBottom: 60 }]}
      keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.decorativeCircleTop} />
      <View style={styles.decorativeCircleBottom} />

      <View style={styles.authWrapper}>
        {showBackButton ? (
          <Pressable
            accessibilityLabel="Volver"
            hitSlop={8}
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.authBackButton,
              pressed ? styles.authBackButtonPressed : null,
            ]}
          >
            <Text style={styles.authBackButtonText}>←</Text>
          </Pressable>
        ) : null}

        <View style={styles.brandArea}>
          <View style={styles.logoBox}>
            <Text style={styles.logoIcon}>✦</Text>
          </View>

          <Text style={styles.brandName}>MARJYM</Text>
          <Text style={styles.brandSubtitle}>TU TIENDA, MÁS CERCA DE TI</Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.title}>{title}</Text>

          <Text style={styles.formSubtitle}>{subtitle}</Text>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.error}>{error}</Text>
            </View>
          ) : null}

          {message ? (
            <View style={styles.messageBox}>
              <Text style={styles.message}>{message}</Text>
            </View>
          ) : null}

          <View style={styles.form}>{children}</View>
        </View>

        <Text style={styles.footerText}>
          Compra fácil, segura y desde cualquier lugar.
        </Text>
      </View>
    </ScrollView>
  );
}

type AuthTextInputProps = {
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  keyboardType?: "default" | "email-address" | "number-pad" | "phone-pad";
  label: string;
  onChangeText(value: string): void;
  placeholder?: string;
  secureTextEntry?: boolean;
  value: string;
};

function AuthTextInput({ label, placeholder, secureTextEntry, ...inputProps }: AuthTextInputProps) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>

      <View style={styles.inputContainer}>
        <TextInput
          placeholder={placeholder ?? label}
          placeholderTextColor="#8290A5"
          style={styles.input}
          secureTextEntry={secureTextEntry && !isPasswordVisible}
          {...inputProps}
        />

        {secureTextEntry ? (
          <Pressable
            accessibilityLabel={isPasswordVisible ? "Ocultar contraseña" : "Mostrar contraseña"}
            hitSlop={8}
            onPress={() => setIsPasswordVisible((current) => !current)}
            style={styles.passwordVisibilityButton}
          >
            <Ionicons
              color={palette.dreamyBlue}
              name={isPasswordVisible ? "eye-off-outline" : "eye-outline"}
              size={21}
            />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

type PrimaryButtonProps = {
  disabled?: boolean;
  label: string;
  loading?: boolean;
  onPress(): void;
};

function PrimaryButton({
  disabled,
  label,
  loading,
  onPress,
}: PrimaryButtonProps) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        pressed && !disabled ? styles.buttonPressed : null,
        disabled ? styles.buttonDisabled : null,
      ]}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <Text style={styles.buttonText}>{label}</Text>
      )}
    </Pressable>
  );
}

type InlineLinkProps = {
  href: React.ComponentProps<typeof Link>["href"];
  label: string;
};

function InlineLink({ href, label }: InlineLinkProps) {
  return (
    <Link href={href} asChild>
      <Pressable
        style={({ pressed }) => [
          styles.linkButton,
          pressed ? styles.linkButtonPressed : null,
        ]}
      >
        <Text style={styles.link}>{label}</Text>
      </Pressable>
    </Link>
  );
}

const palette = {
  deepBlue: "#3E668F",
  dreamyBlue: "#81A9EE",
  silkyLilac: "#AAB4E7",
  butterHoney: "#FFDB83",
  vanillaMilk: "#FFF2D0",
  white: "#FFFFFF",
  text: "#172033",
  muted: "#687286",
  danger: "#C2413B",
  success: "#1E8E5A",
};

const styles = StyleSheet.create({
  scrollContent: {
    backgroundColor: palette.vanillaMilk,
    flexGrow: 1,
    justifyContent: "center",
    minHeight: "100%",
    overflow: "hidden",
    paddingBottom: spacing.xl + spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },

  decorativeCircleTop: {
    backgroundColor: palette.silkyLilac,
    borderRadius: 120,
    height: 210,
    opacity: 0.35,
    position: "absolute",
    right: -80,
    top: -70,
    width: 210,
  },

  decorativeCircleBottom: {
    backgroundColor: palette.butterHoney,
    borderRadius: 100,
    bottom: -70,
    height: 190,
    left: -80,
    opacity: 0.35,
    position: "absolute",
    width: 190,
  },

  authWrapper: {
    alignSelf: "center",
    maxWidth: 480,
    width: "100%",
  },

  authBackButton: {
    alignItems: "center",
    backgroundColor: palette.white,
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    marginBottom: spacing.md,
    width: 44,
  },

  authBackButtonPressed: {
    opacity: 0.72,
  },

  authBackButtonText: {
    color: palette.deepBlue,
    fontSize: 24,
    fontWeight: "700",
    lineHeight: 26,
  },

  brandArea: {
    alignItems: "center",
    marginBottom: spacing.lg,
  },

  logoBox: {
    alignItems: "center",
    backgroundColor: palette.deepBlue,
    borderRadius: radius.lg,
    height: 58,
    justifyContent: "center",
    marginBottom: spacing.sm,
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    width: 58,
    elevation: 5,
  },

  logoIcon: {
    color: palette.butterHoney,
    fontSize: 30,
    fontWeight: "800",
  },

  brandName: {
    color: palette.deepBlue,
    fontSize: 29,
    fontWeight: "900",
    letterSpacing: -0.5,
  },

  brandSubtitle: {
    color: palette.muted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.6,
    marginTop: 2,
  },

  formCard: {
    backgroundColor: palette.white,
    borderColor: palette.silkyLilac,
    borderRadius: 22,
    borderWidth: 1,
    padding: spacing.lg,
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },

  title: {
    color: palette.text,
    fontSize: typography.title,
    fontWeight: "900",
    textAlign: "center",
  },

  formSubtitle: {
    color: palette.muted,
    fontSize: typography.caption,
    lineHeight: 19,
    marginBottom: spacing.lg,
    marginTop: spacing.xs,
    textAlign: "center",
  },

  form: {
    gap: spacing.md,
    width: "100%",
  },

  field: {
    gap: spacing.xs,
  },

  label: {
    color: palette.deepBlue,
    fontSize: typography.caption,
    fontWeight: "800",
  },

  inputContainer: {
    backgroundColor: "#FAFBFD",
    borderColor: palette.silkyLilac,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
  },

  input: {
    color: palette.text,
    fontSize: typography.body,
    minHeight: 52,
    paddingHorizontal: spacing.md,
    flex: 1,
  },

  passwordVisibilityButton: {
    alignItems: "center",
    height: 48,
    justifyContent: "center",
    width: 48,
  },

  loginActions: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: -2,
  },

  rememberMe: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },

  checkbox: {
    alignItems: "center",
    borderColor: palette.muted,
    borderRadius: 3,
    borderWidth: 1,
    height: 19,
    justifyContent: "center",
    width: 19,
  },

  checkboxChecked: {
    backgroundColor: palette.deepBlue,
    borderColor: palette.deepBlue,
  },

  rememberMeText: {
    color: palette.text,
    fontSize: 12,
  },

  forgotPasswordButton: {
    paddingVertical: 4,
  },

  forgotPasswordText: {
    color: palette.deepBlue,
    fontSize: 12,
    fontWeight: "800",
  },

  separator: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },

  separatorLine: {
    backgroundColor: palette.silkyLilac,
    flex: 1,
    height: 1,
  },

  separatorText: {
    color: palette.muted,
    fontSize: 10,
  },

  googleButton: {
    alignItems: "center",
    backgroundColor: palette.white,
    borderColor: palette.silkyLilac,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 9,
    justifyContent: "center",
    minHeight: 52,
  },

  googleIcon: {
    color: "#4285F4",
    fontSize: 20,
    fontWeight: "900",
  },

  googleButtonText: {
    color: palette.deepBlue,
    fontSize: typography.body,
    fontWeight: "800",
  },

  registrationRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 4,
  },

  registrationText: {
    color: palette.muted,
    fontSize: 12,
  },

  registrationLink: {
    color: palette.deepBlue,
    fontSize: 12,
    fontWeight: "900",
  },

  backHomeButton: {
    alignItems: "center",
    minHeight: 26,
  },

  backHomeText: {
    color: palette.deepBlue,
    fontSize: 12,
    fontWeight: "800",
  },

  button: {
    alignItems: "center",
    backgroundColor: palette.deepBlue,
    borderRadius: 12,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: spacing.md,
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },

  buttonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },

  buttonDisabled: {
    opacity: 0.55,
  },

  buttonText: {
    color: palette.white,
    fontSize: typography.body,
    fontWeight: "800",
  },

  linkButton: {
    alignItems: "center",
    borderRadius: radius.md,
    justifyContent: "center",
    minHeight: 38,
  },

  linkButtonPressed: {
    backgroundColor: palette.vanillaMilk,
  },

  link: {
    color: palette.deepBlue,
    fontSize: typography.body,
    fontWeight: "700",
    textAlign: "center",
  },

  errorBox: {
    backgroundColor: "#FFF2F1",
    borderColor: "#E8A9A5",
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.md,
    padding: spacing.sm,
  },

  error: {
    color: palette.danger,
    fontSize: typography.caption,
    fontWeight: "600",
    textAlign: "center",
  },

  messageBox: {
    backgroundColor: "#EFFAF5",
    borderColor: "#A7D8C1",
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.md,
    padding: spacing.sm,
  },

  message: {
    color: palette.success,
    fontSize: typography.caption,
    fontWeight: "600",
    textAlign: "center",
  },

  helpText: {
    backgroundColor: palette.vanillaMilk,
    borderRadius: radius.md,
    color: palette.deepBlue,
    fontSize: typography.caption,
    fontWeight: "700",
    padding: spacing.sm,
    textAlign: "center",
  },

  footerText: {
    color: palette.deepBlue,
    fontSize: typography.caption,
    fontWeight: "600",
    marginTop: spacing.lg,
    opacity: 0.8,
    textAlign: "center",
  },
});
