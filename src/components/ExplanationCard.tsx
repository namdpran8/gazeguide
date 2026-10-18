import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {TVFocusGuideView} from '@amazon-devices/react-native-kepler';
import {ExplainResponse} from '../types/lesson';

export interface ExplanationCardProps {
  loading: boolean;
  data: ExplainResponse | null;
  error: string | null;
  selectedObjectName?: string;
  onRetry: () => void;
  onDismiss: () => void;
  testID?: string;
}

export const ExplanationCard: React.FC<ExplanationCardProps> = ({
  loading,
  data,
  error,
  selectedObjectName = 'Selected Object',
  onRetry,
  onDismiss,
  testID = 'explanation-card',
}) => {
  return (
    <View style={styles.cardContainer} testID={testID}>
      {/* Header bar */}
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerBadge}>TV TUTOR</Text>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {loading
              ? `Explaining ${selectedObjectName}...`
              : data?.title || selectedObjectName}
          </Text>
        </View>

        {data?.fallback && (
          <View style={styles.fallbackBadge}>
            <Text style={styles.fallbackBadgeText}>OFFLINE / FALLBACK</Text>
          </View>
        )}
      </View>

      {/* Body content */}
      <View style={styles.cardBody}>
        {loading && (
          <View style={styles.centerContainer} testID="explanation-loading">
            <ActivityIndicator size="large" color="#FF6200" />
            <Text style={styles.loadingText}>
              Consulting tutor for {selectedObjectName}...
            </Text>
          </View>
        )}

        {!loading && error && (
          <View style={styles.centerContainer} testID="explanation-error">
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorTitle}>Unable to Load Explanation</Text>
            <Text style={styles.errorMessage}>{error}</Text>
          </View>
        )}

        {!loading && !error && data && (
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            testID="explanation-content">
            {/* Main explanation text */}
            <Text style={styles.explanationText}>{data.explanation}</Text>

            {/* Analogy box */}
            {data.analogy ? (
              <View style={styles.analogyBox}>
                <Text style={styles.analogyLabel}>💡 SIMPLE ANALOGY</Text>
                <Text style={styles.analogyText}>{data.analogy}</Text>
              </View>
            ) : null}

            {/* Follow-up questions */}
            {data.follow_up && data.follow_up.length > 0 && (
              <View style={styles.followUpContainer}>
                <Text style={styles.followUpHeading}>
                  🤔 EXPLORE FURTHER:
                </Text>
                {data.follow_up.map((q, idx) => (
                  <Text key={idx} style={styles.followUpItem}>
                    • {q}
                  </Text>
                ))}
              </View>
            )}

            {/* Source note */}
            {data.source_note ? (
              <Text style={styles.sourceNote}>{data.source_note}</Text>
            ) : null}
          </ScrollView>
        )}
      </View>

      {/* Action buttons (TV Focusable) */}
      <TVFocusGuideView style={styles.cardActions} autoFocus={true}>
        {error ? (
          <Pressable
            style={({focused}) => [
              styles.actionButton,
              styles.retryButton,
              focused && styles.buttonFocused,
            ]}
            onPress={onRetry}
            hasTVPreferredFocus={true}
            accessibilityRole="button"
            accessibilityLabel="Retry loading explanation"
            testID="btn-retry">
            <Text style={styles.actionButtonText}>🔄 Retry</Text>
          </Pressable>
        ) : null}

        <Pressable
          style={({focused}) => [
            styles.actionButton,
            styles.dismissButton,
            focused && styles.buttonFocused,
          ]}
          onPress={onDismiss}
          hasTVPreferredFocus={!error}
          accessibilityRole="button"
          accessibilityLabel="Dismiss explanation and return to scene"
          testID="btn-dismiss">
          <Text style={styles.actionButtonText}>✕ Return to Scene (Back)</Text>
        </Pressable>
      </TVFocusGuideView>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    position: 'absolute',
    right: 48,
    top: 48,
    bottom: 48,
    width: 520,
    backgroundColor: 'rgba(12, 22, 38, 0.94)',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(74, 185, 255, 0.4)',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.8,
    shadowRadius: 16,
    elevation: 20,
    overflow: 'hidden',
    zIndex: 100,
    flexDirection: 'column',
  },
  cardHeader: {
    paddingHorizontal: 24,
    paddingVertical: 18,
    backgroundColor: 'rgba(18, 32, 54, 0.9)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(74, 185, 255, 0.25)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
  },
  headerBadge: {
    color: '#FF6200',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
  },
  fallbackBadge: {
    backgroundColor: 'rgba(255, 179, 0, 0.2)',
    borderColor: '#FFB300',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  fallbackBadgeText: {
    color: '#FFD54F',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  cardBody: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    color: '#DDF4FF',
    fontSize: 18,
    textAlign: 'center',
  },
  errorIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  errorTitle: {
    color: '#FF5252',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    color: '#CFD8DC',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  explanationText: {
    color: '#ECEFF1',
    fontSize: 18,
    lineHeight: 28,
    marginBottom: 16,
  },
  analogyBox: {
    backgroundColor: 'rgba(255, 98, 0, 0.12)',
    borderColor: 'rgba(255, 98, 0, 0.4)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  analogyLabel: {
    color: '#FF9E66',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 6,
  },
  analogyText: {
    color: '#FFF3E0',
    fontSize: 16,
    lineHeight: 24,
    fontStyle: 'italic',
  },
  followUpContainer: {
    backgroundColor: 'rgba(0, 116, 184, 0.15)',
    borderColor: 'rgba(0, 116, 184, 0.4)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  followUpHeading: {
    color: '#64B5F6',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
  },
  followUpItem: {
    color: '#E3F2FD',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 6,
  },
  sourceNote: {
    color: '#78909C',
    fontSize: 12,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: 'rgba(18, 32, 54, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(74, 185, 255, 0.2)',
  },
  actionButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryButton: {
    backgroundColor: '#0074B8',
  },
  dismissButton: {
    backgroundColor: '#37474F',
  },
  buttonFocused: {
    backgroundColor: '#FF6200',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    transform: [{scale: 1.05}],
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
