// ============================================================
// Sahakari Mobile - Tab Layout
// Bottom navigation with 5 main tabs
// ============================================================

import { Tabs, Redirect } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { Colors, FontSizes } from '@/lib/theme';

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    index: '📊',
    members: '👥',
    savings: '🏦',
    loans: '💰',
    more: '⋯',
  };
  return (
    <Text style={[styles.tabIcon, { opacity: focused ? 1 : 0.5 }]}>
      {icons[name] || '📱'}
    </Text>
  );
}

export default function TabLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: '#e2e8f0',
          height: 60,
          paddingBottom: 8,
          paddingTop: 4,
        },
        tabBarLabelStyle: {
          fontSize: FontSizes.xs,
          fontWeight: '600',
        },
        headerStyle: {
          backgroundColor: Colors.primary,
        },
        headerTintColor: '#ffffff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'ड्यासबोर्ड',
          headerTitle: 'सहकारी प्रणाली',
          tabBarIcon: ({ focused }) => <TabIcon name="index" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="members"
        options={{
          title: 'सदस्य',
          headerTitle: 'सदस्य व्यवस्थापन',
          tabBarIcon: ({ focused }) => <TabIcon name="members" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="savings"
        options={{
          title: 'बचत',
          headerTitle: 'बचत तथा निक्षेप',
          tabBarIcon: ({ focused }) => <TabIcon name="savings" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="loans"
        options={{
          title: 'ऋण',
          headerTitle: 'ऋण व्यवस्थापन',
          tabBarIcon: ({ focused }) => <TabIcon name="loans" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'थप',
          headerTitle: 'थप सुविधाहरू',
          tabBarIcon: ({ focused }) => <TabIcon name="more" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIcon: {
    fontSize: 22,
  },
});
