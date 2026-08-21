import type { ReactNode } from "react";
import styles from "./AssetCard.module.css";

interface AssetCardProps {
  icon: ReactNode;
  title: string;
  subtitle?: ReactNode;
  value?: string;
  trend?: number;
  variant?: "default" | "add";
  onClick?: () => void;
}

export function AssetCard({
  icon,
  title,
  subtitle,
  value,
  trend,
  onClick,
  variant = 'default',
}: AssetCardProps) {
  const hasTrend = typeof trend === "number";

  const cardClass = variant === "add" ? `${styles.card} ${styles.addCard}` : styles.card;

  return (
    <span
      className={cardClass}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <span className={styles.icon}>{icon}</span>

      <span className={styles.body}>
        <p className={styles.title}>{title}</p>
        {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
      </span>

      {(value || hasTrend) && (
        <span className={styles.meta}>
          {value && <span className={styles.value}>{value}</span>}
          {hasTrend && (
            <span className={trend! >= 0 ? styles.positive : styles.negative}>
              {trend! >= 0 ? "+" : ""}
              {trend!.toFixed(2)}%
            </span>
          )}
        </span>
      )}
    </span>
  );
}
