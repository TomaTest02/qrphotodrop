'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Heart, Baby, Cake, Building2, ArrowRight } from 'lucide-react';
import styles from './EventTypes.module.css';

gsap.registerPlugin(ScrollTrigger);

const types = [
  { type: 'nunta', icon: <Heart size={64} strokeWidth={1.5} />, title: 'Nuntă', desc: 'Colectează amintiri de la invitați în ziua cea mare.' },
  { type: 'botez', icon: <Baby size={64} strokeWidth={1.5} />, title: 'Botez', desc: 'Păstrează momentele prețioase ale botezului.' },
  { type: 'aniversare', icon: <Cake size={64} strokeWidth={1.5} />, title: 'Aniversare', desc: 'Surprinde fiecare moment al aniversării tale.' },
  { type: 'corporate', icon: <Building2 size={64} strokeWidth={1.5} />, title: 'Corporate', desc: 'Teambuilding, conferințe, gale — totul documentat.' },
];

export default function EventTypes() {
  const containerRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    const mm = gsap.matchMedia();

    mm.add("(min-width: 993px)", () => {
      const container = containerRef.current;
      const scroll = scrollRef.current;
      if (!container || !scroll) return;

      const getScrollAmount = () => {
        const amount = scroll.scrollWidth - window.innerWidth + 80;
        return amount > 0 ? amount : 0;
      };

      gsap.to(scroll, {
        x: () => -getScrollAmount(),
        ease: 'none',
        scrollTrigger: {
          trigger: container,
          pin: true,
          scrub: 1,
          start: 'top top',
          end: () => `+=${getScrollAmount()}`,
          invalidateOnRefresh: true,
        }
      });

      ScrollTrigger.refresh();
    });

    // Force a ScrollTrigger recalculation to sync offsets after page hydration
    const refreshTimer = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 400);

    return () => {
      clearTimeout(refreshTimer);
      mm.revert();
    };
  }, []);

  return (
    <section className={styles.section} ref={containerRef}>
      <div className={styles.header}>
        <span className={styles.eyebrow}>Pentru Orice Ocazie</span>
        <h2 className={styles.title}>Tipuri de evenimente</h2>
      </div>

      <div className={styles.scrollWrapper}>
        <div className={styles.scrollContainer} ref={scrollRef}>
          {types.map((t) => (
            <a key={t.type} href={`/eveniment/${t.type}`} className={styles.eventCard}>
              <div className={styles.cardInner}>
                <div className={styles.iconWrapper}>{t.icon}</div>
                <h3 className={styles.cardTitle}>{t.title}</h3>
                <p className={styles.cardDesc}>{t.desc}</p>
                <div className={styles.arrow}><ArrowRight size={24} /></div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
