import React, {useCallback, useEffect, useState} from 'react';
import {BackHandler, Pressable, StyleSheet, Text, View} from 'react-native';
import {TVFocusGuideView} from '@amazon-devices/react-native-kepler';
import {ExplanationCard} from '../components/ExplanationCard';
import {HotspotLayer} from '../components/HotspotLayer';
import {explainObject} from '../services/api';
import {ApiState, Scene, SelectedObject} from '../types/lesson';

export const ORBIT_SCENE_02: Scene = {
  scene_id: 'orbit-scene-02',
  timestamp_seconds: 18.5,
  title: 'Earth orbiting the Sun',
  description: 'An illustration showing Earth orbiting the Sun.',
  objects: [
    {
      id: 'earth',
      label: 'Planet Earth',
      description:
        'Our home planet in steady orbital revolution around the Sun.',
      region: [0.33, 0.48, 0.37, 0.54],
    },
    {
      id: 'sun',
      label: 'The Sun',
      description:
        'The central star whose gravitational force continuously accelerates Earth towards the center, curving its trajectory.',
      region: [0.46, 0.41, 0.55, 0.57],
    },
    {
      id: 'earth-orbit',
      label: "Earth's orbit",
      description:
        'Earth moves around the Sun under the influence of gravity.',
      region: [0.33, 0.28, 0.67, 0.82],
    },
    {
      id: 'inner-orbit',
      label: 'Inner Planet Orbit',
      description:
        'An inner orbital track closer to the Sun with higher orbital velocity.',
      region: [0.38, 0.34, 0.62, 0.73],
    },
  ],
};

export const SCENE_BACKDROP_SOURCE = require('../assets/frame_18_500s.jpg');

export interface OrbitSceneViewProps {
  lessonId?: string;
  scene?: Scene;
  onBack?: () => void;
  apiBaseUrl?: string;
  testID?: string;
}

export const OrbitSceneView: React.FC<OrbitSceneViewProps> = ({
  lessonId = 'solar-system-01',
  scene = ORBIT_SCENE_02,
  onBack,
  apiBaseUrl,
  testID = 'orbit-scene-view',
}) => {
  const [focusedObject, setFocusedObject] = useState<SelectedObject | null>(
    scene.objects.find((o) => o.id === 'earth') || scene.objects[0],
  );
  const [selectedObject, setSelectedObject] = useState<SelectedObject | null>(
    null,
  );
  const [showExplanation, setShowExplanation] = useState<boolean>(false);
  const [apiState, setApiState] = useState<ApiState>({
    loading: false,
    data: null,
    error: null,
  });

  const requestExplanation = useCallback(
    async (obj: SelectedObject) => {
      setSelectedObject(obj);
      setShowExplanation(true);
      setApiState({loading: true, data: null, error: null});

      try {
        const response = await explainObject(
          {
            lesson_id: lessonId,
            scene_id: scene.scene_id,
            selected_object_id: obj.id,
            question: `Explain ${obj.label} and its motion in this scene.`,
          },
          {baseUrl: apiBaseUrl},
        );

        setApiState({
          loading: false,
          data: response,
          error: null,
        });
      } catch (err: any) {
        setApiState({
          loading: false,
          data: null,
          error: err?.message || 'An unexpected error occurred.',
        });
      }
    },
    [lessonId, scene.scene_id, apiBaseUrl],
  );

  const handleSelectObject = (obj: SelectedObject) => {
    if (apiState.loading) return;
    requestExplanation(obj);
  };

  const handleRetry = () => {
    if (selectedObject) {
      requestExplanation(selectedObject);
    }
  };

  const handleDismissExplanation = () => {
    setShowExplanation(false);
  };

  useEffect(() => {
    if (!BackHandler || typeof BackHandler.addEventListener !== 'function') {
      return;
    }

    const backAction = () => {
      if (showExplanation) {
        setShowExplanation(false);
        return true; 
      }
      if (onBack) {
        onBack();
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction,
    );
    return () => {
      if (backHandler && typeof backHandler.remove === 'function') {
        backHandler.remove();
      }
    };
  }, [showExplanation, onBack]);

  return (
    <View style={styles.container} testID={testID}>
      {/* Top HUD Header */}
      <View style={styles.topHud}>
        <TVFocusGuideView style={styles.hudActions} autoFocus={false}>
          {onBack && (
            <Pressable
              style={({focused}) => [
                styles.hudBackButton,
                focused && styles.hudBackButtonFocused,
              ]}
              onPress={onBack}
              accessibilityRole="button"
              accessibilityLabel="Back to main menu"
              testID="btn-scene-back">
              <Text style={styles.hudBackText}>← Menu</Text>
            </Pressable>
          )}
        </TVFocusGuideView>

        <View style={styles.hudTitleContainer}>
          <Text style={styles.hudLessonTag}>LESSON: {lessonId.toUpperCase()}</Text>
          <Text style={styles.hudTitle} numberOfLines={1}>
            {scene.title} ({scene.timestamp_seconds}s)
          </Text>
        </View>

        <View style={styles.hudStatusTag}>
          <Text style={styles.hudStatusText}>
            Target: <Text style={styles.boldText}>Planet Earth</Text>
          </Text>
        </View>
      </View>

      <View style={styles.sceneContainer}>
        <HotspotLayer
          imageSource={SCENE_BACKDROP_SOURCE}
          objects={scene.objects}
          focusedObjectId={focusedObject?.id}
          selectedObjectId={selectedObject?.id}
          preferredFocusId="earth"
          onFocusObject={(obj) => setFocusedObject(obj)}
          onSelectObject={handleSelectObject}
          disabled={apiState.loading}
          testID="scene-hotspot-layer"
        />

        {showExplanation && (
          <ExplanationCard
            loading={apiState.loading}
            data={apiState.data}
            error={apiState.error}
            selectedObjectName={selectedObject?.label}
            onRetry={handleRetry}
            onDismiss={handleDismissExplanation}
            testID="scene-explanation-card"
          />
        )}
      </View>


      <View style={styles.bottomHud}>
        <Text style={styles.bottomHintText}>
          🎮 <Text style={styles.boldText}>D-Pad</Text> to highlight hotspot •{' '}
          <Text style={styles.boldText}>[Select]</Text> to explain •{' '}
          <Text style={styles.boldText}>[Back]</Text> to dismiss
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050B14',
    flexDirection: 'column',
  },
  topHud: {
    height: 72,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    backgroundColor: 'rgba(8, 16, 30, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(74, 185, 255, 0.2)',
    zIndex: 20,
  },
  hudActions: {
    marginRight: 20,
  },
  hudBackButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  hudBackButtonFocused: {
    backgroundColor: '#FF6200',
    borderColor: '#FFFFFF',
    transform: [{scale: 1.05}],
  },
  hudBackText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  hudTitleContainer: {
    flex: 1,
  },
  hudLessonTag: {
    color: '#00B0FF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  hudTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  hudStatusTag: {
    backgroundColor: 'rgba(0, 230, 118, 0.15)',
    borderColor: '#00E676',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  hudStatusText: {
    color: '#B9F6CA',
    fontSize: 13,
  },
  sceneContainer: {
    flex: 1,
    position: 'relative',
  },
  bottomHud: {
    height: 44,
    backgroundColor: 'rgba(5, 11, 20, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(74, 185, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    zIndex: 20,
  },
  bottomHintText: {
    color: '#90A4AE',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  boldText: {
    fontWeight: 'bold',
    color: '#ECEFF1',
  },
});
