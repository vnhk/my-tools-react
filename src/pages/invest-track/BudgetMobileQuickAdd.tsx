import { useState } from "react";
import { QuickAddBudgetEntry } from "./QuickAddBudgetEntry.tsx";
import { Button } from "../../components/ui/Button.tsx";

export function BudgetMobileQuickAdd() {
  const [quickAddBudgetReady, setQuickAddBudgetReady] = useState(false);
  const [category, setCategory] = useState("");
  const [type, setType] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");

  return (
    <div>
      <Button
        variant="primary"
        onClick={() => {
          setCategory("Food");
          setType("Expense");
          setPaymentMethod("Cash");
          setQuickAddBudgetReady(true);
        }}
      >
        Food Cash
      </Button>
      <Button
        variant="primary"
        onClick={() => {
          setCategory("Food");
          setType("Expense");
          setPaymentMethod("Card");
          setQuickAddBudgetReady(true);
        }}
      >
        Shopping Card
      </Button>
      <Button
        variant="primary"
        onClick={() => {
          setCategory("Shopping");
          setType("Expense");
          setPaymentMethod("Cash");
          setQuickAddBudgetReady(true);
        }}
      >
        Shopping Cash
      </Button>
      <Button
        variant="primary"
        onClick={() => {
          setCategory("Shopping");
          setType("Expense");
          setPaymentMethod("Card");
          setQuickAddBudgetReady(true);
        }}
      >
        Food Card
      </Button>
      {quickAddBudgetReady && (
        <QuickAddBudgetEntry
          categoryV={category}
          typeV={type}
          paymentMethodV={paymentMethod}
          onFinish={() => {
            setQuickAddBudgetReady(false);
          }}
        />
      )}
    </div>
  );
}
