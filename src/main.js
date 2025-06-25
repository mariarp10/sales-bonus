/**
 * Функция для расчета прибыли
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
  // Расчет прибыли от операции
  const discount = 1 - purchase.discount / 100;
  const revenue = _product.sale_price * purchase.quantity * discount;
  return revenue;
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
  // Расчет бонуса от позиции в рейтинге
  if (index === 0) {
    return seller.profit * (15 / 100);
  } else if (index === 1 || index === 2) {
    return seller.profit * (10 / 100);
  } else if (index === total - 1) {
    return 0;
  } else {
    return seller.profit * (5 / 100);
  }
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
  // Проверка входных данных
  if (!data || !Array.isArray(data.sellers) || data.sellers.length === 0) {
    throw new Error("Некорректные входные данные");
  }

  // Проверка наличия опций
  const { calculateRevenue, calculateBonus } = options;
  if (!calculateRevenue || !calculateBonus) {
    throw new Error("Чего-то не хватает");
  }

  // Подготовка промежуточных данных для сбора статистики
  const sellerStats = data.sellers.map((seller) => {
    return {
      id: seller.id,
      name: `${seller.first_name} ${seller.last_name}`,
      revenue: 0,
      profit: 0,
      sales_count: 0,
      products_sold: {},
    };
  });

  // Индексация продавцов и товаров для быстрого доступа
  const sellerIndex = Object.fromEntries(
    sellerStats.map((seller) => [seller.id, seller])
  );
  const productIndex = Object.fromEntries(
    data.products.map((product) => [product.sku, product])
  );

  // Расчет выручки и прибыли для каждого продавца
  data.purchase_records.forEach((record) => {
    const seller = sellerIndex[record.seller_id];
    // Увеличить количество продаж
    seller.sales_count += 1;
    // Увеличить общую сумму всех продаж
    seller.revenue += record.total_amount;

    // Расчёт прибыли для каждого товара
    record.items.forEach((item) => {
      const product = productIndex[item.sku]; // Товар
      // Посчитать себестоимость (cost) товара как product.purchase_price, умноженную на количество товаров из чека
      const productCost = product.purchase_price * item.quantity;
      // Посчитать выручку (revenue) с учётом скидки через функцию calculateRevenue
      const productRevenue = calculateRevenue(item, product);
      // Посчитать прибыль: выручка минус себестоимость
      const productProfit = productRevenue - productCost; // todo: check 
      // Увеличить общую накопленную прибыль (profit) у продавца
      seller.profit += productProfit;
      // Учёт количества проданных товаров
      if (!seller.products_sold[item.sku]) {
        seller.products_sold[item.sku] = 0;
        // По артикулу товара увеличить его проданное количество у продавца
        seller.products_sold[item.sku] += item.quantity;
      }
    });
  });

  // Сортировка продавцов по прибыли
  sellerStats.sort((a, b) => b.profit - a.profit);

  // Назначение премий на основе ранжирования
  sellerStats.forEach((seller, index) => {
    seller.bonus = calculateBonus(index, sellerStats.length, seller);
    seller.top_products = Object.entries(seller.products_sold) 
      .map(([sku, quantity]) => ({ sku, quantity })) 
      .sort((a, b) => b.quantity - a.quantity) 
      .slice(0, 10);
  });

  // @TODO: Подготовка итоговой коллекции с нужными полями
  return sellerStats.map(seller => ({
    seller_id: seller.id,
    name: seller.name,
    revenue: +seller.revenue.toFixed(2), 
    profit: +seller.profit.toFixed(2), 
    sales_count: seller.sales_count, 
    top_products: seller.top_products,
    bonus: +seller.bonus.toFixed(2)
  }))
}
