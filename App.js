import React, { useState, useEffect, useCallback } from 'react';
import { SafeAreaView, StatusBar, ActivityIndicator, View, Modal, Text, Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Linking from 'expo-linking';
import { supabase, INITIAL_URL } from './utils/supabase';
import TopoBackground from './components/TopoBackground';

import HomeScreen from './screens/HomeScreen';
import TripsScreen from './screens/TripsScreen';
import ChatScreen from './screens/ChatScreen';
import ProfileScreen from './screens/ProfileScreen';
import TripDetailScreen from './screens/TripDetailScreen';
import LoginScreen from './screens/LoginScreen';
import ResetPasswordScreen from './screens/ResetPasswordScreen';
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
  // True when Supabase requires email confirmation and the user must check
  // their inbox before the session starts. LoginScreen shows a "check email"
  // state instead of closing silently with the user still logged out.
  const [needsVerification, setNeedsVerification] = useState(false);
  // True when the user arrived via a "recover password" deep link / email link.
  const [showResetPassword, setShowResetPassword] = useState(false);
  // Email used at signup (for the "check your inbox" resend button).
  const [lastSignupEmail, setLastSignupEmail] = useState('');

  // Deep links for the web flow: Supabase appends #access_token=...&type=recovery
  // to the redirect URL. detectSessionInUrl handles the token; we only need to
  // react to the PASSWORD_RECOVERY event (see onAuthStateChange below).
  useEffect(() => {
    const sub = supabase.auth.onAuthStateChange((event, sess) => {
      setSession(sess);
      if (event === 'PASSWORD_RECOVERY') {
        // Recovery link: open the reset screen and do NOT close it on the
        // SIGNED_IN that follows (the recovery flow produces a signed-in
        // temporary session). It closes only on save or user dismiss.
        setShowLogin(false);
        setShowResetPassword(true);
      }
      if (event === 'SIGNED_IN') {
        setNeedsVerification(false);
        setShowLogin(false);
      }
      if (event === 'SIGNED_OUT') {
        setNeedsVerification(false);
        setShowResetPassword(false);
      }
    });
    return () => sub?.data?.subscription?.unsubscribe?.();
  }, []);

  // Robust recovery-link handling (deterministic, no event-order reliance).
// When the user clicks the reset-password email link, Supabase redirects to
// the app with #access_token=...&type=recovery. We parse those tokens OURSELVES
// and call setSession() explicitly, then open the reset screen. This works
// even when the SDK's detectSessionInUrl / PASSWORD_RECOVERY event ordering is
// unreliable (which is exactly what we observed on React Native Web).
useEffect(() => {
  const fragment = INITIAL_URL.includes('#')
    ? INITIAL_URL.slice(INITIAL_URL.indexOf('#'))
    : '';

  const isRecovery = fragment.includes('type=recovery');

  async function applyRecovery() {
    const params = new URLSearchParams(fragment.replace(/^#/, ''));
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const expiresAt = Number(params.get('expires_at')) || 0;
    if (accessToken && refreshToken) {
      try {
        await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        await supabase.auth.refreshSession?.(undefined); // ensure token is fresh
      } catch (e) {
        // ignore — reset screen still opens; updateUser will surface any error
      }
    }
    // Open the reset screen in all cases a recovery link was used.
    setShowLogin(false);
    setNeedsVerification(false);
    setShowResetPassword(true);
  }

  const checkInitialUrl = () => {
    // Web: fragment was captured before supabase-js could strip the hash.
    if (INITIAL_URL && isRecovery) {
      setTimeout(applyRecovery, 300);
      return;
    }
    // Native: ask expo-linking for the launch URL.
    Linking.getInitialURL().then((url) => {
      if (url && /[#&]type=recovery/.test(url)) {
        setTimeout(() => setShowResetPassword(true), 300);
      }
    }).catch(() => {});
  };
  checkInitialUrl();
  const listener = Linking.addEventListener('url', ({ url }) => {
    if (url && /[#&]type=recovery/.test(url)) {
      setShowLogin(false);
      setShowResetPassword(true);
    }
  });
  return () => listener.remove();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

  // Sign up / Sign in with Supabase.
  // On signup, if Supabase requires email confirmation the returned session is
  // null: we leave the LoginScreen open in "verify your email" mode instead of
  // pretending the user is logged in.
  const login = useCallback(async ({ email, password, name, isSignUp }) => {
    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      });
      if (error) throw error;
      if (data?.session) {
        // Auto-confirmed (email confirmation disabled on the project): logged in.
        setNeedsVerification(false);
        setShowLogin(false);
      } else {
        // Email confirmation required: keep the modal open and tell the user.
        setLastSignupEmail(email);
        setNeedsVerification(true);
      }
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    setShowLogin(false);
  }, []);

  // Re-send the confirmation email for the signup flow.
  const resendVerification = useCallback(async (email) => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: Linking.createURL('/') },
    });
    if (error) throw error;
  }, []);

  // Send the "reset your password" email.
  const requestPasswordReset = useCallback(async (email) => {
    const redirect = Linking.createURL('/');
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirect,
    });
    if (error) throw error;
  }, []);

  // Apply a new password (called from ResetPasswordScreen after the user
  // followed the recovery link).
  const updatePassword = useCallback(async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
    setShowResetPassword(false);
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
          <LoginScreen
            onLogin={login}
            onClose={() => { setShowLogin(false); setNeedsVerification(false); }}
            initialMode={loginMode}
            needsVerification={needsVerification}
            verificationEmail={lastSignupEmail}
            onResendVerification={resendVerification}
            onForgotPassword={requestPasswordReset}
          />
        </Modal>

        {/* Reset Password Modal — shown after the user follows the recovery link */}
        <Modal visible={showResetPassword} animationType="slide" transparent={true} onRequestClose={() => setShowResetPassword(false)}>
          <ResetPasswordScreen
            onUpdatePassword={updatePassword}
            onClose={() => setShowResetPassword(false)}
          />
        </Modal>
      </SafeAreaView>
      </View>
    </AuthContext.Provider>
  );
}
