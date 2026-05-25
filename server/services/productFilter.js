const Product = require('../models/Product');

/**
 * Filter products based on extracted criteria.
 * Relaxes criteria if no exact match is found.
 */
async function filterProducts(criteria) {
  let { budget, brand, processor, ram, usage } = criteria;
  
  let query = {};

  if (budget) query.price = { $lte: budget };
  if (brand) query.brand = { $regex: brand, $options: 'i' };
  if (processor) query.processor = { $regex: processor, $options: 'i' };
  
  // Try exact match first
  let products = await Product.find(query).sort({ price: 1 }).limit(4);

  // If no match, relax filters
  if (products.length === 0) {
    let relaxedQuery = {};
    if (budget) relaxedQuery.price = { $lte: budget * 1.2 }; // Increase budget by 20%
    if (processor) relaxedQuery.processor = { $regex: processor, $options: 'i' };
    
    products = await Product.find(relaxedQuery).sort({ price: 1 }).limit(4);
  }
  
  return products;
}

module.exports = { filterProducts };
