import { ReactNode, useEffect, useRef } from "react";
import { Button } from "./Button";
import styles from "./DynamicFormDialog.module.css";

interface DialogProps {
  open: boolean;
  title: string;
  onClose: () => void;
  onConfirm?: () => void;
  confirmLabel?: string;
  confirmVariant?: "primary" | "danger";
  footer?: ReactNode;
  leftAdditionalButton?: ReactNode;
  children: ReactNode;
  width?: string;
  height?: string;
}

export function DynamicFormDialog({
  open,
  title,
  onClose,
  onConfirm,
  confirmLabel = "Save",
  confirmVariant = "primary",
  footer,
  leftAdditionalButton,
  children,
  width = "min(90vw, 720px)",
  height,
}: DialogProps) {
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={styles.backdrop}
      ref={backdropRef}
      onClick={(e) => {
        if (e.target === backdropRef.current) onClose();
      }}
    >
      <div
        className={styles.dialog}
        style={{ width, height }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className={styles.header}>
          <span className={styles.title}>{title}</span>
          <button className={styles.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>
        <div className={styles.body}>{children}</div>
        {(footer ?? onConfirm) && (
          <div className={styles.footer}>
            {leftAdditionalButton && <span className={styles.leftAdditionalButton}>{leftAdditionalButton}</span>}

            <span className={styles.primaryButtons}>
              {footer ?? (
                <>
                  <Button variant="ghost" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button variant={confirmVariant} onClick={onConfirm}>
                    {confirmLabel}
                  </Button>
                </>
              )}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
