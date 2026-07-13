'use client';

import { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import styles from './FAQ.module.css';

gsap.registerPlugin(ScrollTrigger);

const DEFAULT_QUESTIONS = [
  { q: 'Cum funcționează QRPhotoDrop?', a: 'Alegi pachetul potrivit evenimentului tău, primești un cod QR unic. Invitații îl scanează cu camera telefonului și încarcă poze, clipuri și urări direct din browser, fără cont și fără aplicație.' },
  { q: 'Ce tip de fișiere pot încărca invitații?', a: 'Fotografii (JPG, PNG, HEIC) și clipuri video de până la 1.5 GB fiecare. Toate se păstrează la calitatea originală — fără compresie.' },
  { q: 'Cât timp rămân stocate amintirile?', a: 'Stocarea este garantată 3 luni de la data evenimentului. În tot acest timp poți adăuga conținut sau descărca arhiva ori de câte ori dorești.' },
  { q: 'Există limită de invitați?', a: 'Nu. Oricine are acces la link sau la codul QR poate încărca, indiferent de numărul de persoane.' },
  { q: 'Cum descarc toate pozele?', a: 'Din dashboard-ul tău de organizator, apeși butonul „Generează arhiva" și primești un email cu link-ul de descărcare când aceasta este gata.' },
  { q: 'Datele sunt sigure?', a: 'Da. Fiecare eveniment are un cod unic securizat, iar invitații nu pot vedea alte evenimente. Prelucrăm datele conform GDPR — detaliile sunt în Politica de Confidențialitate.' },
];

export default function FAQ({ questions = DEFAULT_QUESTIONS }) {
  const [openIndex, setOpenIndex] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(`.${styles.item}`, 
        { y: 30, opacity: 0 },
        {
          scrollTrigger: { trigger: ref.current, start: 'top 82%' },
          y: 0, 
          opacity: 1, 
          duration: 0.7, 
          stagger: 0.08, 
          ease: 'power2.out',
          overwrite: 'auto'
        }
      );
    }, ref);
    return () => ctx.revert();
  }, []);

  return (
    <section className={styles.section} ref={ref}>
      <div className={styles.inner}>
        <div className={styles.header}>
          <span className={styles.eyebrow}>Întrebări Frecvente</span>
          <h2 className={styles.title}>Tot ce trebuie să știi</h2>
        </div>
        <div className={styles.list}>
          {questions.map((item, i) => (
            <div key={i} className={styles.item}>
              <button
                className={styles.question}
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
              >
                {item.q}
                <span className={`${styles.icon} ${openIndex === i ? styles.iconOpen : ''}`}>+</span>
              </button>
              {openIndex === i && (
                <div className={styles.answer}>{item.a}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
