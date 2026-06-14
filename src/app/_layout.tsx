import { useEffect } from 'react';
import { Pressable } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Drawer } from 'expo-router/drawer';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  useFonts,
  SourceSans3_400Regular,
  SourceSans3_600SemiBold,
  SourceSans3_700Bold,
} from '@expo-google-fonts/source-sans-3';

import { DrawerContent } from '@/components/DrawerContent';
import { SessionsProvider } from '@/context/SessionsContext';
import { SettingsProvider } from '@/context/SettingsContext';
import { Colors, Font, Spacing } from '@/constants/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    SourceSans3_400Regular,
    SourceSans3_600SemiBold,
    SourceSans3_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SettingsProvider>
        <SessionsProvider>
          <StatusBar style="dark" />
          <Drawer
            drawerContent={(props) => <DrawerContent navigation={props.navigation} />}
            screenOptions={{
              headerStyle: { backgroundColor: Colors.background },
              headerShadowVisible: false,
              headerTintColor: Colors.text,
              headerTitleStyle: { fontFamily: Font.semibold, fontSize: 18 },
              sceneStyle: { backgroundColor: Colors.background },
              drawerType: 'front',
            }}>
            <Drawer.Screen name="index" options={{ title: 'Madad' }} />
            <Drawer.Screen
              name="settings"
              options={{
                title: 'Settings',
                // Replace the hamburger with a back arrow on Settings.
                headerLeft: () => (
                  <Pressable
                    onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
                    hitSlop={12}
                    style={{ paddingHorizontal: Spacing.md }}>
                    <Ionicons name="chevron-back" size={24} color={Colors.text} />
                  </Pressable>
                ),
                swipeEnabled: false,
              }}
            />
          </Drawer>
        </SessionsProvider>
      </SettingsProvider>
    </GestureHandlerRootView>
  );
}
