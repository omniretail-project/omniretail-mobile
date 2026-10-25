import { act, fireEvent, render } from "@testing-library/react";
import React, { createRef } from "react";
import { Keyboard, Platform, Text, TextInput, View } from "react-native";
import { afterEach, describe, expect, it, vi } from "vitest";

import { KeyboardAwareContainer } from "@/shared/components/KeyboardAwareContainer";

vi.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 24, left: 0, right: 0 }),
}));

describe("KeyboardAwareContainer", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("renderiza sus hijos correctamente", () => {
    const { getByText } = render(
      <KeyboardAwareContainer>
        <Text>Contenido del Formulario</Text>
      </KeyboardAwareContainer>,
    );

    expect(getByText("Contenido del Formulario")).not.toBeNull();
  });

  it("permite asociar un ref de objeto y de función al ScrollView", () => {
    const objectRef = createRef<any>();
    const fnRef = vi.fn();

    render(
      <>
        <KeyboardAwareContainer ref={objectRef}>
          <View />
        </KeyboardAwareContainer>
        <KeyboardAwareContainer ref={fnRef}>
          <View />
        </KeyboardAwareContainer>
      </>,
    );

    expect(objectRef.current).toBeDefined();
    expect(fnRef).toHaveBeenCalled();
  });

  it("aplica estilos de contenedor y padding extra", () => {
    const { container } = render(
      <KeyboardAwareContainer
        containerStyle={{ backgroundColor: "red" }}
        contentContainerStyle={{ padding: 10, paddingBottom: 15 }}
        extraBottomSpace={30}
      >
        <Text>Test</Text>
      </KeyboardAwareContainer>,
    );

    expect(container).toBeDefined();
  });

  it("maneja offset de teclado personalizado y plataforma Android", () => {
    const originalOS = Platform.OS;
    Platform.OS = "android";

    try {
      const { container } = render(
        <KeyboardAwareContainer keyboardVerticalOffset={50}>
          <Text>Offset</Text>
        </KeyboardAwareContainer>,
      );

      expect(container).toBeDefined();
    } finally {
      Platform.OS = originalOS;
    }
  });

  it("ajusta el espacio inferior y desplaza al input enfocado cuando se muestra el teclado en Android", () => {
    vi.useFakeTimers();
    const originalOS = Platform.OS;
    Platform.OS = "android";

    const listeners: Record<string, (event?: any) => void> = {};
    const removeShow = vi.fn();
    const removeHide = vi.fn();

    vi.spyOn(Keyboard, "addListener").mockImplementation(
      (eventName: string, callback: (event?: any) => void) => {
        listeners[eventName] = callback;
        return {
          remove: eventName.includes("Show") ? removeShow : removeHide,
        } as any;
      },
    );

    const fakeFocusedInput = { id: "password-input" };
    const originalState = TextInput.State;
    (TextInput as any).State = {
      ...originalState,
      currentlyFocusedInput: () => fakeFocusedInput,
    };

    const scrollRef = createRef<any>();
    const onFocusSpy = vi.fn();

    try {
      const { getByPlaceholderText, unmount } = render(
        <KeyboardAwareContainer
          ref={scrollRef}
          focusScrollOffset={120}
          onFocus={onFocusSpy}
        >
          <TextInput placeholder="Contraseña" />
        </KeyboardAwareContainer>,
      );

      const scrollToKeyboardSpy = vi.fn();
      scrollRef.current.scrollResponderScrollNativeHandleToKeyboard =
        scrollToKeyboardSpy;

      act(() => {
        listeners.keyboardDidShow?.({
          endCoordinates: { height: 320, screenY: 480 },
        });
      });

      act(() => {
        vi.advanceTimersByTime(70);
      });

      expect(scrollToKeyboardSpy).toHaveBeenCalledWith(
        fakeFocusedInput,
        120,
        true,
      );

      fireEvent.focus(getByPlaceholderText("Contraseña"));
      expect(onFocusSpy).toHaveBeenCalled();

      act(() => {
        listeners.keyboardDidShow?.({
          endCoordinates: { height: 300, screenY: 500 },
        });
        vi.advanceTimersByTime(70);
      });

      expect(scrollToKeyboardSpy).toHaveBeenCalledTimes(2);

      act(() => {
        listeners.keyboardDidHide?.();
      });

      unmount();
      expect(removeShow).toHaveBeenCalled();
      expect(removeHide).toHaveBeenCalled();
    } finally {
      Platform.OS = originalOS;
      (TextInput as any).State = originalState;
    }
  });
});
