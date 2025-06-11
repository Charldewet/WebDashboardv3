import React from 'react';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { Login } from './src/components/Login';
import BottomTabs from './navigation/BottomTabs';
import { theme } from './theme';

function AppContent() {
  const { isAuthenticated, logout } = useAuth();

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="absolute top-4 right-4 z-50">
        <button
          onClick={logout}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium"
        >
          Logout
        </button>
      </div>
      <main className="container mx-auto px-4 py-8">
        <BottomTabs />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
} 