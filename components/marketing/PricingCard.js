import styles from './PricingCard.module.css';

export default function PricingCard({ name, price, subLabel, features = [], isPopular, onSelect, buttonText = 'Comanzi acum →' }) {
  const displayPrice = Math.round(price / 100);

  return (
    <div className={`${styles.card} ${isPopular ? styles.popular : ''}`} style={{ height: '100%' }}>
      {isPopular && <span className={styles.badge}>Cel mai popular</span>}
      <h3 className={styles.name}>{name}</h3>
      {subLabel && <p className={styles.guests}>{subLabel}</p>}
      <div className={styles.priceWrap}>
        <span className={styles.price}>{displayPrice}</span>
        <span className={styles.currency}>RON</span>
      </div>
      <div className={styles.divider} />
      <div className={styles.features}>
        {features.map((f, i) => (
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
        {buttonText}
      </button>
    </div>
  );
}
