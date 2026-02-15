import React, { useCallback, useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { ClerkProvider, SignedIn, SignedOut, useAuth, useUser, useOAuth, useSignIn } from '@clerk/clerk-expo';
import * as WebBrowser from 'expo-web-browser';
import PatientTable from './src/components/PatientTable';
import AddPatientForm from './src/components/AddPatientForm';
import PatientDetail from './src/components/PatientDetail';
import VoiceNotes from './src/components/VoiceNotes';
import { Patient } from './src/types';
import { tokenCache } from './src/cache';
import { api } from './src/api';

// Handle OAuth redirects
WebBrowser.maybeCompleteAuthSession();

// Warm up browser for faster OAuth
function useWarmUpBrowser() {
  useEffect(() => {
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);
}

// Replace with your actual publishable key from Clerk Dashboard
const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || "pk_test_ZmFzdC1zbHVnLTIwLmNsZXJrLmFjY291bnRzLmRldiQ";

function AuthScreen() {
  useWarmUpBrowser();
  const { startOAuthFlow } = useOAuth({ strategy: "oauth_google" });
  const { signIn, setActive, isLoaded } = useSignIn();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'email' | 'google'>('email');

  const onGooglePress = useCallback(async () => {
    try {
      setLoading(true);
      const { createdSessionId, setActive: setOAuthActive } = await startOAuthFlow();
      if (createdSessionId) {
        setOAuthActive!({ session: createdSessionId });
      }
    } catch (err) {
      console.error("OAuth error", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const onSignInPress = async () => {
    if (!isLoaded) return;
    setLoading(true);
    try {
      const completeSignIn = await signIn.create({
        identifier: email,
        password,
      });
      await setActive({ session: completeSignIn.createdSessionId });
    } catch (err: any) {
      alert(err.errors?.[0]?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.authContainer}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>IntelliDent</Text>
        <Text style={styles.authSubtitle}>Manage your clinic on the go.</Text>
        
        {mode === 'email' ? (
          <View style={styles.form}>
            <TextInput
              autoCapitalize="none"
              value={email}
              placeholder="Email..."
              onChangeText={(email) => setEmail(email)}
              style={styles.input}
            />
            <TextInput
              value={password}
              placeholder="Password..."
              secureTextEntry={true}
              onChangeText={(password) => setPassword(password)}
              style={styles.input}
            />
            <TouchableOpacity 
              style={[styles.button, loading && styles.buttonDisabled]} 
              onPress={onSignInPress}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign In</Text>}
            </TouchableOpacity>
            
            <TouchableOpacity onPress={() => setMode('google')} style={styles.toggleBtn}>
              <Text style={styles.toggleText}>Or use Google</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.form}>
            <TouchableOpacity 
              style={[styles.button, styles.googleButton, loading && styles.buttonDisabled]} 
              onPress={onGooglePress}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign In with Google</Text>}
            </TouchableOpacity>
            
            <TouchableOpacity onPress={() => setMode('email')} style={styles.toggleBtn}>
              <Text style={styles.toggleText}>Back to Email Sign In</Text>
            </TouchableOpacity>
          </View>
        )}
        
        <Text style={styles.note}>Ensure your credentials match your Clerk account.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function MainDashboard() {
  const { user } = useUser();
  const { signOut, getToken } = useAuth();
  const [clinics, setClinics] = useState<any[]>([]);
  const [selectedClinicId, setSelectedClinicId] = useState<string | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [view, setView] = useState<'list' | 'add' | 'detail' | 'voice'>('list');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);
      const clinicsData = await api.getClinics(getToken);
      setClinics(clinicsData);
      if (clinicsData.length > 0) {
        setSelectedClinicId(clinicsData[0].id.toString());
      } else {
        setError("No clinics found.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load clinics");
    } finally {
      setLoading(false);
    }
  };

  const loadPatients = async () => {
    if (!selectedClinicId) return;
    try {
      setRefreshing(true);
      const patientsData = await api.getPatients(getToken, selectedClinicId);
      setPatients(patientsData);
    } catch (err: any) {
      console.error(err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedClinicId) {
      loadPatients();
    }
  }, [selectedClinicId]);

  const handlePatientSelect = (id: string) => {
    setSelectedPatientId(id);
    setView('detail');
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading Clinics...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadInitialData}>
          <Text style={styles.buttonText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => signOut()} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>IntelliDent</Text>
            <Text style={styles.subtitle}>
              {view === 'list' ? `Welcome, ${user?.firstName || 'Doctor'}` : 
               view === 'add' ? 'New Patient' : 
               view === 'voice' ? 'Voice Notes' : 'Patient Record'}
            </Text>
          </View>
          <View style={styles.headerActions}>
            {view === 'list' && (
              <>
                <TouchableOpacity onPress={() => setView('voice')} style={styles.micBtn}>
                  <Text style={styles.micBtnText}>🎤</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setView('add')} style={styles.addBtn}>
                  <Text style={styles.addBtnText}>+</Text>
                </TouchableOpacity>
              </>
            )}
            {view !== 'list' && (
              <TouchableOpacity onPress={() => setView('list')} style={styles.logoutBtn}>
                <Text style={styles.backBtnHeader}>Back</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => signOut()} style={styles.logoutBtn}>
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>

        {view === 'list' ? (
          <>
            {clinics.length > 1 && (
              <View style={styles.clinicSelector}>
                <Text style={styles.label}>Select Clinic:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.clinicScroll}>
                  {clinics.map((c) => (
                    <TouchableOpacity 
                      key={c.id} 
                      onPress={() => setSelectedClinicId(c.id.toString())}
                      style={[
                        styles.clinicBadge, 
                        selectedClinicId === c.id.toString() && styles.clinicBadgeActive
                      ]}
                    >
                      <Text style={[
                        styles.clinicBadgeText,
                        selectedClinicId === c.id.toString() && styles.clinicBadgeTextActive
                      ]}>{c.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {selectedClinicId ? (
              <View style={{ flex: 1 }}>
                <View style={styles.tableHeader}>
                   <Text style={styles.tableTitle}>Patient Records</Text>
                   {refreshing && <ActivityIndicator size="small" color="#2563eb" />}
                </View>
                <PatientTable patients={patients} onPatientPress={handlePatientSelect} />
              </View>
            ) : (
              <View style={styles.centered}>
                <Text>No clinics found.</Text>
              </View>
            )}
          </>
        ) : view === 'add' ? (
          <AddPatientForm 
            clinicId={selectedClinicId!} 
            getToken={getToken} 
            onSuccess={() => {
              setView('list');
              loadPatients();
            }}
            onCancel={() => setView('list')}
          />
        ) : view === 'voice' ? (
          <VoiceNotes 
            clinicId={selectedClinicId!}
            getToken={getToken}
            onBack={() => setView('list')}
          />
        ) : (
          <PatientDetail 
            patientId={selectedPatientId!}
            clinicId={selectedClinicId!}
            getToken={getToken}
            onBack={() => setView('list')}
          />
        )}
      </View>
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <ClerkProvider tokenCache={tokenCache} publishableKey={CLERK_PUBLISHABLE_KEY}>
      <SignedIn>
        <MainDashboard />
      </SignedIn>
      <SignedOut>
        <AuthScreen />
      </SignedOut>
    </ClerkProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  authContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: '#64748b',
  },
  errorText: {
    color: '#dc3545',
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 20,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    marginTop: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  subtitle: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 4,
  },
  authSubtitle: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 30,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  form: {
    width: '100%',
    maxWidth: 400,
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    backgroundColor: '#f8fafc',
    fontSize: 16,
  },
  toggleBtn: {
    marginTop: 20,
    alignItems: 'center',
  },
  toggleText: {
    color: '#2563eb',
    fontWeight: '600',
  },
  googleButton: {
    backgroundColor: '#db4437',
  },
  button: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    height: 50,
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#93c5fd',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  logoutBtn: {
    padding: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  micBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  micBtnText: {
    fontSize: 18,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: -2,
  },
  logoutText: {
    color: '#dc3545',
    fontWeight: '600',
    fontSize: 14,
  },
  backBtnHeader: {
    color: '#2563eb',
    fontWeight: '600',
    fontSize: 14,
  },
  clinicSelector: {
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#64748b',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  clinicScroll: {
    flexDirection: 'row',
  },
  clinicBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginRight: 8,
  },
  clinicBadgeActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  clinicBadgeText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  clinicBadgeTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  tableTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  note: {
    marginTop: 20,
    fontSize: 12,
    color: '#adb5bd',
    textAlign: 'center',
  }
});