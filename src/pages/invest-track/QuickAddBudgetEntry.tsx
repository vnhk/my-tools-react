import { useNotification } from "../../components/ui/Notification.tsx";
import { useEffect, useRef, useState } from "react";
import { budgetEntriesApi, BudgetEntry } from "../../api/investments.ts";
import { validateFields } from "../../api/entityConfig.ts";
import { DynamicFormDialog } from "../../components/ui/DynamicFormDialog.tsx";
import { DynamicForm } from "../../components/ui/DynamicForm.tsx";
import styles from "./BudgetEntriesPage.module.css";

interface Props {
  categoryV: string;
  typeV: string;
  paymentMethodV: string;
  onFinish: () => void
}

export function QuickAddBudgetEntry({
  categoryV,
  typeV,
  paymentMethodV,
  onFinish
}: Props) {
  const [defaultEntry, setDefaultEntry] = useState<Partial<BudgetEntry>>();
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const { showSuccess, showError } = useNotification();

  const handleSave = async () => {
    const errors = validateFields(
      "BudgetEntry",
      defaultEntry as Record<string, unknown>,
      "save"
    );
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    try {
      await budgetEntriesApi.create(defaultEntry as Record<string, undefined>);
      showSuccess("Saved");
      onFinish()
    } catch {
      showError("Failed to save");
    }

  };

  useEffect(() => {
    const nameV = categoryV;

    const entryDateV = new Date().toISOString().slice(0, 10);

    setDefaultEntry({
      category: categoryV,
      entryDate: entryDateV,
      currency: "PLN",
      name: nameV,
      entryType: typeV,
      paymentMethod: paymentMethodV,
      isRecurring: false,
    });
  });

  return (
    <div className={styles.treeTabWrap}>
      <DynamicFormDialog
        open={true}
        title="Quick Add Entry"
        onClose={() => {}}
        onConfirm={handleSave}
        width="min(90vw, 720px)"
      >
        <div
          className={styles.dialogField}
          style={{ maxHeight: "60vh", overflowY: "auto" }}
        >
          <DynamicForm
            entityName="BudgetEntry"
            mode="save"
            values={defaultEntry as Record<string, unknown>}
            onChange={(field, value) =>
              setDefaultEntry((s) => ({ ...s, [field]: value }))
            }
            errors={formErrors}
            skip={["category", "entryType", "isRecurring"]}
          />
        </div>
      </DynamicFormDialog>
    </div>
  );
}
