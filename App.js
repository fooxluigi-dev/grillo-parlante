import React, { useState, useEffect, useCallback } from 'react';
import { SafeAreaView, StatusBar, ActivityIndicator, View, Modal, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { supabase } from './utils/supabase';
import TopoBackground from './components/TopoBackground';

import HomeScreen from './screens/HomeScreen';
import TripsScreen from './screens/TripsScreen';
import ChatScreen from './screens/ChatScreen';
import ProfileScreen from './screens/ProfileScreen';
import TripDetailScreen from './screens/TripDetailScreen';
import LoginScreen from './screens/LoginScreen';
import LandingScreen from './screens/LandingScreen';
import { AuthContext } from './context/AuthContext';
import { Colors } from './theme/colors';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TAB_ICONS = {
  Home: { focused: '🏠', unfocused: '🏡' },
  Trips: { focused: '✈️', unfocused: '🗺️' },
  Chat: { focused: '💬', unfocused: '🦗' },
  Profile: { focused: '👤', unfocused: '🙋' },
};

function TabNavigator({ pendingBooking, onPendingBookingConsumed }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => {
          const icons = TAB_ICONS[route.name];
          return (
            <View style={{
              width: 32, height: 32, borderRadius: 16,
              backgroundColor: focused ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.15)',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{ fontSize: 16 }}>{focused ? icons.focused : icons.unfocused}</Text>
            </View>
          );
        },
        tabBarActiveTintColor: '#fff',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.7)',
        tabBarStyle: { backgroundColor: Colors.terra, borderTopWidth: 0, paddingTop: 4, paddingBottom: 4, height: 60 },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600', color: '#fff' },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home">
        {(props) => (
          <HomeScreen
            {...props}
            pendingBooking={pendingBooking}
            onPendingBookingConsumed={onPendingBookingConsumed}
          />
        )}
      </Tab.Screen>
      <Tab.Screen name="Trips" component={TripsScreen} />
      <Tab.Screen name="Chat" component={ChatScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(false);

  // On mount: check existing session + listen to auth changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setIsLoading(false);
    }).catch(() => {
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription?.unsubscribe();
  }, []);

  const currentUser = session?.user ? {
    email: session.user.email,
    name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
    id: session.user.id,
  } : null;

  const isLoggedIn = !!session;
  const [loginMode, setLoginMode] = useState('signin'); // 'signin' | 'signup'
  // Booking parsed on the Landing screen (signed-out flow): survives the
  // sign-up/login switch so HomeScreen can run the quiz + itinerary generation.
  const [pendingBooking, setPendingBooking] = useState(null);

  // Sign up / Sign in with Supabase
  const login = useCallback(async ({ email, password, name, isSignUp }) => {
    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      });
      if (error) throw error;
      // After signup, user needs to verify email OR is auto-confirmed
      // We'll auto sign them in for now
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    }
    setShowLogin(false);
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={Colors.gold} />
      </SafeAreaView>
    );
  }

  return (
    <AuthContext.Provider value={{ isLoggedIn, currentUser, login, logout }}>
      <View style={{ flex: 1, backgroundColor: 'transparent', position: 'relative' }}>
        <TopoBackground opacity={0.2} />
        <SafeAreaView style={{ flex: 1 }}>
          <StatusBar barStyle="dark-content" backgroundColor={Colors.bg} />
          <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            {isLoggedIn ? (
              <>
              <Stack.Screen name="Main">
                {() => (
                  <TabNavigator
                    pendingBooking={pendingBooking}
                    onPendingBookingConsumed={() => setPendingBooking(null)}
                  />
                )}
              </Stack.Screen>
              <Stack.Screen name="TripDetail" component={TripDetailScreen} />
              </>
            ) : (
              <Stack.Screen name="Landing">
                {() => (
                  <LandingScreen
                    onLogin={() => { setLoginMode('signin'); setShowLogin(true); }}
                    onSignUp={() => { setLoginMode('signup'); setShowLogin(true); }}
                    onBookingPending={setPendingBooking}
                  />
                )}
              </Stack.Screen>
            )}
          </Stack.Navigator>
        </NavigationContainer>

        {/* Login Modal — signup by default (user just arrived from the upload flow) */}
        <Modal visible={showLogin} animationType="slide" transparent={true} onRequestClose={() => setShowLogin(false)}>
          <LoginScreen onLogin={login} onClose={() => setShowLogin(false)} initialMode={loginMode} />
        </Modal>
      </SafeAreaView>
      </View>
    </AuthContext.Provider>
  );
}
