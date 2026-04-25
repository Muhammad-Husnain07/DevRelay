import { useState, useEffect, useRef } from 'react';

export function useCountUp(target, duration = 1000) {
  const [display, setDisplay] = useState(0);
  const startRef = useRef(Date.now());
  const startValueRef = useRef(0);

  useEffect(() => {
    if (target === 0 || target === display) return;
    
    startValueRef.current = display;
    startRef.current = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(startValueRef.current + (target - startValueRef.current) * eased));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [target, duration]);

  return display;
}