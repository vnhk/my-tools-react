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
import { Valuable, valuableApi } from "../../api/investments";
import { toPage } from "../../api/crud";
import styles from "./AssetsPage.module.css";

export function ValuableListPage() {
  const { showSuccess, showError } = useNotification();
  const table = useTableState(
    { sortBy: "valuableType", sortDir: "asc" },
    "Valuable-list"
  );
  const { filters, setFilter, clearFilters } = useEntityFilters();
  const [rows, setRows] = useState<Valuable[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Partial<Valuable>>(empty());
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const load = () => {
    setLoading(true);
    valuableApi
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

  const openEdit = (item: Partial<Valuable>) => {
    setEditItem(item);
    setFormErrors({});
    setDialogOpen(true);
  };

  const columns = [...buildColumnsFromConfig<Valuable>("Valuable")];

  const actions = useTableActions<Valuable>({
    onDelete: async (selected) => {
      for (const r of selected) await valuableApi.delete(r.id);
    },
    onEdit: openEdit,
    onRefresh: load,
  });

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
      <Toolbar>
        <ImportExportBar
          exportUrl="/invest-track/Valuable/export"
          importUrl="/invest-track/Valuable/import"
          entityLabel="RealEstate"
          onImportSuccess={load}
          filters={filters}
        />
        <EntityFilters
          entityName="Valuable"
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
        addLabel="New Valuable"
      />

      <Dialog
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
      </Dialog>
    </div>
  );
}
