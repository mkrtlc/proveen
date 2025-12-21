import React, { useState, useEffect } from 'react';
import { Skeleton } from './Skeleton';

interface IconProps {
  name: string;
  className?: string;
  style?: React.CSSProperties;
  fill?: boolean;
  size?: number | string;
}

// Global font loading state
let fontsLoaded = false;
let fontCheckPromise: Promise<void> | null = null;

const checkFontsLoaded = (): Promise<void> => {
  if (fontsLoaded) {
    return Promise.resolve();
  }

  if (fontCheckPromise) {
    return fontCheckPromise;
  }

  fontCheckPromise = new Promise((resolve) => {
    if (document.fonts && document.fonts.check) {
      const isLoaded = document.fonts.check('24px Material Symbols Outlined');
      if (isLoaded) {
        fontsLoaded = true;
        resolve();
        return;
      }
    }

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        fontsLoaded = true;
        resolve();
      });
    } else {
      // Fallback: assume loaded after a short delay
      setTimeout(() => {
        fontsLoaded = true;
        resolve();
      }, 100);
    }
  });

  return fontCheckPromise;
};

export const Icon: React.FC<IconProps> = ({ 
  name, 
  className = '', 
  style = {}, 
  fill = false,
  size 
}) => {
  const [loaded, setLoaded] = useState(fontsLoaded);

  useEffect(() => {
    if (fontsLoaded) {
      setLoaded(true);
      return;
    }

    checkFontsLoaded().then(() => {
      setLoaded(true);
    });
  }, []);

  const iconStyle: React.CSSProperties = {
    ...style,
    ...(size && { fontSize: typeof size === 'number' ? `${size}px` : size }),
  };

  if (!loaded) {
    return (
      <Skeleton 
        className={`inline-block rounded ${className}`} 
        style={{ 
          width: iconStyle.fontSize || '24px', 
          height: iconStyle.fontSize || '24px',
          ...iconStyle
        }} 
      />
    );
  }

  return (
    <span 
      className={`material-symbols-outlined ${fill ? 'fill' : ''} ${className}`}
      style={iconStyle}
    >
      {name}
    </span>
  );
};

export default Icon;
