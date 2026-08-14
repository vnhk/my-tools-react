import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DataTable } from "../../components/table/DataTable";
import { DynamicFormDialog } from "../../components/ui/DynamicFormDialog";
import { NumberField } from "../../components/fields/NumberField";
import { TextField } from "../../components/fields/TextField";
import { TabNav } from "../../components/layout/TabNav";
import { useTableState } from "../../hooks/useTableState";
import { useTableActions } from "../../hooks/useTableActions";
import { useNotification } from "../../components/ui/Notification";
import { walletsApi, Wallet, WalletSnapshot } from "../../api/investments";
import type { Column } from "../../components/table/DataTable";
import styles from "./WalletDetailPage.module.css";
import { DynamicForm, validateFields } from "../../components/ui/DynamicForm";
import { Button } from "../../components/ui/Button";

const SNAPSHOT_COLUMNS: Column<WalletSnapshot>[] = [
  { key: "snapshotDate", header: "Date", sortable: true },
  {
    key: "portfolioValue",
    header: "Portfolio Value",
    sortable: true,
    render: (row) => (
      <span className={styles.value}>
        {Number(row.portfolioValue).toFixed(2)}
      </span>
    ),
  },
  {
    key: "monthlyDeposit",
    header: "Deposit",
    sortable: true,
    render: (row) => Number(row.monthlyDeposit).toFixed(2),
  },
  {
    key: "monthlyWithdrawal",
    header: "Withdrawal",
    sortable: true,
    render: (row) => Number(row.monthlyWithdrawal).toFixed(2),
  },
  {
    key: "monthlyEarnings",
    header: "Earnings",
    sortable: true,
    render: (row) => {
      const v = Number(row.monthlyEarnings);
      return (
        <span className={v >= 0 ? styles.positive : styles.negative}>
          {v >= 0 ? "+" : ""}
          {v.toFixed(2)}
        </span>
      );
    },
  },
  { key: "notes", header: "Notes" },
];

const EMPTY_SNAPSHOT: Partial<WalletSnapshot> = {
  snapshotDate: new Date().toISOString().slice(0, 10),
  portfolioValue: 0,
  monthlyDeposit: 0,
  monthlyWithdrawal: 0,
  monthlyEarnings: 0,
  notes: "",
};

const EMPTY_WALLET: Partial<Wallet> = {};

export function WalletDetailPage() {
  const { walletId } = useParams<{ walletId: string }>();
  const { showSuccess, showError } = useNotification();
  const table = useTableState(
    { sortBy: "snapshotDate", sortDir: "desc" },
    `wallet-snapshots-${walletId}`
  );

  const navigate = useNavigate();

  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [snapshots, setSnapshots] = useState<WalletSnapshot[]>([]);
  const [metrics, setMetrics] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [snapshotsDialogOpen, setSnapshotDialogOpen] = useState(false);
  const [walletDialogOpen, setWalletDialogOpen] = useState(false);
  const [editSnapshotItem, setEditSnapshotItem] = useState<
    Partial<WalletSnapshot>
  >(EMPTY_SNAPSHOT);
  const [editWalletItem, setEditWalletItem] = useState<Partial<Wallet>>(
    EMPTY_WALLET
  );

  const load = () => {
    if (!walletId) return;
    walletsApi
      .getById(walletId)
      .then((res) => {
        setWallet(res.data);
      })
      .catch(() => {});
    walletsApi
      .getMetrics(walletId)
      .then((res) => setMetrics(res.data))
      .catch(() => {});
    loadSnapshots();
  };

  useEffect(() => {
    load();
  }, [walletId]);

  const loadSnapshots = () => {
    if (!walletId) return;
    setLoading(true);
    walletsApi
      .getSnapshots(walletId)
      .then((res) => setSnapshots(res.data))
      .finally(() => setLoading(false));
  };

  const sortedSnapshots = [...snapshots].sort((a, b) => {
    const cmp = a.snapshotDate.localeCompare(b.snapshotDate);
    return table.sortDir === "desc" ? -cmp : cmp;
  });

  const openSnapshotEdit = (item: Partial<WalletSnapshot>) => {
    setEditSnapshotItem(item);
    setSnapshotDialogOpen(true);
  };

  const actions = useTableActions<WalletSnapshot>({
    onDelete: async (selected) => {
      for (const s of selected)
        await walletsApi.deleteSnapshot(walletId!, s.id);
    },
    onEdit: openSnapshotEdit,
    onRefresh: loadSnapshots,
  });

  const handleSnapshotSave = async () => {
    if (!walletId) return;
    try {
      if (editSnapshotItem.id) {
        await walletsApi.updateSnapshot(
          walletId,
          editSnapshotItem.id,
          editSnapshotItem
        );
      } else {
        await walletsApi.createSnapshot(walletId, editSnapshotItem);
      }
      showSuccess("Saved");
      setSnapshotDialogOpen(false);
      loadSnapshots();
      walletsApi
        .getMetrics(walletId)
        .then((res) => setMetrics(res.data))
        .catch(() => {});
    } catch {
      showError("Failed to save snapshot");
    }
  };

  const handleWalletSave = async () => {
    const errors = validateFields(
      "Wallet",
      editWalletItem as Record<string, unknown>
    );
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    try {
      if (editWalletItem.id) {
        await walletsApi.update(editWalletItem.id, editWalletItem);
      }
      showSuccess("Saved");
      setWalletDialogOpen(false);
      load();
    } catch {
      showError("Failed to save wallet");
    }
  };

  const tabs = [
    { path: "/invest-track/assets", label: "← Wallets" },
    {
      path: `/invest-track/wallets/${walletId}`,
      label: wallet?.name ?? "Wallet",
    },
  ];

  const deleteWallet = async (id: string) => {
    await walletsApi.delete(id);
    showSuccess(`Wallet ${wallet?.name} deleted!`);
    navigate(`/invest-track/assets`);
  };

  const fmtNum = (v: unknown) => (v != null ? Number(v).toFixed(2) : "—");
  const fmtPct = (v: unknown) => (v != null ? `${Number(v).toFixed(2)}%` : "—");

  return (
    <div className={styles.page}>
      <TabNav tabs={tabs} />

      {wallet && (
        <div className={styles.kpiRow}>
          <div className={styles.kpi}>
            <span className={styles.kpiLabel}>Name</span>
            <span className={styles.kpiValue}>
              {wallet.name} <hr /> {wallet.description}
            </span>
          </div>
          <div className={styles.kpi}>
            <span className={styles.kpiLabel}>Current Value</span>
            <span className={styles.kpiValue}>
              {fmtNum(wallet.currentValue)} <hr /> {wallet.currency}
            </span>
          </div>
          <div className={styles.kpi}>
            <span className={styles.kpiLabel}>Total Deposits</span>
            <span className={styles.kpiValue}>
              {fmtNum(wallet.totalDeposits)} <hr /> {wallet.currency}
            </span>
          </div>
          <div className={styles.kpi}>
            <span className={styles.kpiLabel}>Total Earnings</span>
            <span
              className={[
                styles.kpiValue,
                Number(wallet.totalEarnings) >= 0
                  ? styles.positive
                  : styles.negative,
              ].join(" ")}
            >
              {fmtNum(wallet.totalEarnings)} <hr /> {wallet.currency}
            </span>
          </div>
          <div className={styles.kpi}>
            <span className={styles.kpiLabel}>Return Rate</span>
            <span
              className={[
                styles.kpiValue,
                Number(wallet.returnRate) >= 0
                  ? styles.positive
                  : styles.negative,
              ].join(" ")}
            >
              {fmtPct(wallet.returnRate)}
            </span>
          </div>
          {metrics.twr != null && (
            <div className={styles.kpi}>
              <span className={styles.kpiLabel}>TWR</span>
              <span
                className={[
                  styles.kpiValue,
                  Number(metrics.twr) >= 0 ? styles.positive : styles.negative,
                ].join(" ")}
              >
                {fmtPct(metrics.twr)}
              </span>
            </div>
          )}
          {metrics.cagr != null && (
            <div className={styles.kpi}>
              <span className={styles.kpiLabel}>CAGR</span>
              <span
                className={[
                  styles.kpiValue,
                  Number(metrics.cagr) >= 0 ? styles.positive : styles.negative,
                ].join(" ")}
              >
                {fmtPct(metrics.cagr)}
              </span>
            </div>
          )}

          {wallet && (
            <div className={styles.kpi}>
              <span
                className={styles.kpiLabel}
                style={{ display: "flex", gap: 10 }}
              >
                <Button
                  variant="secondary"
                  onClick={() => {
                    setEditWalletItem(wallet);
                    setWalletDialogOpen(true);
                  }}
                >
                  Edit
                </Button>

                <Button
                  variant="danger"
                  onClick={() => {
                    if (confirm("Are you sure you want to delete?")) {
                      deleteWallet(wallet.id);
                    }
                  }}
                >
                  Delete
                </Button>
              </span>
            </div>
          )}
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
        title={editWalletItem?.id ? "Edit Snapshot" : "New Snapshot"}
        onClose={() => setWalletDialogOpen(false)}
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
            label="Portfolio Value"
            value={editSnapshotItem.portfolioValue ?? 0}
            onChange={(v) =>
              setEditSnapshotItem((s) => ({
                ...s,
                portfolioValue: v === "" ? 0 : v,
              }))
            }
          />
          <NumberField
            label="Monthly Deposit"
            value={editSnapshotItem.monthlyDeposit ?? 0}
            onChange={(v) =>
              setEditSnapshotItem((s) => ({
                ...s,
                monthlyDeposit: v === "" ? 0 : v,
              }))
            }
          />
          <NumberField
            label="Monthly Withdrawal"
            value={editSnapshotItem.monthlyWithdrawal ?? 0}
            onChange={(v) =>
              setEditSnapshotItem((s) => ({
                ...s,
                monthlyWithdrawal: v === "" ? 0 : v,
              }))
            }
          />
          <NumberField
            label="Monthly Earnings"
            value={editSnapshotItem.monthlyEarnings ?? 0}
            onChange={(v) =>
              setEditSnapshotItem((s) => ({
                ...s,
                monthlyEarnings: v === "" ? 0 : v,
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
        open={walletDialogOpen}
        title={"Edit Wallet"}
        onClose={() => setWalletDialogOpen(false)}
        onConfirm={handleWalletSave}
        width="min(90vw, 720px)"
      >
        <DynamicForm
          entityName="Wallet"
          mode={"edit"}
          values={editWalletItem}
          onChange={(field, value) =>
            setEditWalletItem((s) => ({ ...s, [field]: value }))
          }
          errors={formErrors}
        />
      </DynamicFormDialog>
    </div>
  );
}
