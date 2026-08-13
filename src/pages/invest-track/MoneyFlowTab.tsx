import { MoneyFlow } from "../../api/investments";

export function MoneyFlowTab({ data }: { data: MoneyFlow | undefined }) {
  return (
    <div>
      <div>{data?.fromDate} - {data?.toDate}</div>
      <div>Cash Flow: {data?.cashFlow}</div>
      <div>Bank Account Flow: {data?.bankFlow}</div>
    </div>
  );
}
