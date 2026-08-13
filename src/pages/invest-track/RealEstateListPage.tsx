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
import { RealEstate, realEstateApi } from "../../api/investments";
import { toPage } from "../../api/crud";
import styles from "./AssetsPage.module.css";

export function RealEstateListPage() {
  const { showSuccess, showError } = useNotification();
  const table = useTableState(
    { sortBy: "name", sortDir: "asc" },
    "real-estate-list"
  );
  const { filters, setFilter, clearFilters } = useEntityFilters();
  const [rows, setRows] = useState<RealEstate[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Partial<RealEstate>>(empty());
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const load = () => {
    setLoading(true);
    realEstateApi
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

  const openEdit = (item: Partial<RealEstate>) => {
    setEditItem(item);
    setFormErrors({});
    setDialogOpen(true);
  };

  const columns = [...buildColumnsFromConfig<RealEstate>("RealEstate")];

  const actions = useTableActions<RealEstate>({
    onDelete: async (selected) => {
      for (const r of selected) await realEstateApi.delete(r.id);
    },
    onEdit: openEdit,
    onRefresh: load,
  });

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

  return (
    <div className={styles.page}>
      <Toolbar>
        <ImportExportBar
          exportUrl="/invest-track/real-estate/export"
          importUrl="/invest-track/real-estate/import"
          entityLabel="RealEstate"
          onImportSuccess={load}
          filters={filters}
        />
        <EntityFilters
          entityName="RealEstate"
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
        addLabel="New Real Estate"
      />

      <Dialog
        open={dialogOpen}
        title={editItem.id ? "Edit Real Estate" : "New Real Estate"}
        onClose={() => setDialogOpen(false)}
        onConfirm={handleSave}
        width="min(90vw, 720px)"
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
      </Dialog>
    </div>
  );
}
