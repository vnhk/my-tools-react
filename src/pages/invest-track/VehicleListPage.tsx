import { useEffect, useState } from "react";
import { DataTable } from "../../components/table/DataTable";
import { Dialog } from "../../components/ui/Dialog";
import { DynamicForm, validateFields } from "../../components/ui/DynamicForm";
import { buildColumnsFromConfig } from "../../components/table/configColumns";
import { useTableState } from "../../hooks/useTableState";
import { useTableActions } from "../../hooks/useTableActions";
import { useEntityFilters } from "../../hooks/useEntityFilters";
import { useNotification } from "../../components/ui/Notification";
import { EntityFilters } from "../../components/ui/EntityFilters";
import { ImportExportBar } from "../../components/ui/ImportExportBar";
import { Toolbar } from "../../components/ui/Toolbar";
import { RealEstate, realEstateApi, Vehicle, vehicleApi } from "../../api/investments";
import { toPage } from "../../api/crud";
import styles from "./AssetsPage.module.css";

export function VehicleListPage() {
  const { showSuccess, showError } = useNotification();
  const table = useTableState(
    { sortBy: "model", sortDir: "asc" },
    "vehicle-list"
  );
  const { filters, setFilter, clearFilters } = useEntityFilters();
  const [rows, setRows] = useState<Vehicle[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Partial<Vehicle>>(empty());
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const load = () => {
    setLoading(true);
    vehicleApi
      .getAll({
        page: table.page,
        size: table.pageSize,
        sort: table.sortBy,
        direction: table.sortDir,
        ...filters,
      })
      .then((res) => {
        const p = toPage(res.data);
        setRows(p.content);
        setTotal(p.totalElements);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [
    table.page,
    table.pageSize,
    table.sortBy,
    table.sortDir,
    JSON.stringify(filters),
  ]);

  const openEdit = (item: Partial<Vehicle>) => {
    setEditItem(item);
    setFormErrors({});
    setDialogOpen(true);
  };

  const columns = [...buildColumnsFromConfig<Vehicle>("Vehicle")];

  const actions = useTableActions<Vehicle>({
    onDelete: async (selected) => {
      for (const r of selected) await vehicleApi.delete(r.id);
    },
    onEdit: openEdit,
    onRefresh: load,
  });

  function empty(): Partial<Vehicle> {
    return { };
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

  return (
    <div className={styles.page}>
      <Toolbar>
        <ImportExportBar
          exportUrl="/invest-track/vehicle/export"
          importUrl="/invest-track/vehicle/import"
          entityLabel="RealEstate"
          onImportSuccess={load}
          filters={filters}
        />
        <EntityFilters
          entityName="Vehicle"
          filters={filters}
          onFiltersChange={setFilter}
          onClear={clearFilters}
        />
      </Toolbar>
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        loading={loading}
        page={table.page}
        pageSize={table.pageSize}
        totalElements={total}
        onPageChange={table.setPage}
        onPageSizeChange={table.setPageSize}
        sortBy={table.sortBy}
        sortDir={table.sortDir}
        onSort={table.toggleSort}
        actions={actions}
        onRowClick={(item) => {
          setEditItem(item);
          setDialogOpen(true);
        }}
        onAdd={() => {
          setEditItem(empty());
          setDialogOpen(true);
        }}
        addLabel="New Vehicle"
      />

      <Dialog
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
      </Dialog>
    </div>
  );
}
