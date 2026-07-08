'use client';

import { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import PricingCard from './PricingCard';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import styles from './PricingSection.module.css';

gsap.registerPlugin(ScrollTrigger);

// Stocare și disponibilitate per nivel (identice pentru toate tipurile de eveniment)
const TIER_STORAGE = { intim: 75, complet: 150, vis: 200 };
const TIER_DURATION = { intim: '1 lună', complet: '2 luni', vis: '3 luni' };

const tierFeatures = (tier) => {
  const list = [
    'Album digital pentru eveniment',
    'Cod QR unic pentru acces',
    'Încărcare poze de către invitați',
    'Încărcare urări de către invitați',
    'Încărcare clipuri video de maximum 2 minute',
    `Spațiu de stocare: ${TIER_STORAGE[tier]} GB`,
    `Disponibilitate după eveniment: ${TIER_DURATION[tier]}`,
  ];
  // Toate pachetele: printare & plastifiere carduri QR contra cost (preț în funcție de nr. de carduri)
  list.push('Opțional (contra cost): printare și plastifiere carduri QR — preț în funcție de numărul de carduri');
  return list;
};

const PACKAGES = {
  nunta: [
    { key: 'intim',   name: 'Basic',    price: 27900, subLabel: 'ideal pentru evenimente până în 100 invitați', features: tierFeatures('intim') },
    { key: 'complet', name: 'Standard', price: 39900, subLabel: 'ideal pentru evenimente până în 250 invitați', popular: true, features: tierFeatures('complet') },
    { key: 'vis',     name: 'Premium',  price: 64900, subLabel: 'ideal pentru evenimente până în 500 invitați', features: tierFeatures('vis') },
  ],
  botez: [
    { key: 'intim',   name: 'Basic',    price: 27900, subLabel: 'ideal pentru evenimente până în 50 invitați',  features: tierFeatures('intim') },
    { key: 'complet', name: 'Standard', price: 39900, subLabel: 'ideal pentru evenimente până în 150 invitați', popular: true, features: tierFeatures('complet') },
    { key: 'vis',     name: 'Premium',  price: 64900, subLabel: 'ideal pentru evenimente până în 300 invitați', features: tierFeatures('vis') },
  ],
  aniversare: [
    { key: 'intim',   name: 'Basic',    price: 27900, subLabel: 'ideal pentru evenimente până în 50 invitați',  features: tierFeatures('intim') },
    { key: 'complet', name: 'Standard', price: 39900, subLabel: 'ideal pentru evenimente până în 150 invitați', popular: true, features: tierFeatures('complet') },
    { key: 'vis',     name: 'Premium',  price: 64900, subLabel: 'ideal pentru evenimente până în 300 invitați', features: tierFeatures('vis') },
  ],
  corporate: [
    { key: 'intim',   name: 'Basic',    price: 27900, subLabel: 'ideal pentru evenimente până în 100 invitați', features: tierFeatures('intim') },
    { key: 'complet', name: 'Standard', price: 39900, subLabel: 'ideal pentru evenimente până în 300 invitați', popular: true, features: tierFeatures('complet') },
    { key: 'vis',     name: 'Premium',  price: 64900, subLabel: 'ideal pentru evenimente până în 600 invitați', features: tierFeatures('vis') },
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
