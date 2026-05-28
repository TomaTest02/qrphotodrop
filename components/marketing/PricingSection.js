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
    { key: 'intim', name: 'Nuntă Basic', price: 27900, storage: '25 GB stocare', duration: '1 LUNĂ DUPĂ EVENIMENT' },
    { key: 'complet', name: 'Nuntă Standard', price: 36900, storage: '60 GB stocare', duration: '2 LUNI DUPĂ EVENIMENT', popular: true },
    { key: 'vis', name: 'Nuntă Premium', price: 55900, storage: '100 GB stocare', duration: '3 LUNI DUPĂ EVENIMENT' },
  ],
  botez: [
    { key: 'intim', name: 'Botez Basic', price: 24900, storage: '25 GB stocare', duration: '1 LUNĂ DUPĂ EVENIMENT' },
    { key: 'complet', name: 'Botez Standard', price: 32900, storage: '60 GB stocare', duration: '2 LUNI DUPĂ EVENIMENT', popular: true },
    { key: 'vis', name: 'Botez Premium', price: 48900, storage: '100 GB stocare', duration: '3 LUNI DUPĂ EVENIMENT' },
  ],
  aniversare: [
    { key: 'intim', name: 'Aniversare Basic', price: 24900, storage: '25 GB stocare', duration: '1 LUNĂ DUPĂ EVENIMENT' },
    { key: 'complet', name: 'Aniversare Standard', price: 32900, storage: '60 GB stocare', duration: '2 LUNI DUPĂ EVENIMENT', popular: true },
    { key: 'vis', name: 'Aniversare Premium', price: 48900, storage: '100 GB stocare', duration: '3 LUNI DUPĂ EVENIMENT' },
  ],
  corporate: [
    { key: 'intim', name: 'Corporate Basic', price: 32900, storage: '25 GB stocare', duration: '1 LUNĂ DUPĂ EVENIMENT' },
    { key: 'complet', name: 'Corporate Standard', price: 45900, storage: '60 GB stocare', duration: '2 LUNI DUPĂ EVENIMENT', popular: true },
    { key: 'vis', name: 'Corporate Premium', price: 69900, storage: '100 GB stocare', duration: '3 LUNI DUPĂ EVENIMENT' },
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
    setSelectedPlan(plan);
    setIsModalOpen(true);
  };

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (!email || !selectedPlan) return;
    setLoading(true);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: type,
          packageType: selectedPlan.key,
          organizerEmail: email,
        }),
      });
      const data = await res.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch (err) {
      console.error('Checkout error:', err);
      alert('A apărut o eroare la procesarea plății.');
      setLoading(false);
    }
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
            const planFeatures = [
              'Album Digital & QR unic',
              'Catalog & Design QR',
              '3 luni stocare',
              'Poze, urări și clipuri video (max. 2 min)',
              plan.storage,
              'Pagină de administrare dedicată',
              plan.duration,
            ];
            return (
              <div key={plan.key} style={{ height: '100%' }}>
                <PricingCard
                  name={plan.name}
                  price={plan.price}
                  features={planFeatures}
                  isPopular={plan.popular}
                  onSelect={() => handleSelect(plan)}
                />
              </div>
            );
          })}
        </div>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setEmail(''); setLoading(false); }}
        title="Finalizare comandă"
      >
        <form onSubmit={handleCheckout} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>
            Ai ales pachetul <strong>{selectedPlan?.name}</strong>. Te rugăm să introduci adresa de email pentru a primi detaliile și link-ul platformei după plată.
          </p>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-text-muted)', marginBottom: '8px' }}>
              Adresă de email
            </label>
            <input 
              type="email" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nume@exemplu.com"
              style={{ width: '100%', padding: '12px 16px', border: '1px solid var(--color-cream-darker)', borderRadius: 'var(--radius-md)', fontSize: '15px', fontFamily: 'var(--font-sans)', outline: 'none' }}
              disabled={loading}
            />
          </div>
          <Button type="submit" variant="primary" loading={loading} style={{ width: '100%', marginTop: 'var(--space-sm)' }}>
            Continuă spre plată
          </Button>
        </form>
      </Modal>
    </section>
  );
}
