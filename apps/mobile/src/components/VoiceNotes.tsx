import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Alert, Animated } from 'react-native';
import { Audio } from 'expo-av';
import { api } from '../api';

interface VoiceNotesProps {
  clinicId: string;
  getToken: () => Promise<string | null>;
  onBack: () => void;
}

const MAX_DURATION = 300; // 5 minutes in seconds

const VoiceNotes = ({ clinicId, getToken, onBack }: VoiceNotesProps) => {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [permissionResponse, requestPermission] = Audio.usePermissions();
  const [isRecording, setIsRecording] = useState(false);
  const [processingState, setProcessingState] = useState<'idle' | 'uploading' | 'analyzing' | 'done' | 'error'>('idle');
  const [result, setResult] = useState<any>(null);
  const [duration, setDuration] = useState(0);
  const [lastUri, setLastUri] = useState<string | null>(null);
  
  const animatedProgress = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (recording) {
        recording.stopAndUnloadAsync().catch(() => {});
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Update animated value when progress changes
  const updateProgress = (toValue: number) => {
    Animated.timing(animatedProgress, {
      toValue,
      duration: 500,
      useNativeDriver: false,
    }).start();
  };

  useEffect(() => {
    if (duration >= MAX_DURATION && isRecording) {
      stopRecording();
      Alert.alert("Limit Reached", "Maximum recording time of 5 minutes reached.");
    }
  }, [duration, isRecording]);

  async function startRecording() {
    try {
      if (permissionResponse?.status !== 'granted') {
        const res = await requestPermission();
        if (res.status !== 'granted') return;
      }
      
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync( 
         Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      setIsRecording(true);
      setDuration(0);
      setResult(null);
      setProcessingState('idle');
      setLastUri(null);
      animatedProgress.setValue(0);
      
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

    } catch (err) {
      Alert.alert('Error', 'Failed to start recording');
    }
  }

  async function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!recording) return;
    
    setIsRecording(false);
    setProcessingState('uploading');
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI(); 
    setRecording(null);
    
    if (uri) {
      setLastUri(uri);
      processRecording(uri);
    }
  }

  async function cancelRecording() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (recording) {
      try { await recording.stopAndUnloadAsync(); } catch(e) {}
    }
    setRecording(null);
    setIsRecording(false);
    setDuration(0);
    setProcessingState('idle');
    setLastUri(null);
    animatedProgress.setValue(0);
  }

  async function processRecording(uri: string) {
    setProcessingState('uploading');
    animatedProgress.setValue(0);
    
    try {
        const data = await api.uploadVoiceNote(getToken, clinicId, uri, (percent) => {
          updateProgress(percent);
          if (percent === 100) {
            setProcessingState('analyzing');
          }
        }) as any;
        
        setProcessingState('done');
        setResult(data);

    } catch (err: any) {
        console.error('Processing error:', err);
        setProcessingState('error');
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const ResultSection = ({ title, content }: { title: string, content: any }) => {
      if (!content) return null;
      return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>{title}</Text>
            <Text style={styles.sectionContent}>
                {Array.isArray(content) ? content.join(', ') : content}
            </Text>
        </View>
      );
  };

  const retryAnalysis = () => {
    if (lastUri) {
      processRecording(lastUri);
    }
  };

  const reanalyzeOnly = async () => {
    if (!lastUri) return;
    setProcessingState('analyzing');
    try {
      const data = await api.uploadVoiceNote(getToken, clinicId, lastUri) as any;
      setProcessingState('done');
      setResult(data);
    } catch (err) {
      setProcessingState('error');
    }
  };

  const startNew = () => {
// ... existing startNew logic
    setResult(null);
    setDuration(0);
    setProcessingState('idle');
    setLastUri(null);
    animatedProgress.setValue(0);
  };

  const progressWidth = animatedProgress.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity onPress={onBack} style={styles.backLink}>
        <Text style={styles.backLinkText}>← Back to Dashboard</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={styles.title}>Voice Consultation</Text>
        <Text style={styles.subtitle}>Max 5 minutes</Text>
      </View>

      <View style={styles.recordCard}>
        {/* Timer Display */}
        <Text style={styles.timerText}>{formatTime(duration)}</Text>
        
        {/* Status Text based on State */}
        <Text style={styles.statusText}>
          {isRecording ? 'Recording...' : 
           processingState === 'uploading' ? `Uploading Audio...` :
           processingState === 'analyzing' ? 'Gemini is Analyzing...' :
           processingState === 'error' ? 'Analysis Failed' :
           processingState === 'done' ? 'Success' :
           'Ready to Record'}
        </Text>

        {/* Progress Bar (Only during upload/analyze) */}
        {(processingState === 'uploading' || processingState === 'analyzing') && (
            <View style={styles.progressContainer}>
                <View style={styles.uploadBar}>
                   <Animated.View style={[styles.uploadFill, { width: progressWidth }]} />
                </View>
                {processingState === 'analyzing' && (
                  <View style={styles.analyzingIndicator}>
                    <ActivityIndicator size="small" color="#2563eb" />
                    <Text style={styles.analyzingText}>AI is thinking...</Text>
                  </View>
                )}
            </View>
        )}

        {/* Error Controls */}
        {processingState === 'error' && (
            <View style={styles.errorControls}>
               <TouchableOpacity style={styles.retryBtn} onPress={retryAnalysis}>
                  <Text style={styles.retryText}>↻ Full Retry (Upload & Analyze)</Text>
               </TouchableOpacity>
               
               <TouchableOpacity style={styles.reanalyzeBtn} onPress={reanalyzeOnly}>
                  <Text style={styles.reanalyzeText}>⚡ Re-analyze Only</Text>
               </TouchableOpacity>

               <TouchableOpacity style={styles.rerecordLink} onPress={startNew}>
                  <Text style={styles.rerecordLinkText}>Discard & Record New</Text>
               </TouchableOpacity>
            </View>
        )}

        {/* Idle/Recording Controls */}
        {processingState === 'idle' && (
            <View style={styles.controls}>
                {isRecording ? (
                  <>
                    <TouchableOpacity style={styles.cancelBtn} onPress={cancelRecording}>
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.stopBtn} onPress={stopRecording}>
                      <View style={styles.stopIcon} />
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity style={styles.recordBtn} onPress={startRecording}>
                    <View style={styles.recordIcon} />
                  </TouchableOpacity>
                )}
            </View>
        )}

        {/* Success Controls */}
        {processingState === 'done' && (
           <TouchableOpacity style={styles.rerecordBtn} onPress={startNew}>
              <Text style={styles.rerecordText}>↺ Record New Consultation</Text>
           </TouchableOpacity>
        )}
      </View>

      {/* Results Display */}
      {result && (
          <View style={styles.results}>
              <Text style={styles.resultsHeader}>Clinical Summary</Text>
              <ResultSection title="Symptoms" content={result.symptoms} />
              <ResultSection title="Diagnosis" content={result.diagnosis} />
              <ResultSection title="Treatment Plan" content={result.treatment_plan} />
              <ResultSection title="Notes" content={result.notes} />
          </View>
      )}
      
      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  backLink: {
    marginBottom: 20,
  },
  backLinkText: {
    color: '#2563eb',
    fontWeight: '600',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  recordCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  timerText: {
    fontSize: 48,
    fontWeight: '200',
    color: '#1e293b',
    fontVariant: ['tabular-nums'],
    marginBottom: 10,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 24,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 30,
  },
  recordBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ef4444',
  },
  stopBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopIcon: {
    width: 32,
    height: 32,
    borderRadius: 4,
    backgroundColor: '#1e293b',
  },
  cancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  cancelBtnText: {
    color: '#64748b',
    fontWeight: 'bold',
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  uploadBar: {
    width: '80%',
    height: 8,
    backgroundColor: '#eff6ff',
    borderRadius: 4,
    overflow: 'hidden',
  },
  uploadFill: {
    height: '100%',
    backgroundColor: '#2563eb',
  },
  analyzingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  analyzingText: {
    color: '#2563eb',
    fontWeight: '600',
    fontSize: 13,
  },
  errorControls: {
    alignItems: 'center',
    gap: 16,
  },
  retryBtn: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  reanalyzeBtn: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2563eb',
  },
  reanalyzeText: {
    color: '#2563eb',
    fontWeight: 'bold',
  },
  rerecordLink: {
    padding: 8,
  },
  rerecordLinkText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
  },
  rerecordBtn: {
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  rerecordText: {
    color: '#64748b',
    fontWeight: '600',
  },
  results: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  resultsHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 12,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  sectionContent: {
    fontSize: 15,
    color: '#334155',
    lineHeight: 22,
  }
});

export default VoiceNotes;