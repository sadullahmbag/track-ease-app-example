import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

export function useFrameworkReady() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Framework initialization logic
    const initializeFramework = async () => {
      try {
        // Add any initialization logic here
        if (Platform.OS === 'web') {
          // Web-specific initialization
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        setIsReady(true);
      } catch (error) {
        console.error('Framework initialization error:', error);
        setIsReady(true); // Set to true even on error to prevent blocking
      }
    };

    initializeFramework();
  }, []);

  return isReady;
}