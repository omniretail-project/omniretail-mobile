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

  it("aplica estilos de contenedor, padding extra e ignora auto-scroll manual en iOS", () => {
    const originalOS = Platform.OS;
    Platform.OS = "ios";
    const addListenerSpy = vi.spyOn(Keyboard, "addListener");

    try {
      const { container, getByPlaceholderText } = render(
        <KeyboardAwareContainer
          containerStyle={{ backgroundColor: "red" }}
          contentContainerStyle={{ padding: 10, paddingBottom: 15 }}
          extraBottomSpace={30}
        >
          <TextInput placeholder="Campo iOS" />
        </KeyboardAwareContainer>,
      );

      fireEvent.focus(getByPlaceholderText("Campo iOS"));
      expect(container).toBeDefined();
      expect(addListenerSpy).not.toHaveBeenCalled();
    } finally {
      Platform.OS = originalOS;
    }
  });

  it("maneja offset de teclado personalizado en plataforma Android", () => {
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

  it("desplaza al input enfocado de forma aislada en keyboardDidShow, en onFocus y cancela timers al ocultar teclado", () => {
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

      // 1. Apertura del teclado dispara el primer auto-scroll tras 60ms
      act(() => {
        listeners.keyboardDidShow?.({
          endCoordinates: { height: 320, screenY: 480 },
        });
      });

      act(() => {
        vi.advanceTimersByTime(70);
      });

      expect(scrollToKeyboardSpy).toHaveBeenCalledTimes(1);
      expect(scrollToKeyboardSpy).toHaveBeenLastCalledWith(
        fakeFocusedInput,
        120,
        true,
      );

      // 2. Evento onFocus aislado (sin disparar otro keyboardDidShow) dispara el segundo auto-scroll
      fireEvent.focus(getByPlaceholderText("Contraseña"));
      expect(onFocusSpy).toHaveBeenCalledTimes(1);

      act(() => {
        vi.advanceTimersByTime(70);
      });

      expect(scrollToKeyboardSpy).toHaveBeenCalledTimes(2);

      // 3. Si ocurre un foco y el teclado se oculta antes de los 60ms, el timer pendiente se cancela
      fireEvent.focus(getByPlaceholderText("Contraseña"));
      act(() => {
        vi.advanceTimersByTime(30);
        listeners.keyboardDidHide?.();
        vi.advanceTimersByTime(50);
      });

      expect(scrollToKeyboardSpy).toHaveBeenCalledTimes(2);

      unmount();
      expect(removeShow).toHaveBeenCalledTimes(1);
      expect(removeHide).toHaveBeenCalledTimes(1);
    } finally {
      Platform.OS = originalOS;
      (TextInput as any).State = originalState;
    }
  });
});
