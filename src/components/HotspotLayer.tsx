import React, {useState} from 'react';
import {
  Image,
  ImageSourcePropType,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {TVFocusGuideView} from '@amazon-devices/react-native-kepler';
import {SelectedObject} from '../types/lesson';

export interface HotspotLayerProps {
  imageSource: ImageSourcePropType;
  objects: SelectedObject[];
  focusedObjectId?: string | null;
  selectedObjectId?: string | null;
  preferredFocusId?: string;
  onFocusObject?: (object: SelectedObject) => void;
  onSelectObject: (object: SelectedObject) => void;
  imageAspectRatio?: number; // width / height, e.g. 16/9
  disabled?: boolean;
  testID?: string;
}

export const HotspotLayer: React.FC<HotspotLayerProps> = ({
  imageSource,
  objects,
  focusedObjectId,
  selectedObjectId,
  preferredFocusId = 'earth',
  onFocusObject,
  onSelectObject,
  imageAspectRatio = 16 / 9,
  disabled = false,
  testID = 'hotspot-layer',
}) => {
  const [containerSize, setContainerSize] = useState<{
    width: number;
    height: number;
  } | null>(null);

  const handleLayout = (event: LayoutChangeEvent) => {
    const {width, height} = event.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setContainerSize({width, height});
    }
  };

  // Compute exact displayed image dimensions within container
  let renderWidth = 0;
  let renderHeight = 0;
  let offsetX = 0;
  let offsetY = 0;

  if (containerSize) {
    const containerAspect = containerSize.width / containerSize.height;
    if (containerAspect > imageAspectRatio) {
      // Container is wider than image aspect ratio -> pillarboxed (bars on sides)
      renderHeight = containerSize.height;
      renderWidth = containerSize.height * imageAspectRatio;
      offsetX = (containerSize.width - renderWidth) / 2;
      offsetY = 0;
    } else {
      // Container is taller than image aspect ratio -> letterboxed (bars on top/bottom)
      renderWidth = containerSize.width;
      renderHeight = containerSize.width / imageAspectRatio;
      offsetX = 0;
      offsetY = (containerSize.height - renderHeight) / 2;
    }
  }

  return (
    <View
      style={styles.container}
      onLayout={handleLayout}
      testID={testID}
      accessible={false}>
      {/* Background scene frame */}
      <Image
        source={imageSource}
        style={styles.backdropImage}
        resizeMode="contain"
        testID="scene-backdrop-image"
      />

      {/* Hotspots overlay layer */}
      {containerSize && (
        <TVFocusGuideView style={StyleSheet.absoluteFill} autoFocus={true}>
          {objects.map((obj) => {
            const [xmin, ymin, xmax, ymax] = obj.region;
            const left = offsetX + xmin * renderWidth;
            const top = offsetY + ymin * renderHeight;
            const width = Math.max((xmax - xmin) * renderWidth, 36);
            const height = Math.max((ymax - ymin) * renderHeight, 36);

            const isFocused = focusedObjectId === obj.id;
            const isSelected = selectedObjectId === obj.id;
            const hasPreferredFocus = obj.id === preferredFocusId;

            return (
              <Pressable
                key={obj.id}
                testID={`hotspot-${obj.id}`}
                accessibilityRole="button"
                accessibilityLabel={`${obj.label}. Press select for explanation.`}
                hasTVPreferredFocus={hasPreferredFocus}
                disabled={disabled}
                onFocus={() => onFocusObject?.(obj)}
                onPress={() => onSelectObject(obj)}
                style={[
                  styles.hotspotBase,
                  {
                    left,
                    top,
                    width,
                    height,
                  },
                  isFocused ? styles.hotspotFocused : styles.hotspotDefault,
                  isSelected && styles.hotspotSelected,
                ]}>
                {/* Object Badge Label */}
                <View
                  style={[
                    styles.badge,
                    isFocused ? styles.badgeFocused : styles.badgeDefault,
                    isSelected && styles.badgeSelected,
                  ]}>
                  <Text
                    style={[
                      styles.badgeText,
                      isFocused && styles.badgeTextFocused,
                    ]}>
                    {obj.label}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </TVFocusGuideView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#000000',
    overflow: 'hidden',
  },
  backdropImage: {
    width: '100%',
    height: '100%',
  },
  hotspotBase: {
    position: 'absolute',
    borderRadius: 8,
    borderWidth: 2,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  hotspotDefault: {
    borderColor: 'rgba(74, 185, 255, 0.6)',
    backgroundColor: 'rgba(74, 185, 255, 0.12)',
  },
  hotspotFocused: {
    borderColor: '#FF6200',
    borderWidth: 4,
    backgroundColor: 'rgba(255, 98, 0, 0.3)',
    transform: [{scale: 1.05}],
    zIndex: 10,
  },
  hotspotSelected: {
    borderColor: '#00E676',
    borderWidth: 4,
    backgroundColor: 'rgba(0, 230, 118, 0.3)',
    zIndex: 9,
  },
  badge: {
    position: 'absolute',
    bottom: -28,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.8,
    shadowRadius: 3,
    elevation: 4,
  },
  badgeDefault: {
    backgroundColor: 'rgba(10, 25, 45, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(74, 185, 255, 0.4)',
  },
  badgeFocused: {
    backgroundColor: '#FF6200',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    transform: [{scale: 1.1}],
  },
  badgeSelected: {
    backgroundColor: '#00C853',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#DDF4FF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    includeFontPadding: false,
  },
  badgeTextFocused: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});
