import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DynamicFormDialog } from '../../components/ui/DynamicFormDialog.tsx'
import { DynamicForm, validateFields } from '../../components/ui/DynamicForm'
import { useNotification } from '../../components/ui/Notification'
import { walletsApi, type Wallet } from '../../api/investments'
import { toPage } from '../../api/crud'
import styles from './AssetsPage.module.css'
import { AssetCard } from './AssetCard.tsx'
import { FaChartLine, FaMoneyBill, FaPiggyBank, FaPlus } from 'react-icons/fa'
import { FcDataEncryption } from 'react-icons/fc'
import { calculateValue } from './AssetsPage.tsx'


const EMPTY_WALLET: Partial<Wallet> = {
  name: '', description: '', currency: 'PLN', riskLevel: 'Medium Risk', walletType: 'INVESTMENT', compareWithSP500: true,
}

export function WalletListPage() {
  const navigate = useNavigate()
  const { showSuccess, showError } = useNotification()
  const [rows, setRows] = useState<Wallet[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editItem, setEditItem] = useState<Partial<Wallet>>(EMPTY_WALLET)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  const load = () => {
    walletsApi
      .getAll({ page: 0, size: 100, sort: 'name', direction: 'ASC'})
      .then((res) => { const p = toPage(res.data); setRows(p.content);})
  }

  //"INVESTMENT", "SAVINGS", "BONDS", "CRYPTO", "CASH" 
    const renderIcon = (item: Wallet) => {
      console.log(item.walletType)
      switch(item.walletType) {
        case "INVESTMENT": {
          return <FaChartLine/>
        }
        case "BONDS":
        case "SAVINGS": {
          return <FaPiggyBank/>
        }
        case "CASH" : {
           return <FaMoneyBill/>
        }
        case "CRYPTO": {
            return <FcDataEncryption/>
        }
      }
    };
  
    const renderSubtitle = (item: Wallet) => {
      return renderSubtitleBase(item.riskLevel, item.walletType, item.description)
    };
  
    const renderSubtitleBase = (riskLevel:string, walletType:string, description:string | null) => {
      return (
        <span>
          {riskLevel}
          {<br />}
          {walletType}
          {<br />}
          {description}
          <br/>
        </span>
      );
    };

    const calculateTrend = (item: Wallet) => {
      return item.returnRate;
    };

  useEffect(load, []);

  const handleSave = async () => {
    const errors = validateFields('Wallet', editItem as Record<string, unknown>)
    if (Object.keys(errors).length > 0) { setFormErrors(errors); return }
    try {
      if (editItem.id) {
        await walletsApi.update(editItem.id, editItem)
      } else {
        await walletsApi.create(editItem)
      }
      showSuccess('Saved')
      setDialogOpen(false)
      load()
    } catch {
      showError('Failed to save wallet')
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.cardContainer}>
        {rows.map((key) => (
          <AssetCard
            key={key.id}
            icon={renderIcon(key)}
            title={key.name}
            subtitle={renderSubtitle(key)}
            value={calculateValue(key.currentValue, key.currency)}
            trend={calculateTrend(key)}
            onClick={() => {
              navigate(`/invest-track/wallets/${key.id}`)
            }}
          />
        ))}
        <AssetCard
          icon={<FaPlus />}
          title="New Wallet"
          subtitle={renderSubtitleBase('Risk', 'Type', 'Description')}
          value='0zł'
          variant='add'
          onClick={() => {
            setEditItem(EMPTY_WALLET);
            setDialogOpen(true);
          }}
        />
      </div>

      <DynamicFormDialog
        open={dialogOpen}
        title={editItem.id ? 'Edit Wallet' : 'New Wallet'}
        onClose={() => setDialogOpen(false)}
        onConfirm={handleSave}
        width="min(90vw, 720px)"
      >
        <DynamicForm
          entityName="Wallet"
          mode={editItem.id ? 'edit' : 'save'}
          values={editItem as Record<string, unknown>}
          onChange={(field, value) => setEditItem((s) => ({ ...s, [field]: value }))}
          errors={formErrors}
        />
      </DynamicFormDialog>
    </div>
  )
}
