import { useColorScheme } from 'react-native';

const light = {
  background: '#F1F2F2',
  surface: '#FFFFFF',
  text: '#202126',
  muted: '#85868B',
  border: '#E4E4E5',
  accent: '#A72D50',
  accentSoft: '#F5E7EC',
  accentTint: '#A72D5024',
  glassFallback: '#FFFFFF',
  glassBorder: '#ECECEE',
  bloomSky: '#00000000',
  bloomMint: '#00000000',
  bloomIris: '#00000000',
  chrome: '#1D1E22',
  chromeMuted: '#8D8E94',
};

const dark = {
  background: '#15161A',
  surface: '#222328',
  text: '#F6F4F5',
  muted: '#9B999D',
  border: '#35363B',
  accent: '#D8587C',
  accentSoft: '#492535',
  accentTint: '#D8587C30',
  glassFallback: '#222328',
  glassBorder: '#34353A',
  bloomSky: '#00000000',
  bloomMint: '#00000000',
  bloomIris: '#00000000',
  chrome: '#15161A',
  chromeMuted: '#8D8E94',
};

export function useAppTheme() {
  return useColorScheme() === 'dark' ? dark : light;
}
