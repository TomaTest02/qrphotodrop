import styles from './PricingCard.module.css';

const FEATURES = [
  'Album Digital & QR unic',
  'Catalog & Design QR',
  '3 luni stocare',
  'Încărcări nelimitate',
  'Poze, urări și clipuri video (max. 2 min)',
  'Pagină de administrare dedicată',
  'Design digital 9×5 cm, A5 sau A6',
];

export default function PricingCard({ name, price, guestLimit, isPopular, onSelect }) {
  const displayPrice = Math.round(price / 100);

  return (
    <div className={`${styles.card} ${isPopular ? styles.popular : ''}`} style={{ height: '100%' }}>
      {isPopular && <span className={styles.badge}>Cel mai popular</span>}
      <h3 className={styles.name}>{name}</h3>
      <p className={styles.guests}>Ideal pentru până la {guestLimit} invitați</p>
      <div className={styles.priceWrap}>
        <span className={styles.price}>{displayPrice}</span>
        <span className={styles.currency}>RON</span>
      </div>
      <div className={styles.divider} />
      <div className={styles.features}>
        {FEATURES.map((f, i) => (
          <div key={i} className={styles.feature}>
            <span className={styles.check}>✓</span>
            <span>{f}</span>
          </div>
        ))}
      </div>
      <button
        className={`${styles.btn} ${isPopular ? styles.btnPrimary : styles.btnOutline}`}
        onClick={onSelect}
      >
        Comanzi acum →
      </button>
    </div>
  );
}
