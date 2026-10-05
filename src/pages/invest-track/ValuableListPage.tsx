import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DynamicFormDialog } from "../../components/ui/DynamicFormDialog";
import { DynamicForm, validateFields } from "../../components/ui/DynamicForm";
import { useNotification } from "../../components/ui/Notification";
import { Valuable, valuableApi } from "../../api/investments";
import { toPage } from "../../api/crud";
import styles from "./AssetsPage.module.css";
import { FaLaptop, FaPlus } from "react-icons/fa";
import { FaShield } from "react-icons/fa6";
import { AssetCard } from "./AssetCard";
import { calculateValue } from "./AssetsPage";

export function ValuableListPage() {
  const navigate = useNavigate();
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
    return (
      <span>
        {item.valuableType}
        {item.description && <br />}
        {item.description}
      </span>
    );
  };

  const calculateTrend = (item: Valuable) => {
    return item.returnRate ?? 0;
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
      .catch(() => {});
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
            title={key.name || key.valuableType}
            subtitle={renderSubtitle(key)}
            value={calculateValue(key.currentValue, "PLN")}
            trend={calculateTrend(key)}
            onClick={() => {
              navigate(`/invest-track/valuable/${key.id}`);
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
