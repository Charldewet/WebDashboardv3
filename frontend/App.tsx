import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import BottomTabs from './navigation/BottomTabs';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { theme } from './theme';
import 'nativewind/types.d'; // For NativeWind type support

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.cream /* Apply cream background to SafeAreaView */ }}>
          <StatusBar style="dark" backgroundColor={theme.cream} />
          <BottomTabs />
        </SafeAreaView>
      </NavigationContainer>
    </SafeAreaProvider>
  );
} 