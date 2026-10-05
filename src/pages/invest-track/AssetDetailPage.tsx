import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DataTable, type Column } from "../../components/table/DataTable";
import { DynamicFormDialog } from "../../components/ui/DynamicFormDialog";
import { NumberField } from "../../components/fields/NumberField";
import { TextField } from "../../components/fields/TextField";
import { TabNav } from "../../components/layout/TabNav";
import { useTableState } from "../../hooks/useTableState";
import { useTableActions } from "../../hooks/useTableActions";
import { useNotification } from "../../components/ui/Notification";
import {
  valuableApi,
  vehicleApi,
  realEstateApi,
  type AssetSnapshot,
  type Valuable,
  type Vehicle,
  type RealEstate,
} from "../../api/investments";
import styles from "./WalletDetailPage.module.css";
import { DynamicForm, validateFields } from "../../components/ui/DynamicForm";
import { Button } from "../../components/ui/Button";

type AssetType = "Valuable" | "Vehicle" | "RealEstate";

interface AssetDetailPageProps {
  assetType: AssetType;
}

const SNAPSHOT_COLUMNS: Column<AssetSnapshot>[] = [
  { key: "snapshotDate", header: "Date", sortable: true },
  {
    key: "assetValue",
    header: "Asset Value",
    sortable: true,
    render: (row) => (
      <span className={styles.value}>
        {Number(row.assetValue).toFixed(2)} zł
      </span>
    ),
  },
  { key: "notes", header: "Notes" },
];

const EMPTY_SNAPSHOT: Partial<AssetSnapshot> = {
  snapshotDate: new Date().toISOString().slice(0, 10),
  assetValue: 0,
  notes: "",
};

export function AssetDetailPage({ assetType }: AssetDetailPageProps) {
  const { id } = useParams<{ id: string }>();
  const { showSuccess, showError } = useNotification();
  const table = useTableState(
    { sortBy: "snapshotDate", sortDir: "desc" },
    `${assetType.toLowerCase()}-snapshots-${id}`
  );
  const navigate = useNavigate();

  const [asset, setAsset] = useState<Valuable | Vehicle | RealEstate | null>(null);
  const [snapshots, setSnapshots] = useState<AssetSnapshot[]>([]);
  const [metrics, setMetrics] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [snapshotsDialogOpen, setSnapshotDialogOpen] = useState(false);
  const [assetDialogOpen, setAssetDialogOpen] = useState(false);
  const [editSnapshotItem, setEditSnapshotItem] = useState<Partial<AssetSnapshot>>(EMPTY_SNAPSHOT);
  const [editAssetItem, setEditAssetItem] = useState<Record<string, unknown>>({});

  const api =
    assetType === "Valuable"
      ? valuableApi
      : assetType === "Vehicle"
      ? vehicleApi
      : realEstateApi;

  const load = () => {
    if (!id) return;
    api
      .getById(id)
      .then((res) => {
        setAsset(res.data as Valuable | Vehicle | RealEstate);
      })
      .catch(() => {});
    api
      .getMetrics(id)
      .then((res) => setMetrics(res.data))
      .catch(() => {});
    loadSnapshots();
  };

  useEffect(() => {
    load();
  }, [id, assetType]);

  const loadSnapshots = () => {
    if (!id) return;
    setLoading(true);
    api
      .getSnapshots(id)
      .then((res) => setSnapshots(res.data))
      .finally(() => setLoading(false));
  };

  const sortedSnapshots = [...snapshots].sort((a, b) => {
    const cmp = a.snapshotDate.localeCompare(b.snapshotDate);
    return table.sortDir === "desc" ? -cmp : cmp;
  });

  const openSnapshotEdit = (item: Partial<AssetSnapshot>) => {
    setEditSnapshotItem(item);
    setSnapshotDialogOpen(true);
  };

  const actions = useTableActions<AssetSnapshot>({
    onDelete: async (selected) => {
      for (const s of selected) {
        await api.deleteSnapshot(id!, s.id);
      }
    },
    onEdit: openSnapshotEdit,
    onRefresh: loadSnapshots,
  });

  const handleSnapshotSave = async () => {
    if (!id) return;
    try {
      if (editSnapshotItem.id) {
        await api.updateSnapshot(id, editSnapshotItem.id, editSnapshotItem);
      } else {
        await api.createSnapshot(id, editSnapshotItem);
      }
      showSuccess("Saved");
      setSnapshotDialogOpen(false);
      loadSnapshots();
      api
        .getMetrics(id)
        .then((res) => setMetrics(res.data))
        .catch(() => {});
      api
        .getById(id)
        .then((res) => setAsset(res.data as Valuable | Vehicle | RealEstate))
        .catch(() => {});
    } catch {
      showError("Failed to save snapshot");
    }
  };

  const handleAssetSave = async () => {
    const errors = validateFields(assetType, editAssetItem);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    try {
      if (id) {
        await api.update(id, editAssetItem as any);
      }
      showSuccess("Saved");
      setAssetDialogOpen(false);
      load();
    } catch {
      showError(`Failed to save ${assetType}`);
    }
  };

  const getAssetName = (): string => {
    if (!asset) return assetType;
    if (assetType === "Valuable") {
      const v = asset as Valuable;
      return v.name || v.valuableType || "Valuable";
    }
    if (assetType === "Vehicle") {
      const v = asset as Vehicle;
      return `${v.brand || ""} ${v.model || ""}`.trim() || "Vehicle";
    }
    if (assetType === "RealEstate") {
      const r = asset as RealEstate;
      return r.name || "Real Estate";
    }
    return assetType;
  };

  const getAssetSubtitle = (): string => {
    if (!asset) return "";
    if (assetType === "Valuable") {
      const v = asset as Valuable;
      return [v.valuableType, v.description].filter(Boolean).join(" • ");
    }
    if (assetType === "Vehicle") {
      const v = asset as Vehicle;
      return [v.vehicleType, v.productionYear, v.description].filter(Boolean).join(" • ");
    }
    if (assetType === "RealEstate") {
      const r = asset as RealEstate;
      return [r.realEstateType, r.address, r.description].filter(Boolean).join(" • ");
    }
    return "";
  };

  const deleteAsset = async () => {
    if (!id) return;
    await api.delete(id);
    showSuccess(`${getAssetName()} deleted!`);
    navigate("/invest-track/assets");
  };

  const tabs = [
    { path: "/invest-track/assets", label: "← Assets" },
    {
      path: `/invest-track/${assetType.toLowerCase()}/${id}`,
      label: getAssetName(),
    },
  ];

  const fmtNum = (v: unknown) => (v != null ? Number(v).toFixed(2) : "—");
  const fmtPct = (v: unknown) => (v != null ? `${Number(v).toFixed(2)}%` : "—");

  const currentValue = (metrics.currentValue ?? asset?.currentValue) as number | undefined;
  const initialValue = (metrics.initialValue ?? asset?.initialValue) as number | undefined;
  const returnRate = (metrics.returnRate ?? asset?.returnRate) as number | undefined;
  const totalGain = (metrics.totalGain ??
    (currentValue != null && initialValue != null ? currentValue - initialValue : null)) as
    | number
    | null;

  return (
    <div className={styles.page}>
      <TabNav tabs={tabs} />

      {asset && (
        <div className={styles.kpiRow}>
          <div className={styles.kpi}>
            <span className={styles.kpiLabel}>Name</span>
            <span className={styles.kpiValue}>
              {getAssetName()} <hr /> {getAssetSubtitle()}
            </span>
          </div>

          <div className={styles.kpi}>
            <span className={styles.kpiLabel}>Current Value</span>
            <span className={styles.kpiValue}>
              {fmtNum(currentValue)} <hr /> PLN
            </span>
          </div>

          <div className={styles.kpi}>
            <span className={styles.kpiLabel}>Initial Value</span>
            <span className={styles.kpiValue}>
              {fmtNum(initialValue)} <hr /> PLN
            </span>
          </div>

          <div className={styles.kpi}>
            <span className={styles.kpiLabel}>Total Gain / Loss</span>
            <span
              className={[
                styles.kpiValue,
                totalGain != null && totalGain >= 0 ? styles.positive : styles.negative,
              ].join(" ")}
            >
              {totalGain != null ? (totalGain >= 0 ? "+" : "") + fmtNum(totalGain) : "—"} <hr /> PLN
            </span>
          </div>

          <div className={styles.kpi}>
            <span className={styles.kpiLabel}>Return Rate</span>
            <span
              className={[
                styles.kpiValue,
                returnRate != null && Number(returnRate) >= 0
                  ? styles.positive
                  : styles.negative,
              ].join(" ")}
            >
              {returnRate != null ? (Number(returnRate) >= 0 ? "+" : "") + fmtPct(returnRate) : "—"}
            </span>
          </div>

          <div className={styles.kpi}>
            <span
              className={styles.kpiLabel}
              style={{ display: "flex", gap: 10, marginTop: "auto" }}
            >
              <Button
                variant="secondary"
                onClick={() => {
                  setEditAssetItem(asset as unknown as Record<string, unknown>);
                  setAssetDialogOpen(true);
                }}
              >
                Edit
              </Button>

              <Button
                variant="danger"
                onClick={() => {
                  if (confirm(`Are you sure you want to delete ${getAssetName()}?`)) {
                    deleteAsset();
                  }
                }}
              >
                Delete
              </Button>
            </span>
          </div>
        </div>
      )}

      <DataTable
        columns={SNAPSHOT_COLUMNS}
        rows={sortedSnapshots}
        rowKey={(r) => r.id}
        loading={loading}
        page={table.page}
        pageSize={table.pageSize}
        totalElements={snapshots.length}
        onPageChange={table.setPage}
        onPageSizeChange={table.setPageSize}
        sortBy={table.sortBy}
        sortDir={table.sortDir}
        onSort={table.toggleSort}
        actions={actions}
        onRowClick={openSnapshotEdit}
        onAdd={() => openSnapshotEdit({ ...EMPTY_SNAPSHOT })}
        addLabel="Add Snapshot"
      />

      <DynamicFormDialog
        open={snapshotsDialogOpen}
        title={editSnapshotItem?.id ? "Edit Valuation Snapshot" : "New Valuation Snapshot"}
        onClose={() => setSnapshotDialogOpen(false)}
        onConfirm={handleSnapshotSave}
        width="560px"
      >
        <div className={styles.form}>
          <TextField
            label="Snapshot Date"
            type="date"
            value={editSnapshotItem.snapshotDate ?? ""}
            onChange={(e) =>
              setEditSnapshotItem((s) => ({
                ...s,
                snapshotDate: e.target.value,
              }))
            }
          />
          <NumberField
            label="Asset Value (PLN)"
            value={editSnapshotItem.assetValue ?? 0}
            onChange={(v) =>
              setEditSnapshotItem((s) => ({
                ...s,
                assetValue: v === "" ? 0 : v,
              }))
            }
          />
          <TextField
            label="Notes"
            value={editSnapshotItem.notes ?? ""}
            onChange={(e) =>
              setEditSnapshotItem((s) => ({ ...s, notes: e.target.value }))
            }
          />
        </div>
      </DynamicFormDialog>

      <DynamicFormDialog
        open={assetDialogOpen}
        title={`Edit ${assetType}`}
        onClose={() => setAssetDialogOpen(false)}
        onConfirm={handleAssetSave}
        width="min(90vw, 720px)"
      >
        <DynamicForm
          entityName={assetType}
          mode="edit"
          values={editAssetItem}
          onChange={(field, value) =>
            setEditAssetItem((s) => ({ ...s, [field]: value }))
          }
          errors={formErrors}
        />
      </DynamicFormDialog>
    </div>
  );
}
