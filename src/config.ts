import {Platform} from 'react-native';

declare const __DEV_API_URL__: string | undefined;

const getInitialBaseUrl = (): string => {
  if (typeof __DEV_API_URL__ !== 'undefined' && __DEV_API_URL__) {
    return __DEV_API_URL__;
  }
  if (typeof process !== 'undefined' && process.env?.GAZEGUIDE_API_URL) {
    return process.env.GAZEGUIDE_API_URL;
  }
 
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8000';
  }
  return 'http://localhost:8000';
};

export const config = {
  apiBaseUrl: getInitialBaseUrl(),
  requestTimeoutMs: 12000,
  defaultQuestion: 'Explain this object and how it moves.',

  fallbackBaseUrls: [
    'http://10.0.2.2:8000',
    'http://localhost:8000',
    'http://127.0.0.1:8000',
  ],
  setApiBaseUrl(url: string) {
    config.apiBaseUrl = url;
  },
};
