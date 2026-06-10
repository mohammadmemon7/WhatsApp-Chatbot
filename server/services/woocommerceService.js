const axios = require('axios');
require('dotenv').config();

const WC_CONSUMER_KEY = process.env.WC_CONSUMER_KEY;
const WC_CONSUMER_SECRET = process.env.WC_CONSUMER_SECRET;
const BASE_URL = 'https://mylaptop.in/wp-json/wc/v3/products';

function stripHtml(html) {
    if (!html) return '';
    return html.replace(/<[^>]*>?/gm, '').trim();
}

function mapProduct(product) {
    const price = product.sale_price || product.regular_price || product.price;
    const categories = product.categories.map(c => c.name).join(', ');
    return {
        name: product.name,
        price: price,
        short_description: stripHtml(product.short_description),
        permalink: product.permalink,
        categories: categories
    };
}

async function getLiveProducts(page = 1) {
    try {
        const response = await axios.get(BASE_URL, {
            params: {
                consumer_key: WC_CONSUMER_KEY,
                consumer_secret: WC_CONSUMER_SECRET,
                status: 'publish',
                stock_status: 'instock',
                per_page: 6,
                page: page
            }
        });

        const products = response.data.map(mapProduct);
        console.log(`Fetched ${products.length} live products from WooCommerce`);
        return products;
    } catch (error) {
        console.error('Exact error fetching products from WooCommerce:', error);
        return [];
    }
}

async function searchProducts(query) {
    try {
        const response = await axios.get(BASE_URL, {
            params: {
                consumer_key: WC_CONSUMER_KEY,
                consumer_secret: WC_CONSUMER_SECRET,
                status: 'publish',
                stock_status: 'instock',
                search: query,
                per_page: 6
            }
        });

        return response.data.map(mapProduct);
    } catch (error) {
        console.error('Exact error fetching searched products:', error);
        return [];
    }
}

async function getProductsByBudget(minBudget, maxBudget, page = 1) {
    try {
        const params = {
            consumer_key: WC_CONSUMER_KEY,
            consumer_secret: WC_CONSUMER_SECRET,
            status: 'publish',
            stock_status: 'instock',
            per_page: 10,
            page: page
        };
        if (maxBudget) params.max_price = maxBudget;
        if (minBudget) params.min_price = minBudget;

        const response = await axios.get(BASE_URL, { params });
        return response.data.map(mapProduct);
    } catch (error) {
        console.error('Exact error fetching products by budget:', error);
        return [];
    }
}

async function getProductsByBudgetPage(maxBudget, page = 1) {
    try {
        const params = {
            consumer_key: WC_CONSUMER_KEY,
            consumer_secret: WC_CONSUMER_SECRET,
            status: 'publish',
            stock_status: 'instock',
            per_page: 6,
            page: page
        };
        if (maxBudget) params.max_price = maxBudget;

        const response = await axios.get(BASE_URL, { params });
        return response.data.map(mapProduct);
    } catch (error) {
        console.error('Exact error fetching products by budget page:', error);
        return [];
    }
}

/**
 * Fetch products with only a minimum price (no upper cap).
 * Used for "Above ₹25,000" budget range.
 * @param {number} minBudget - Minimum price in INR
 * @param {number} page - Page number for pagination
 */
async function getProductsAboveBudget(minBudget, page = 1) {
    try {
        const response = await axios.get(BASE_URL, {
            params: {
                consumer_key: WC_CONSUMER_KEY,
                consumer_secret: WC_CONSUMER_SECRET,
                status: 'publish',
                stock_status: 'instock',
                min_price: minBudget,
                per_page: 6,
                page: page
            }
        });

        const products = response.data.map(mapProduct);
        console.log(`Fetched ${products.length} products above ₹${minBudget} from WooCommerce`);
        return products;
    } catch (error) {
        console.error('Error fetching products above budget:', error);
        return [];
    }
}

module.exports = {
    getLiveProducts,
    searchProducts,
    getProductsByBudget,
    getProductsByBudgetPage,
    getProductsAboveBudget
};
