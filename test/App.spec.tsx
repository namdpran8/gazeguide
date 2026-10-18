import 'react-native';
import {render, fireEvent} from '@testing-library/react-native';
import * as React from 'react';

import {App} from '../src/App';

describe('App', () => {
  it('opens the solar-system orbit scene by default', () => {
    const screen = render(<App />);
    expect(screen.getByTestId('app-scene-view')).toBeTruthy();
    expect(screen.getByTestId('scene-backdrop-image')).toBeTruthy();
  });

  it('renders all tiles when initialView is tiles', () => {
    const screen = render(<App initialView="tiles" />);
    expect(screen.getByTestId('tile-home')).toBeTruthy();
    expect(screen.getByTestId('tile-get-started')).toBeTruthy();
    expect(screen.getByTestId('tile-debug')).toBeTruthy();
    expect(screen.getByTestId('tile-learn-more')).toBeTruthy();
    expect(screen.getByTestId('btn-launch-lesson')).toBeTruthy();
  });

  it('navigates from tiles view to solar-system scene on launch button press', () => {
    const screen = render(<App initialView="tiles" />);
    const launchBtn = screen.getByTestId('btn-launch-lesson');
    fireEvent.press(launchBtn);
    expect(screen.getByTestId('app-scene-view')).toBeTruthy();
  });

  it('navigates from scene back to menu when Menu button is pressed', () => {
    const screen = render(<App />);
    const backBtn = screen.getByTestId('btn-scene-back');
    fireEvent.press(backBtn);
    expect(screen.getByTestId('tile-home')).toBeTruthy();
  });
});
