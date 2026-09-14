import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import UsersScreen from '../screens/UsersScreen';
import ChatScreen from '../screens/ChatScreen';
import ProfileScreen from '../screens/ProfileScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import CallScreen from '../screens/CallScreen';

const Stack = createNativeStackNavigator();

export default function MainNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Users" component={UsersScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} options={{ headerShown: true }} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen
        name="Call"
        component={CallScreen}
        options={{ headerShown: false, animation: 'fade', gestureEnabled: false }}
      />
    </Stack.Navigator>
  );
}
