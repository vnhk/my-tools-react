import { useEffect, useState } from "react";
import { DynamicFormDialog } from "../../components/ui/DynamicFormDialog";
import { DynamicForm, validateFields } from "../../components/ui/DynamicForm";
import { useNotification } from "../../components/ui/Notification";
import { RealEstate, realEstateApi } from "../../api/investments";
import { toPage } from "../../api/crud";
import styles from "./AssetsPage.module.css";
import { AssetCard } from "./AssetCard";
import { FaBuilding, FaHome, FaPlus, FaWarehouse } from "react-icons/fa";
import { Button } from "../../components/ui/Button";
import { calculateValue } from './AssetsPage.tsx'

export function RealEstateListPage() {
  const { showSuccess, showError } = useNotification();
  const [rows, setRows] = useState<RealEstate[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Partial<RealEstate>>(empty());
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const load = () => {
    realEstateApi
      .getAll({
        page: 0,
        size: 100,
        sort: "name",
        direction: "ASC",
      })
      .then((res) => {
        const p = toPage(res.data);
        setRows(p.content);
      });
  };

  useEffect(load, []);

  function empty(): Partial<RealEstate> {
    return { name: "" };
  }

  const handleSave = async () => {
    const errors = validateFields(
      "RealEstate",
      editItem as Record<string, unknown>
    );
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    try {
      if (editItem.id) {
        await realEstateApi.update(editItem.id, editItem);
      } else {
        await realEstateApi.create(editItem);
      }
      showSuccess("Saved");
      setDialogOpen(false);
      load();
    } catch {
      showError("Failed to save real estate");
    }
  };

  const renderIcon = (item: RealEstate) => {
    switch (item.realEstateType) {
      case "Apartment":
        return <FaBuilding />;
      case "House":
        return <FaHome />;
      case "Garage":
        return <FaWarehouse />;
      default:
        return <FaBuilding />;
    }
  };

  const renderSubtitle = (item: RealEstate) => {
    return renderSubtitleBase(item.address, item.description)
  };

    const renderSubtitleBase = (address: string | null, description: string | null) => {
    return (
      <span>
        {address}
        {address && description && <br />}
        {description}
      </span>
    );
  };

  const calculateTrend = (item: RealEstate) => {
    let totalCost =
      (item.purchaseCosts ? item.purchaseCosts : 0) + item.purchasePrice;
    return ((item.currentValue - totalCost) / totalCost) * 100;
  };

  return (
    <div className={styles.page}>
      <div className={styles.cardContainer}>
        {rows.map((key) => (
          <AssetCard
            key={key.id}
            icon={renderIcon(key)}
            title={key.name}
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
          title="New Property"
          value="0zł"
          variant="add"
          subtitle={renderSubtitleBase("Adress", "Description")}
          onClick={() => {
            setEditItem(empty());
            setDialogOpen(true);
          }}
        />
      </div>

      <DynamicFormDialog
        open={dialogOpen}
        title={editItem.id ? "Edit Property" : "New Property"}
        onClose={() => setDialogOpen(false)}
        onConfirm={handleSave}
        width="min(90vw, 720px)"
        leftAdditionalButton={
          <Button
            variant="danger"
            onClick={async () => {
              if (
                editItem.id &&
                confirm("Are you sure you want to delete this asset?")
              ) {
                try {
                  await realEstateApi.delete(editItem.id);

                  showSuccess("Property has been deleted!");
                  setDialogOpen(false);
                  load();
                } catch {
                  showError("Failed to delete property");
                }
              }
            }}
          >
            Delete Asset
          </Button>
        }
      >
        <DynamicForm
          entityName="RealEstate"
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
