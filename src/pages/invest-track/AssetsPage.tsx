import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import "react-tabs/style/react-tabs.css";
import styles from "./AssetsPage.module.css";
import { WalletListPage } from "./WalletListPage";
import { RealEstateListPage } from "./RealEstateListPage";
import { VehicleListPage } from "./VehicleListPage";
import { ValuableListPage } from "./ValuableListPage";
import { FaWallet } from "react-icons/fa";
import { FaHome } from "react-icons/fa";
import { FaCar } from "react-icons/fa";
import { FaDemocrat } from "react-icons/fa";

export function AssetsPage() {
  return (
    <div className={styles.page}>
      <Tabs>
        <TabList>
          <Tab><FaWallet/></Tab>
          <Tab><FaHome/></Tab>
          <Tab><FaCar/></Tab>
          <Tab><FaDemocrat/></Tab>
        </TabList>

        <TabPanel>
          <WalletListPage></WalletListPage>
        </TabPanel>
        <TabPanel>
          <RealEstateListPage></RealEstateListPage>
        </TabPanel>
        <TabPanel>
          <VehicleListPage></VehicleListPage>
        </TabPanel>
        <TabPanel>
          <ValuableListPage></ValuableListPage>
        </TabPanel>
      </Tabs>
    </div>
  );
}
