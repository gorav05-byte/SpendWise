SW.start(function () {
  return SW.crudPage({
    endpoint: '/api/income',
    categoriesKey: 'incomeCategories',
    hasPayment: false,
    label: 'Income',
    plural: 'income records',
    amountClass: 'amount-income'
  });
});
