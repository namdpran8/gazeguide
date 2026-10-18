import {explainObject} from '../src/services/api';
import {config} from '../src/config';

const originalFetch = global.fetch;

describe('API service - explainObject', () => {
  beforeEach(() => {
    config.setApiBaseUrl('http://test-server:8000');
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('sends correct POST request with lesson_id, scene_id, and object_id', async () => {
    const mockSuccessResponse = {
      title: 'Understanding Planet Earth',
      explanation: 'Test explanation',
      analogy: 'Test analogy',
      follow_up: ['Question 1'],
      source_note: 'Test note',
      fallback: true,
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockSuccessResponse),
    });

    const result = await explainObject({
      lesson_id: 'solar-system-01',
      scene_id: 'orbit-scene-02',
      selected_object_id: 'earth',
      question: 'Explain this object.',
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'http://test-server:8000/api/v1/explain',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          lesson_id: 'solar-system-01',
          scene_id: 'orbit-scene-02',
          selected_object_id: 'earth',
          question: 'Explain this object.',
        }),
      }),
    );

    expect(result).toEqual(mockSuccessResponse);
  });

  it('handles backend error responses gracefully', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: jest.fn().mockResolvedValue({
        detail: {
          error_code: 'OBJECT_NOT_FOUND',
          message: 'The selected object was not found.',
        },
      }),
    });

    await expect(
      explainObject({
        lesson_id: 'solar-system-01',
        scene_id: 'orbit-scene-02',
        selected_object_id: 'non-existent',
      }),
    ).rejects.toThrow('The selected object was not found.');
  });

  it('translates network failures to informative error messages', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(
      explainObject({
        lesson_id: 'solar-system-01',
        scene_id: 'orbit-scene-02',
        selected_object_id: 'earth',
      }),
    ).rejects.toThrow(/Network connection failed/);
  });
});
