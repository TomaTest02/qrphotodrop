import styles from './Spinner.module.css';

export default function Spinner({ size = 'md', center = false }) {
  const spinner = <div className={`${styles.spinner} ${styles[size]}`} />;
  if (center) {
    return <div className={styles.center}>{spinner}</div>;
  }
  return spinner;
}
