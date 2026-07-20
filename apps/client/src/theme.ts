import { useColorScheme } from 'react-native';

const light = {
  background: '#F1F5F7',
  surface: '#FFFFFF',
  text: '#141821',
  muted: '#68747C',
  border: '#D2DDE2',
  accent: '#286D80',
  accentSoft: '#D8EBF0',
  accentTint: '#58A9BD45',
  glassFallback: '#FFFFFFE8',
  glassBorder: '#FFFFFFB8',
  bloomSky: '#9CCAF05C',
  bloomMint: '#A9D6C550',
  bloomIris: '#C9B7ED45',
};

const dark = {
  background: '#0D1419',
  surface: '#172129',
  text: '#F3F7F8',
  muted: '#A7B4BA',
  border: '#2B3A43',
  accent: '#78C4D6',
  accentSoft: '#193F4A',
  accentTint: '#4BA9BE52',
  glassFallback: '#19242CE8',
  glassBorder: '#FFFFFF24',
  bloomSky: '#245A7A5C',
  bloomMint: '#285F5552',
  bloomIris: '#4B3E7A4D',
};

export function useAppTheme() {
  return useColorScheme() === 'dark' ? dark : light;
}
