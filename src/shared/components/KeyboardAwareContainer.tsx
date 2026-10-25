import React, { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ScrollViewProps,
  StyleProp,
  StyleSheet,
  TextInput,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export interface KeyboardAwareContainerProps extends ScrollViewProps {
  children?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  extraBottomSpace?: number;
  focusScrollOffset?: number;
  keyboardVerticalOffset?: number;
}

export const KeyboardAwareContainer = forwardRef<
  ScrollView,
  KeyboardAwareContainerProps
>(function KeyboardAwareContainer(
  {
    children,
    containerStyle,
    contentContainerStyle,
    extraBottomSpace = 40,
    focusScrollOffset = 110,
    keyboardVerticalOffset,
    onFocus,
    style,
    ...rest
  },
  ref,
) {
  const insets = useSafeAreaInsets();
  const insetsBottom = insets?.bottom ?? 0;
  const scrollViewRef = useRef<ScrollView | null>(null);
  const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const setRefs = useCallback(
    (node: ScrollView | null) => {
      scrollViewRef.current = node;
      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    },
    [ref],
  );

  const scrollToFocusedInput = useCallback(() => {
    const focusedInput = TextInput.State?.currentlyFocusedInput?.();
    const scrollResponder = scrollViewRef.current as
      | (ScrollView & {
          scrollResponderScrollNativeHandleToKeyboard?: (
            nodeHandle: unknown,
            additionalOffset?: number,
            preventNegativeScrollOffset?: boolean,
          ) => void;
        })
      | null;

    if (
      focusedInput &&
      typeof scrollResponder?.scrollResponderScrollNativeHandleToKeyboard ===
        "function"
    ) {
      scrollResponder.scrollResponderScrollNativeHandleToKeyboard(
        focusedInput,
        focusScrollOffset,
        true,
      );
    }
  }, [focusScrollOffset]);

  const scheduleFocusScroll = useCallback(() => {
    if (focusTimerRef.current) {
      clearTimeout(focusTimerRef.current);
    }
    focusTimerRef.current = setTimeout(() => {
      scrollToFocusedInput();
    }, 60);
  }, [scrollToFocusedInput]);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSubscription = Keyboard?.addListener?.(showEvent, (event) => {
      const nextHeight = Math.max(0, event?.endCoordinates?.height ?? 0);
      setKeyboardHeight(nextHeight);
      scheduleFocusScroll();
    });

    const hideSubscription = Keyboard?.addListener?.(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      if (focusTimerRef.current) {
        clearTimeout(focusTimerRef.current);
      }
      showSubscription?.remove?.();
      hideSubscription?.remove?.();
    };
  }, [scheduleFocusScroll]);

  const defaultOffset =
    keyboardVerticalOffset ?? (Platform.OS === "ios" ? 20 : 0);

  const basePaddingBottom =
    (StyleSheet.flatten(contentContainerStyle)?.paddingBottom as number) || 0;

  const androidKeyboardPadding = Platform.OS === "android" ? keyboardHeight : 0;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={defaultOffset}
      style={[styles.keyboardAvoiding, containerStyle]}
    >
      <ScrollView
        ref={setRefs}
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={[
          contentContainerStyle,
          {
            paddingBottom:
              basePaddingBottom +
              insetsBottom +
              extraBottomSpace +
              androidKeyboardPadding,
          },
        ]}
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "none"}
        keyboardShouldPersistTaps="handled"
        onFocus={(event) => {
          onFocus?.(event);
          scheduleFocusScroll();
        }}
        showsVerticalScrollIndicator={false}
        style={[styles.scroll, style]}
        {...rest}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
});

const styles = StyleSheet.create({
  keyboardAvoiding: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
});
