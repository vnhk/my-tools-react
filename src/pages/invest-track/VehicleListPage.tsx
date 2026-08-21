import { useEffect, useState } from "react";
import { DynamicFormDialog } from "../../components/ui/DynamicFormDialog";
import { DynamicForm, validateFields } from "../../components/ui/DynamicForm";
import { useNotification } from "../../components/ui/Notification";
import { Vehicle, vehicleApi } from "../../api/investments";
import { toPage } from "../../api/crud";
import styles from "./AssetsPage.module.css";
import { AssetCard } from "./AssetCard";
import {
  FaBiking,
  FaCar,
  FaCarAlt,
  FaMotorcycle,
  FaPlus,
} from "react-icons/fa";
import { Button } from "../../components/ui/Button";

export function VehicleListPage() {
  const { showSuccess, showError } = useNotification();
  const [rows, setRows] = useState<Vehicle[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Partial<Vehicle>>(empty());
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const load = () => {
    vehicleApi
      .getAll({
        page: 0,
        size: 100,
        sort: "brand",
        direction: "ASC",
      })
      .then((res) => {
        const p = toPage(res.data);
        setRows(p.content);
      });
  };

  useEffect(load, []);

  function empty(): Partial<Vehicle> {
    return {};
  }

  const handleSave = async () => {
    const errors = validateFields(
      "Vehicle",
      editItem as Record<string, unknown>
    );
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    try {
      if (editItem.id) {
        await vehicleApi.update(editItem.id, editItem);
      } else {
        await vehicleApi.create(editItem);
      }
      showSuccess("Saved");
      setDialogOpen(false);
      load();
    } catch {
      showError("Failed to save vehicle");
    }
  };

  const renderIcon = (item: Vehicle) => {
    switch (item.vehicleType) {
      case "Car":
        return <FaCar />;
      case "Bike":
        return <FaBiking />;
      case "Motocycle":
        return <FaMotorcycle />;
      default:
        return <FaCarAlt />;
    }
  };

  const renderSubtitle = (item: Vehicle) => {
    return renderSubtitleBase(item.productionYear + '', item.description);
  };

  const renderSubtitleBase = (productionYear: string, description: string | null) => {
    return (
      <span>
        {productionYear}
        {<br />}
        {description}
      </span>
    );
  };

  const calculateTrend = (item: Vehicle) => {
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

  return (
    <div className={styles.page}>
      <div className={styles.cardContainer}>
        {rows.map((key) => (
          <AssetCard
            key={key.id}
            icon={renderIcon(key)}
            title={key.brand + " " + key.model}
            subtitle={renderSubtitle(key)}
            value={key.currentValue ? key.currentValue + " zł" : "0 zł"}
            trend={calculateTrend(key)}
            onClick={() => {
              setEditItem(key);
              setDialogOpen(true);
            }}
          />
        ))}
        <AssetCard
          icon={<FaPlus />}
          title="New Vehicle"
          subtitle={renderSubtitleBase("Production Year", "Description")}
          value="0 zł"
          variant="add"
          onClick={() => {
            setEditItem(empty());
            setDialogOpen(true);
          }}
        />
      </div>

      <DynamicFormDialog
        open={dialogOpen}
        title={editItem.id ? "Edit Vehicle" : "New Vehicle"}
        onClose={() => setDialogOpen(false)}
        leftAdditionalButton={
          <Button
            variant="danger"
            onClick={async () => {
              if (
                editItem.id &&
                confirm("Are you sure you want to delete this vehicle?")
              ) {
                try {
                  await vehicleApi.delete(editItem.id);

                  showSuccess("Vehicle has been deleted!");
                  setDialogOpen(false);
                  load();
                } catch {
                  showError("Failed to delete vehicle");
                }
              }
            }}
          >
            Delete Vehicle
          </Button>
        }
        onConfirm={handleSave}
        width="min(90vw, 720px)"
      >
        <DynamicForm
          entityName="Vehicle"
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
