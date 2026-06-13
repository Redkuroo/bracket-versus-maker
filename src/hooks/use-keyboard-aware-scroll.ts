import { useCallback, useEffect, useRef } from 'react';
import {
  Dimensions,
  Keyboard,
  Platform,
  type ScrollView,
  type View,
} from 'react-native';

const SCROLL_PADDING = 24;

export function useKeyboardAwareScroll() {
  const scrollRef = useRef<ScrollView>(null);
  const contentRef = useRef<View>(null);
  const scrollYRef = useRef(0);
  const keyboardHeightRef = useRef(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (event) => {
      keyboardHeightRef.current = event.endCoordinates.height;
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      keyboardHeightRef.current = 0;
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleScroll = useCallback((offsetY: number) => {
    scrollYRef.current = offsetY;
  }, []);

  const scrollInputIntoView = useCallback((fieldRef: View | null) => {
    if (!fieldRef || !scrollRef.current) return;

    const delay = Platform.OS === 'ios' ? 120 : 280;

    setTimeout(() => {
      fieldRef.measureInWindow((_x, y, _width, height) => {
        const keyboardHeight = keyboardHeightRef.current;
        if (keyboardHeight <= 0) return;

        const windowHeight = Dimensions.get('window').height;
        const visibleBottom = windowHeight - keyboardHeight - SCROLL_PADDING;
        const fieldBottom = y + height;

        if (fieldBottom > visibleBottom) {
          scrollRef.current?.scrollTo({
            y: scrollYRef.current + (fieldBottom - visibleBottom),
            animated: true,
          });
        }
      });
    }, delay);
  }, []);

  return {
    scrollRef,
    contentRef,
    handleScroll,
    scrollInputIntoView,
  };
}
