import 'react-native';
import {render, fireEvent} from '@testing-library/react-native';
import * as React from 'react';

import {HotspotLayer} from '../src/components/HotspotLayer';
import {SelectedObject} from '../src/types/lesson';

const mockObjects: SelectedObject[] = [
  {
    id: 'earth',
    label: 'Planet Earth',
    description: 'Our home planet.',
    region: [0.33, 0.48, 0.37, 0.54],
  },
  {
    id: 'sun',
    label: 'The Sun',
    description: 'The central star.',
    region: [0.46, 0.41, 0.55, 0.57],
  },
];

describe('HotspotLayer', () => {
  it('renders scene backdrop image', () => {
    const screen = render(
      <HotspotLayer
        imageSource={{uri: 'test-backdrop.jpg'}}
        objects={mockObjects}
        onSelectObject={jest.fn()}
      />,
    );
    expect(screen.getByTestId('scene-backdrop-image')).toBeTruthy();
  });

  it('renders hotspots and computes coordinates on layout', () => {
    const onSelect = jest.fn();
    const onFocus = jest.fn();

    const screen = render(
      <HotspotLayer
        imageSource={{uri: 'test-backdrop.jpg'}}
        objects={mockObjects}
        focusedObjectId="earth"
        preferredFocusId="earth"
        onFocusObject={onFocus}
        onSelectObject={onSelect}
      />,
    );

    
    const container = screen.getByTestId('hotspot-layer');
    fireEvent(container, 'layout', {
      nativeEvent: {layout: {width: 1920, height: 1080, x: 0, y: 0}},
    });

    const earthHotspot = screen.getByTestId('hotspot-earth');
    expect(earthHotspot).toBeTruthy();

    const flatStyle = Object.assign({}, ...[earthHotspot.props.style].flat());

    expect(flatStyle.left).toBeCloseTo(633.6, 1);
   
    expect(flatStyle.top).toBeCloseTo(518.4, 1);
 
    expect(flatStyle.width).toBeCloseTo(76.8, 1);
  
    expect(flatStyle.height).toBeCloseTo(64.8, 1);

    expect(flatStyle.borderColor).toBe('#FF6200');

    fireEvent.press(earthHotspot);
    expect(onSelect).toHaveBeenCalledWith(mockObjects[0]);
  });
});
