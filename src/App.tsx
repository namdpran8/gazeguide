import React, {useState} from 'react';
import {
  Image,
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {TVFocusGuideView} from '@amazon-devices/react-native-kepler';
import {Tile} from './components/Tile';
import {tiles} from './data/tiles';
import {OrbitSceneView} from './scenes/OrbitSceneView';

export interface AppProps {
  initialView?: 'scene' | 'tiles';
}

export const App: React.FC<AppProps> = ({initialView = 'scene'}) => {
  const [currentView, setCurrentView] = useState<'scene' | 'tiles'>(initialView);
  const [focusedTileId, setFocusedTileId] = useState<string>('home');

  const focusedTile = tiles.find((t) => t.id === focusedTileId);

  if (currentView === 'scene') {
    return (
      <OrbitSceneView
        onBack={() => setCurrentView('tiles')}
        testID="app-scene-view"
      />
    );
  }

  return (
    <ImageBackground
      source={require('./assets/background.png')}
      style={styles.background}>
      <View style={styles.headerArea}>
        {focusedTileId === 'home' ? (
          <>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>GazeGuide TV</Text>
              <Text style={styles.headerSubtitle}>
                AI-Powered Interactive Science on your Big Screen 🪐
              </Text>
              <Pressable
                style={({focused}) => [
                  styles.launchLessonButton,
                  focused && styles.launchLessonButtonFocused,
                ]}
                onPress={() => setCurrentView('scene')}
                hasTVPreferredFocus={true}
                accessibilityRole="button"
                accessibilityLabel="Launch Solar System Lesson"
                testID="btn-launch-lesson">
                <Text style={styles.launchLessonText}>
                  ▶ Resume Solar System Lesson
                </Text>
              </Pressable>
            </View>
            <Image
              source={require('./assets/vega.png')}
              style={styles.vegaLogo}
              resizeMode="contain"
              testID="vega-logo"
            />
          </>
        ) : (
          <>
            <View style={styles.headerTextContainer}>
              <Text style={styles.focusedTitle}>{focusedTile?.label}</Text>
            </View>
            {focusedTile?.description && (
              <Text style={styles.focusedDescription}>
                {focusedTile.description}
              </Text>
            )}
          </>
        )}
      </View>

      <TVFocusGuideView style={styles.tileRowContent}>
        {tiles.map((tile) => (
          <Tile
            key={tile.id}
            label={tile.label}
            icon={tile.icon}
            isFocused={focusedTileId === tile.id}
            onFocus={() => setFocusedTileId(tile.id)}
            onBlur={() => {}}
            testID={`tile-${tile.id}`}
            accessibilityLabel={tile.accessibilityLabel}
            hasTVPreferredFocus={false}
          />
        ))}
      </TVFocusGuideView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    paddingHorizontal: 64,
    paddingVertical: 32,
  },
  headerArea: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
    flexShrink: 1,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 56,
    lineHeight: 64,
    fontWeight: '700',
    flexShrink: 1,
  },
  headerSubtitle: {
    color: '#DDF4FF',
    fontSize: 22,
    lineHeight: 30,
    marginTop: 8,
    marginBottom: 20,
    flexShrink: 1,
  },
  launchLessonButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#FF6200',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  launchLessonButtonFocused: {
    backgroundColor: '#FF8533',
    borderColor: '#FFFFFF',
    transform: [{scale: 1.08}],
    elevation: 8,
  },
  launchLessonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  vegaLogo: {
    width: 280,
    height: 200,
    marginLeft: 40,
  },
  focusedTitle: {
    color: '#FFFFFF',
    fontSize: 64,
    lineHeight: 72,
    fontWeight: 'bold',
    flexShrink: 1,
  },
  focusedDescription: {
    color: '#FFFFFF',
    fontSize: 24,
    lineHeight: 32,
    flex: 1,
    marginLeft: 20,
    paddingTop: 10,
  },
  tileRowContent: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
