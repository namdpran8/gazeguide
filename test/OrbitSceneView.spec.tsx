import 'react-native';
import {render, fireEvent, waitFor} from '@testing-library/react-native';
import * as React from 'react';

import {OrbitSceneView} from '../src/scenes/OrbitSceneView';
import * as api from '../src/services/api';

jest.mock('../src/services/api');

const mockExplainResponse = {
  title: 'Understanding Planet Earth',
  explanation: 'Earth orbits the Sun once every 365.25 days.',
  analogy: 'Like a tetherball swinging around a central pole.',
  follow_up: ['Why does Earth stay in orbit?'],
  source_note: 'Curated fallback',
  fallback: true,
};

describe('OrbitSceneView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders orbit-scene-02 title, timestamp, and Earth target', () => {
    const screen = render(<OrbitSceneView />);
    expect(screen.getByText('Earth orbiting the Sun (18.5s)')).toBeTruthy();
    expect(screen.getByText('Planet Earth')).toBeTruthy();
    expect(screen.getByTestId('scene-hotspot-layer')).toBeTruthy();
  });

  it('selects Earth hotspot and triggers explain API successfully', async () => {
    (api.explainObject as jest.Mock).mockResolvedValueOnce(mockExplainResponse);

    const screen = render(<OrbitSceneView />);

    const hotspotLayer = screen.getByTestId('scene-hotspot-layer');
    fireEvent(hotspotLayer, 'layout', {
      nativeEvent: {layout: {width: 1920, height: 1080, x: 0, y: 0}},
    });

    const earthHotspot = screen.getByTestId('hotspot-earth');
    fireEvent.press(earthHotspot);

    expect(api.explainObject).toHaveBeenCalledWith(
      expect.objectContaining({
        lesson_id: 'solar-system-01',
        scene_id: 'orbit-scene-02',
        selected_object_id: 'earth',
      }),
      expect.any(Object),
    );


    await waitFor(() => {
      expect(screen.getByTestId('scene-explanation-card')).toBeTruthy();
      expect(screen.getByText('Understanding Planet Earth')).toBeTruthy();
      expect(
        screen.getByText('Earth orbits the Sun once every 365.25 days.'),
      ).toBeTruthy();
    });
  });

  it('handles API error and allows retry', async () => {
    (api.explainObject as jest.Mock)
      .mockRejectedValueOnce(new Error('Connection timed out'))
      .mockResolvedValueOnce(mockExplainResponse);

    const screen = render(<OrbitSceneView />);

    const hotspotLayer = screen.getByTestId('scene-hotspot-layer');
    fireEvent(hotspotLayer, 'layout', {
      nativeEvent: {layout: {width: 1920, height: 1080, x: 0, y: 0}},
    });

    const earthHotspot = screen.getByTestId('hotspot-earth');
    fireEvent.press(earthHotspot);

    await waitFor(() => {
      expect(screen.getByText('Connection timed out')).toBeTruthy();
      expect(screen.getByTestId('btn-retry')).toBeTruthy();
    });


    fireEvent.press(screen.getByTestId('btn-retry'));

    await waitFor(() => {
      expect(screen.getByText('Understanding Planet Earth')).toBeTruthy();
    });
  });

  it('dismisses explanation when dismiss button is pressed', async () => {
    (api.explainObject as jest.Mock).mockResolvedValueOnce(mockExplainResponse);

    const screen = render(<OrbitSceneView />);

    const hotspotLayer = screen.getByTestId('scene-hotspot-layer');
    fireEvent(hotspotLayer, 'layout', {
      nativeEvent: {layout: {width: 1920, height: 1080, x: 0, y: 0}},
    });

    fireEvent.press(screen.getByTestId('hotspot-earth'));

    await waitFor(() => {
      expect(screen.getByTestId('btn-dismiss')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('btn-dismiss'));

  
    expect(screen.queryByTestId('scene-explanation-card')).toBeNull();
  });
});
