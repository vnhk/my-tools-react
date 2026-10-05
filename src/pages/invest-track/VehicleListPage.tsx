import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { calculateValue } from "./AssetsPage";

export function VehicleListPage() {
  const navigate = useNavigate();
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
      })
      .catch(() => {});
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
      case "Motorcycle":
      case "Motocycle":
        return <FaMotorcycle />;
      default:
        return <FaCarAlt />;
    }
  };

  const renderSubtitle = (item: Vehicle) => {
    return (
      <span>
        {item.vehicleType} • {item.productionYear}
        {item.description && <br />}
        {item.description}
      </span>
    );
  };

  const calculateTrend = (item: Vehicle) => {
    return item.returnRate ?? 0;
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
            value={calculateValue(key.currentValue, "PLN")}
            trend={calculateTrend(key)}
            onClick={() => {
              navigate(`/invest-track/vehicle/${key.id}`);
            }}
          />
        ))}
        <AssetCard
          icon={<FaPlus />}
          title="New Vehicle"
          subtitle="Add vehicle"
          value="0zł"
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
