import "react-tabs/style/react-tabs.css";
import styles from "./AssetsPage.module.css";
import { WalletListPage } from "./WalletListPage";
import { RealEstateListPage } from "./RealEstateListPage";
import { VehicleListPage } from "./VehicleListPage";
import { ValuableListPage } from "./ValuableListPage";

export function AssetsPage() {
  return (
    <div className={styles.page}>
      <br />
      <h2>Cash & Accounts</h2>
      <br />
      <WalletListPage></WalletListPage>
      <br />
      <hr />
      <h2>Real Estate</h2>
      <br />
      <RealEstateListPage></RealEstateListPage>
      <br />
      <hr />
      <h2>Vehicles</h2>
      <br />
      <VehicleListPage></VehicleListPage>
      <br />
      <hr />
      <h2>Valuables</h2>
      <br />
      <ValuableListPage></ValuableListPage>
    </div>
  );
}
