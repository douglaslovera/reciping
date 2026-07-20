import { Text as NativeText, type TextProps } from 'react-native';

import { useDatabaseContext } from '@/db/provider';
import { translate } from '@/i18n';

export function Text({ children, ...props }: TextProps) {
  const { settings } = useDatabaseContext();
  const translated = typeof children === 'string' ? translate(settings.language, children) : children;
  return (
    <NativeText {...props}>
      {translated}
    </NativeText>
  );
}
