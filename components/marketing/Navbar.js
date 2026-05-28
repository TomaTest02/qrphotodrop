'use client';

import { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import styles from './Navbar.module.css';

gsap.registerPlugin(ScrollTrigger);

const EVENT_TYPES = [
  { label: 'Nuntă', href: '/eveniment/nunta' },
  { label: 'Botez', href: '/eveniment/botez' },
  { label: 'Aniversare', href: '/eveniment/aniversare' },
  { label: 'Corporate', href: '/eveniment/corporate' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 80);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        start: 'top -80',
        onUpdate: (self) => {
          if (self.direction === -1) {
            gsap.to(nav, { y: 0, duration: 0.3, ease: 'power2.out' });
          } else {
            gsap.to(nav, { y: '-100%', duration: 0.3, ease: 'power2.in' });
          }
        },
      });
    });

    return () => ctx.revert();
  }, []);

  return (
    <>
      <nav
        ref={navRef}
        className={`${styles.nav} ${scrolled ? styles.scrolled : ''}`}
      >
        <div className={styles.inner}>
          <a href="/" className={styles.logo}>
            QRPhotoDrop
          </a>

          <div className={styles.links}>
            <a href="/" className={styles.link}>
              Acasă
            </a>

            <div
              className={`${styles.dropdown} ${dropdownOpen ? styles.dropdownOpen : ''}`}
              onMouseEnter={() => setDropdownOpen(true)}
              onMouseLeave={() => setDropdownOpen(false)}
            >
              <button className={styles.dropdownToggle}>
                Eveniment <span className={styles.dropdownArrow}>▼</span>
              </button>
              <div className={styles.dropdownMenu}>
                {EVENT_TYPES.map((et) => (
                  <a key={et.href} href={et.href} className={styles.dropdownItem}>
                    {et.label}
                  </a>
                ))}
              </div>
            </div>

            <a href="/preturi" className={styles.link}>
              Prețuri
            </a>
            <a href="/upload/DEMO" className={styles.link} style={{ color: 'var(--color-burgundy)', fontWeight: 700 }}>
              Încearcă DEMO 🚀
            </a>
            <a href="/blog" className={styles.link}>
              Blog
            </a>
            <a href="/contact" className={styles.link}>
              Contact
            </a>

            <a href="/login" className={styles.cta}>
              Accesează Aplicația
            </a>
          </div>

          <button
            className={styles.hamburger}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Meniu"
          >
            <span className={styles.hamburgerLine} />
            <span className={styles.hamburgerLine} />
            <span className={styles.hamburgerLine} />
          </button>
        </div>
      </nav>

      <div className={`${styles.mobileMenu} ${mobileOpen ? styles.open : ''}`}>
        <a href="/" className={styles.mobileLink} onClick={() => setMobileOpen(false)}>
          Acasă
        </a>
        <a href="/preturi" className={styles.mobileLink} onClick={() => setMobileOpen(false)}>
          Prețuri
        </a>
        <a href="/upload/DEMO" className={styles.mobileLink} style={{ color: 'var(--color-burgundy)' }} onClick={() => setMobileOpen(false)}>
          Încearcă DEMO 🚀
        </a>
        {EVENT_TYPES.map((et) => (
          <a
            key={et.href}
            href={et.href}
            className={styles.mobileSubLink}
            onClick={() => setMobileOpen(false)}
          >
            {et.label}
          </a>
        ))}
        <a href="/blog" className={styles.mobileLink} onClick={() => setMobileOpen(false)}>
          Blog
        </a>
        <a href="/contact" className={styles.mobileLink} onClick={() => setMobileOpen(false)}>
          Contact
        </a>
        <a href="/login" className={styles.cta} onClick={() => setMobileOpen(false)}>
          Accesează Aplicația
        </a>
      </div>
    </>
  );
}
