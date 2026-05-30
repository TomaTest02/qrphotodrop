'use client';

import { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import PricingCard from './PricingCard';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import styles from './PricingSection.module.css';

gsap.registerPlugin(ScrollTrigger);

const PACKAGES = {
  nunta: [
    { 
      key: 'intim', 
      name: 'NUNTĂ INTIMĂ', 
      price: 27900, 
      subLabel: 'ideal pentru evenimente până în 100 invitați',
      features: [
        'Album Digital & QR unic',
        'Catalog & Design Printabil pentru QR',
        '3 luni stocare de la data evenimentului',
        'Încărcări nelimitate',
        'Cartonașe fizice'
      ]
    },
    { 
      key: 'complet', 
      name: 'NUNTĂ COMPLETĂ', 
      price: 36900, 
      subLabel: 'ideal pentru evenimente până în 250 invitați',
      popular: true,
      features: [
        'Album Digital & QR unic',
        'Catalog & Design Printabil pentru QR',
        '3 luni stocare de la data evenimentului',
        'Încărcări nelimitate',
        'Cartonașe fizice opțional'
      ]
    },
    { 
      key: 'vis', 
      name: 'NUNTĂ DE VIS', 
      price: 55900, 
      subLabel: 'ideal pentru evenimente până în 500 invitați',
      features: [
        'Album Digital & QR unic',
        'Catalog & Design Printabil pentru QR',
        '3 luni stocare de la data evenimentului',
        'Încărcări nelimitate',
        'Cartonașe fizice opțional'
      ]
    },
  ],
  botez: [
    { 
      key: 'intim', 
      name: 'BOTEZ INTIM', 
      price: 24900, 
      subLabel: 'ideal pentru evenimente până în 50 invitați',
      features: [
        'Album Digital & QR unic',
        'Catalog & Design Printabil pentru QR',
        '3 luni stocare de la data evenimentului',
        'Încărcări nelimitate',
        'Cartonașe fizice'
      ]
    },
    { 
      key: 'complet', 
      name: 'BOTEZ COMPLET', 
      price: 32900, 
      subLabel: 'ideal pentru evenimente până în 150 invitați',
      popular: true,
      features: [
        'Album Digital & QR unic',
        'Catalog & Design Printabil pentru QR',
        '3 luni stocare de la data evenimentului',
        'Încărcări nelimitate',
        'Cartonașe fizice opțional'
      ]
    },
    { 
      key: 'vis', 
      name: 'BOTEZ DE VIS', 
      price: 48900, 
      subLabel: 'ideal pentru evenimente până în 300 invitați',
      features: [
        'Album Digital & QR unic',
        'Catalog & Design Printabil pentru QR',
        '3 luni stocare de la data evenimentului',
        'Încărcări nelimitate',
        'Cartonașe fizice opțional'
      ]
    },
  ],
  aniversare: [
    { 
      key: 'intim', 
      name: 'ANIVERSARE INTIMĂ', 
      price: 24900, 
      subLabel: 'ideal pentru evenimente până în 50 invitați',
      features: [
        'Album Digital & QR unic',
        'Catalog & Design Printabil pentru QR',
        '3 luni stocare de la data evenimentului',
        'Încărcări nelimitate',
        'Cartonașe fizice'
      ]
    },
    { 
      key: 'complet', 
      name: 'ANIVERSARE COMPLETĂ', 
      price: 32900, 
      subLabel: 'ideal pentru evenimente până în 150 invitați',
      popular: true,
      features: [
        'Album Digital & QR unic',
        'Catalog & Design Printabil pentru QR',
        '3 luni stocare de la data evenimentului',
        'Încărcări nelimitate',
        'Cartonașe fizice opțional'
      ]
    },
    { 
      key: 'vis', 
      name: 'ANIVERSARE DE VIS', 
      price: 48900, 
      subLabel: 'ideal pentru evenimente până în 300 invitați',
      features: [
        'Album Digital & QR unic',
        'Catalog & Design Printabil pentru QR',
        '3 luni stocare de la data evenimentului',
        'Încărcări nelimitate',
        'Cartonașe fizice opțional'
      ]
    },
  ],
  corporate: [
    { 
      key: 'intim', 
      name: 'CORPORATE BASIC', 
      price: 32900, 
      subLabel: 'ideal pentru evenimente până în 100 invitați',
      features: [
        'Album Digital & QR unic',
        'Catalog & Design Printabil pentru QR',
        '3 luni stocare de la data evenimentului',
        'Încărcări nelimitate',
        'Cartonașe fizice'
      ]
    },
    { 
      key: 'complet', 
      name: 'CORPORATE STANDARD', 
      price: 45900, 
      subLabel: 'ideal pentru evenimente până în 300 invitați',
      popular: true,
      features: [
        'Album Digital & QR unic',
        'Catalog & Design Printabil pentru QR',
        '3 luni stocare de la data evenimentului',
        'Încărcări nelimitate',
        'Cartonașe fizice opțional'
      ]
    },
    { 
      key: 'vis', 
      name: 'CORPORATE PREMIUM', 
      price: 69900, 
      subLabel: 'ideal pentru evenimente până în 600 invitați',
      features: [
        'Album Digital & QR unic',
        'Catalog & Design Printabil pentru QR',
        '3 luni stocare de la data evenimentului',
        'Încărcări nelimitate',
        'Cartonașe fizice opțional'
      ]
    },
  ],
};

const TABS = [
  { key: 'nunta', label: 'Nuntă' },
  { key: 'botez', label: 'Botez' },
  { key: 'aniversare', label: 'Aniversare' },
  { key: 'corporate', label: 'Corporate' },
];

export default function PricingSection({ defaultType = 'nunta' }) {
  const [type, setType] = useState(defaultType);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(`.${styles.grid} > *`, 
        { y: 40, opacity: 0 },
        {
          scrollTrigger: { trigger: ref.current, start: 'top 95%' },
          y: 0, 
          opacity: 1, 
          duration: 0.8, 
          stagger: 0.1, 
          ease: 'power3.out',
          overwrite: 'auto'
        }
      );
    }, ref);
    return () => ctx.revert();
  }, []);

  const plans = PACKAGES[type] || PACKAGES.nunta;

  const handleSelect = (plan) => {
    window.location.href = `/register?type=${type}&plan=${plan.key}`;
  };

  return (
    <section className={styles.section} ref={ref}>
      <div className={styles.inner}>
        <div className={styles.header}>
          <span className={styles.eyebrow}>Prețuri Transparente</span>
          <h2 className={styles.title}>Alege pachetul tău</h2>
          <p className={styles.subtitle}>Fără costuri ascunse. Selectează tipul evenimentului.</p>
        </div>

        <div className={styles.tabs}>
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={`${styles.tab} ${type === tab.key ? styles.tabActive : ''}`}
              onClick={() => setType(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className={styles.grid}>
          {plans.map((plan) => {
            return (
              <div key={plan.key} style={{ height: '100%' }}>
                <PricingCard
                  name={plan.name}
                  price={plan.price}
                  subLabel={plan.subLabel}
                  features={plan.features}
                  isPopular={plan.popular}
                  onSelect={() => handleSelect(plan)}
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
