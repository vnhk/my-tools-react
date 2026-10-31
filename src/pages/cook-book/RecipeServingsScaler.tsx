import React from 'react'
import styles from './RecipeServingsScaler.module.css'

interface RecipeServingsScalerProps {
    baseServings: number | null
    currentServings: number
    onChangeServings: (newServings: number) => void
    onReset: () => void
}

export const RecipeServingsScaler: React.FC<RecipeServingsScalerProps> = ({
    baseServings,
    currentServings,
    onChangeServings,
    onReset,
}) => {
    const effectiveBase = baseServings && baseServings > 0 ? baseServings : 1
    const multiplier = currentServings / effectiveBase
    const isScaled = Math.abs(currentServings - effectiveBase) > 0.001

    const handleStepDown = () => {
        if (currentServings <= 1) {
            // Allow sub-1 servings like 0.5
            if (currentServings > 0.5) onChangeServings(0.5)
            return
        }
        onChangeServings(Math.max(1, currentServings - 1))
    }

    const handleStepUp = () => {
        onChangeServings(currentServings + 1)
    }

    const handleDirectInput = (val: string) => {
        const num = parseFloat(val)
        if (!isNaN(num) && num > 0) {
            onChangeServings(num)
        }
    }

    const setScalePreset = (presetMultiplier: number) => {
        const calculated = Math.round(effectiveBase * presetMultiplier * 10) / 10
        onChangeServings(Math.max(0.5, calculated))
    }

    return (
        <div className={styles.scalerContainer}>
            <div className={styles.scalerHeader}>
                <div className={styles.scalerTitleGroup}>
                    <span className={styles.icon}>⚖️</span>
                    <div>
                        <div className={styles.scalerTitle}>Servings & Quantity Scaler</div>
                        <div className={styles.scalerSubtitle}>
                            Dynamic in-memory recalculation for table & instructions. Original recipe is unchanged.
                        </div>
                    </div>
                </div>

                {isScaled && (
                    <button
                        className={styles.resetBtn}
                        onClick={onReset}
                        title="Reset back to original recipe servings"
                    >
                        ↺ Reset to Original ({effectiveBase})
                    </button>
                )}
            </div>

            <div className={styles.scalerControls}>
                <div className={styles.stepperGroup}>
                    <button
                        type="button"
                        className={styles.stepBtn}
                        onClick={handleStepDown}
                        disabled={currentServings <= 0.5}
                        aria-label="Decrease servings"
                    >
                        −
                    </button>

                    <div className={styles.inputWrapper}>
                        <input
                            type="number"
                            min="0.5"
                            step="0.5"
                            className={styles.servingsInput}
                            value={currentServings}
                            onChange={(e) => handleDirectInput(e.target.value)}
                        />
                        <span className={styles.servingsUnit}>
                            {currentServings === 1 ? 'serving' : 'servings'}
                        </span>
                    </div>

                    <button
                        type="button"
                        className={styles.stepBtn}
                        onClick={handleStepUp}
                        aria-label="Increase servings"
                    >
                        +
                    </button>
                </div>

                <div className={styles.multiplierBadge}>
                    <span className={styles.badgeLabel}>Scale:</span>
                    <strong className={styles.badgeValue}>
                        {multiplier === 1 ? '1.0x (base)' : `${Number(multiplier.toFixed(2))}x`}
                    </strong>
                    {baseServings != null && (
                        <span className={styles.baseLabel}>(base: {baseServings})</span>
                    )}
                </div>

                <div className={styles.presets}>
                    <button
                        type="button"
                        className={`${styles.presetBtn} ${Math.abs(multiplier - 0.5) < 0.05 ? styles.presetActive : ''}`}
                        onClick={() => setScalePreset(0.5)}
                    >
                        ½x
                    </button>
                    <button
                        type="button"
                        className={`${styles.presetBtn} ${Math.abs(multiplier - 1.0) < 0.05 ? styles.presetActive : ''}`}
                        onClick={() => setScalePreset(1.0)}
                    >
                        1x
                    </button>
                    <button
                        type="button"
                        className={`${styles.presetBtn} ${Math.abs(multiplier - 2.0) < 0.05 ? styles.presetActive : ''}`}
                        onClick={() => setScalePreset(2.0)}
                    >
                        2x
                    </button>
                    <button
                        type="button"
                        className={`${styles.presetBtn} ${Math.abs(multiplier - 3.0) < 0.05 ? styles.presetActive : ''}`}
                        onClick={() => setScalePreset(3.0)}
                    >
                        3x
                    </button>
                </div>
            </div>
        </div>
    )
}
