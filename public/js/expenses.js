SW.start(function () {
  return SW.crudPage({
    endpoint: '/api/expenses',
    categoriesKey: 'expenseCategories',
    hasPayment: true,
    label: 'Expense',
    plural: 'expenses',
    amountClass: 'amount-expense'
  });
});
