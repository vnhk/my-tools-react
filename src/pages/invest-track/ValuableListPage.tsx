import { useEffect, useState } from "react";
import { DynamicFormDialog } from "../../components/ui/DynamicFormDialog";
import { DynamicForm, validateFields } from "../../components/ui/DynamicForm";
import { useNotification } from "../../components/ui/Notification";
import { Valuable, valuableApi } from "../../api/investments";
import { toPage } from "../../api/crud";
import styles from "./AssetsPage.module.css";
import { FaLaptop, FaPlus } from "react-icons/fa";
import { FaShield } from "react-icons/fa6";
import { AssetCard } from "./AssetCard";
import { Button } from "../../components/ui/Button";
import { calculateValue } from './AssetsPage.tsx'

export function ValuableListPage() {
  const { showSuccess, showError } = useNotification();
  const [rows, setRows] = useState<Valuable[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Partial<Valuable>>(empty());
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const renderIcon = (item: Valuable) => {
    switch (item.valuableType) {
      case "Gold":
        return <FaShield />;
      case "Electronics":
        return <FaLaptop />;
      default:
        return <FaShield />;
    }
  };

  const renderSubtitle = (item: Valuable) => {
    return <span>{item.description}</span>;
  };

  const calculateTrend = (item: Valuable) => {
    if (
      (item.purchaseCosts ? item.purchaseCosts : 0) == 0 &&
      item.purchasePrice == 0
    ) {
      return 0;
    }

    let totalCost =
      (item.purchaseCosts ? item.purchaseCosts : 0) + item.purchasePrice;
    return ((item.currentValue - totalCost) / totalCost) * 100;
  };

  const load = () => {
    valuableApi
      .getAll({
        page: 0,
        size: 100,
        sort: "valuableType",
        direction: "ASC",
      })
      .then((res) => {
        const p = toPage(res.data);
        setRows(p.content);
      })
      .finally();
  };

  useEffect(load, []);

  function empty(): Partial<Valuable> {
    return {};
  }

  const handleSave = async () => {
    const errors = validateFields(
      "Valuable",
      editItem as Record<string, unknown>
    );
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    try {
      if (editItem.id) {
        await valuableApi.update(editItem.id, editItem);
      } else {
        await valuableApi.create(editItem);
      }
      showSuccess("Saved");
      setDialogOpen(false);
      load();
    } catch {
      showError("Failed to save Valuable");
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.cardContainer}>
        {rows.map((key) => (
          <AssetCard
            key={key.id}
            icon={renderIcon(key)}
            title={key.valuableType}
            subtitle={renderSubtitle(key)}
            value={calculateValue(key.currentValue, 'PLN')}
            trend={calculateTrend(key)}
            onClick={() => {
              setEditItem(key);
              setDialogOpen(true);
            }}
          />
        ))}
        <AssetCard
          icon={<FaPlus />}
          title="New Item"
          value="0zł"
          variant="add"
          subtitle="Description"
          onClick={() => {
            setEditItem(empty());
            setDialogOpen(true);
          }}
        />
      </div>

      <DynamicFormDialog
        open={dialogOpen}
        title={editItem.id ? "Edit Valuable" : "New Valuable"}
        onClose={() => setDialogOpen(false)}
        onConfirm={handleSave}
        width="min(90vw, 720px)"
        leftAdditionalButton={
          <Button
            variant="danger"
            onClick={async () => {
              if (
                editItem.id &&
                confirm("Are you sure you want to delete this item?")
              ) {
                try {
                  await valuableApi.delete(editItem.id);

                  showSuccess("Item has been deleted!");
                  setDialogOpen(false);
                  load();
                } catch {
                  showError("Failed to delete item");
                }
              }
            }}
          >
            Delete Item
          </Button>
        }
      >
        <DynamicForm
          entityName="Valuable"
          mode={editItem.id ? "edit" : "save"}
          values={editItem as Record<string, unknown>}
          onChange={(field, value) =>
            setEditItem((s) => ({ ...s, [field]: value }))
          }
          errors={formErrors}
        />
      </DynamicFormDialog>
    </div>
  );
}
