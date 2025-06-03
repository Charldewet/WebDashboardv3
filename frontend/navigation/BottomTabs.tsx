import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import DailyScreen from '../screens (IGNORE THESE)/DailyScreen';
import MonthlyScreen from '../screens (IGNORE THESE)/MonthlyScreen';
import YearlyScreen from '../screens (IGNORE THESE)/YearlyScreen';
import StockScreen from '../screens (IGNORE THESE)/StockScreen';
import { theme } from '../theme'; // Import your theme

// You might want to import icons here, e.g., from @expo/vector-icons
// import { Ionicons } from '@expo/vector-icons'; 

const Tab = createBottomTabNavigator();

export default function BottomTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: theme.avocado, // Active tab color
        tabBarInactiveTintColor: theme.textDark, // Inactive tab color
        tabBarStyle: {
          backgroundColor: theme.cream, // Background color of the tab bar
          // borderTopColor: theme.clayRed, // Optional: border color
        },
        headerStyle: {
          backgroundColor: theme.cream, // Background color of the header
        },
        headerTintColor: theme.textDark, // Color of header text and icons
        headerTitleStyle: {
          // fontWeight: 'bold', // Optional: if you want bold titles
        },
        // tabBarIcon: ({ focused, color, size }) => {
        //   let iconName;
        //   if (route.name === 'Daily') {
        //     iconName = focused ? 'ios-today' : 'ios-today-outline';
        //   } else if (route.name === 'Monthly') {
        //     iconName = focused ? 'ios-calendar' : 'ios-calendar-outline';
        //   } else if (route.name === 'Yearly') {
        //     iconName = focused ? 'ios-analytics' : 'ios-analytics-outline';
        //   } else if (route.name === 'Stock') {
        //     iconName = focused ? 'ios-cube' : 'ios-cube-outline';
        //   }
        //   // return <Ionicons name={iconName} size={size} color={color} />;
        // },
      })}
    >
      <Tab.Screen name="Daily" component={DailyScreen} />
      <Tab.Screen name="Monthly" component={MonthlyScreen} />
      <Tab.Screen name="Yearly" component={YearlyScreen} />
      <Tab.Screen name="Stock" component={StockScreen} />
    </Tab.Navigator>
  );
} 