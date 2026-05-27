'use client';

import { useEffect, useRef } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function SmoothScroll({ children }) {
  const lenisRef = useRef(null);

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // https://www.desmos.com/calculator/brs54l4xou
      direction: 'vertical',
      gestureDirection: 'vertical',
      smooth: true,
      mouseMultiplier: 1,
      smoothTouch: false,
      touchMultiplier: 2,
      infinite: false,
    });
    lenisRef.current = lenis;

    lenis.on('scroll', ScrollTrigger.update);

    const tickHandler = (time) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(tickHandler);

    gsap.ticker.lagSmoothing(0);

    const refreshHandler = () => {
      ScrollTrigger.refresh();
    };
    window.addEventListener('load', refreshHandler);
    const refreshTimer = setTimeout(refreshHandler, 1000);

    return () => {
      window.removeEventListener('load', refreshHandler);
      clearTimeout(refreshTimer);
      lenis.destroy();
      gsap.ticker.remove(tickHandler);
    };
  }, []);

  return <>{children}</>;
}
