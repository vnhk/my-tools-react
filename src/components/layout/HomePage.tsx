import { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './HomePage.module.css'

export interface HomePageCard {
  title: string
  description: string
  icon: ReactNode
  route: string
}

interface HomePageProps {
  welcomeText: string
  motivationText?: string
  cards: HomePageCard[]
  footerTitle?: string
  footerContent?: ReactNode
}

export function HomePage({
  welcomeText,
  motivationText,
  cards,
  footerTitle,
  footerContent,
}: HomePageProps) {
  const navigate = useNavigate()

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.welcome}>{welcomeText}</h1>
        {motivationText && <p className={styles.motivation}>{motivationText}</p>}
      </div>

      <div className={styles.grid}>
        {cards.map((card) => (
          <button
            key={card.route}
            className={styles.card}
            onClick={() => navigate(card.route)}
            type="button"
          >
            <span className={styles.cardIcon}>{card.icon}</span>
            <h4 className={styles.cardTitle}>{card.title}</h4>
            <p className={styles.cardDesc}>{card.description}</p>
          </button>
        ))}
      </div>

      {footerTitle && (
        <div className={styles.footer}>
          <h3 className={styles.footerTitle}>{footerTitle}</h3>
          {footerContent}
        </div>
      )}
    </div>
  )
}
