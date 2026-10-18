import 'react-native';
import {render, fireEvent} from '@testing-library/react-native';
import * as React from 'react';

import {ExplanationCard} from '../src/components/ExplanationCard';
import {ExplainResponse} from '../src/types/lesson';

const mockResponse: ExplainResponse = {
  title: 'Understanding Planet Earth',
  explanation: 'Our home planet in steady orbital revolution around the Sun.',
  analogy: 'Think of Planet Earth as one part of a larger system.',
  follow_up: [
    'What is the role of Planet Earth?',
    'How does this relate to the rest of the scene?',
  ],
  source_note: 'Curated scene metadata fallback',
  fallback: true,
};

describe('ExplanationCard', () => {
  it('renders loading indicator when loading', () => {
    const screen = render(
      <ExplanationCard
        loading={true}
        data={null}
        error={null}
        selectedObjectName="Planet Earth"
        onRetry={jest.fn()}
        onDismiss={jest.fn()}
      />,
    );
    expect(screen.getByTestId('explanation-loading')).toBeTruthy();
  });

  it('renders explanation, analogy, follow up, and fallback badge', () => {
    const onDismiss = jest.fn();
    const screen = render(
      <ExplanationCard
        loading={false}
        data={mockResponse}
        error={null}
        selectedObjectName="Planet Earth"
        onRetry={jest.fn()}
        onDismiss={onDismiss}
      />,
    );

    expect(screen.getByText('Understanding Planet Earth')).toBeTruthy();
    expect(
      screen.getByText(
        'Our home planet in steady orbital revolution around the Sun.',
      ),
    ).toBeTruthy();
    expect(
      screen.getByText('Think of Planet Earth as one part of a larger system.'),
    ).toBeTruthy();
    expect(screen.getByText('OFFLINE / FALLBACK')).toBeTruthy();
    expect(screen.getByText('• What is the role of Planet Earth?')).toBeTruthy();

    const dismissBtn = screen.getByTestId('btn-dismiss');
    fireEvent.press(dismissBtn);
    expect(onDismiss).toHaveBeenCalled();
  });

  it('renders error message and retry button when error occurs', () => {
    const onRetry = jest.fn();
    const screen = render(
      <ExplanationCard
        loading={false}
        data={null}
        error="Network timeout when reaching backend tutor."
        selectedObjectName="Planet Earth"
        onRetry={onRetry}
        onDismiss={jest.fn()}
      />,
    );

    expect(screen.getByTestId('explanation-error')).toBeTruthy();
    expect(
      screen.getByText('Network timeout when reaching backend tutor.'),
    ).toBeTruthy();

    const retryBtn = screen.getByTestId('btn-retry');
    fireEvent.press(retryBtn);
    expect(onRetry).toHaveBeenCalled();
  });
});
