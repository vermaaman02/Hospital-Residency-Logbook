/**
 * Font loader hook — wraps `expo-font` + Google Fonts packages.
 *
 * Required dependencies (install once):
 *   npx expo install expo-font \
 *     @expo-google-fonts/outfit \
 *     @expo-google-fonts/plus-jakarta-sans \
 *     @expo-google-fonts/jetbrains-mono
 *
 * Usage (in `app/_layout.tsx`):
 *   const fontsReady = useThemeFonts();
 *   if (!fontsReady) return null; // or splash
 */

import { useFonts } from "expo-font";
import {
	Outfit_700Bold,
	Outfit_800ExtraBold,
} from "@expo-google-fonts/outfit";
import {
	PlusJakartaSans_400Regular,
	PlusJakartaSans_500Medium,
	PlusJakartaSans_700Bold,
} from "@expo-google-fonts/plus-jakarta-sans";
import { JetBrainsMono_400Regular } from "@expo-google-fonts/jetbrains-mono";

export function useThemeFonts(): boolean {
	const [loaded] = useFonts({
		Outfit_700Bold,
		Outfit_800ExtraBold,
		PlusJakartaSans_400Regular,
		PlusJakartaSans_500Medium,
		PlusJakartaSans_700Bold,
		JetBrainsMono_400Regular,
	});
	return loaded;
}
