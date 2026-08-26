import { useState } from "react";
import { QuickAddBudgetEntry } from "./QuickAddBudgetEntry.tsx";
import { Button } from "../../components/ui/Button.tsx";

export function BudgetMobileQuickAdd() {
  const [quickAddBudgetReady, setQuickAddBudgetReady] = useState(false);
  const [category, setCategory] = useState("");
  const [name, setName] = useState("");
  const [value, setValue] = useState(0);
  const [currencyV, setCurrency] = useState("");
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
        Food Card
      </Button>
      <hr />
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
        Shopping Card
      </Button>
      <hr />
      <Button
        variant="primary"
        onClick={() => {
          setCategory("Car");
          setName("Gas");
          setType("Expense");
          setPaymentMethod("Cash");
          setQuickAddBudgetReady(true);
        }}
      >
        Gas Cash
      </Button>
      <Button
        variant="primary"
        onClick={() => {
          setCategory("Car");
          setName("Gas");
          setType("Expense");
          setPaymentMethod("Card");
          setQuickAddBudgetReady(true);
        }}
      >
        Gas Card
      </Button>
      <hr />

      <Button
        variant="primary"
        onClick={() => {
          setCategory("Work");
          setName("Korki");
          setType("Income");
          setPaymentMethod("Cash");
          setQuickAddBudgetReady(true);
        }}
      >
        Korki
      </Button>
      <hr />

      <Button
        variant="primary"
        onClick={() => {
          setCategory("Work");
          setName("Salary");
          setType("Income");
          setPaymentMethod("Transfer");
          setQuickAddBudgetReady(true);
        }}
      >
        My Salary
      </Button>
      <hr />

      <Button
        variant="primary"
        onClick={() => {
          setCategory("Learning");
          setName("Spanish");
          setValue(10);
          setCurrency("EUR");
          setType("Expense");
          setPaymentMethod("Transfer");
          setQuickAddBudgetReady(true);
        }}
      >
        Spanish Lesson
      </Button>

      {quickAddBudgetReady && (
        <QuickAddBudgetEntry
          categoryV={category}
          typeV={type}
          nameV={name}
          valueV={value}
          currencyV={currencyV}
          onClose={() => {
            setQuickAddBudgetReady(false);
          }}
          paymentMethodV={paymentMethod}
          onFinish={() => {
            setQuickAddBudgetReady(false);
          }}
        />
      )}
    </div>
  );
}
