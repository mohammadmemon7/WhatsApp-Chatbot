const axios = require('axios');
require('dotenv').config();

const WC_CONSUMER_KEY = process.env.WC_CONSUMER_KEY;
const WC_CONSUMER_SECRET = process.env.WC_CONSUMER_SECRET;
const BASE_URL = 'https://mylaptop.in/wp-json/wc/v3/products';

function stripHtml(html) {
    if (!html) return '';
    return html.replace(/<[^>]*>?/gm, '').trim();
}

async function getLiveProducts() {
    try {
        const response = await axios.get(BASE_URL, {
            params: {
                consumer_key: WC_CONSUMER_KEY,
                consumer_secret: WC_CONSUMER_SECRET,
                status: 'publish',
                stock_status: 'instock',
                per_page: 50 // Fetch a good number of products
            }
        });

        const products = response.data.map(product => {
            const price = product.sale_price || product.regular_price || product.price;
            const categories = product.categories.map(c => c.name).join(', ');
            
            return {
                name: product.name,
                price: price,
                short_description: stripHtml(product.short_description),
                permalink: product.permalink,
                categories: categories
            };
        });

        console.log(`Fetched ${products.length} live products from WooCommerce`);
        return products;
    } catch (error) {
        console.error('Exact error fetching products from WooCommerce:', error);
        return [];
    }
}

module.exports = {
    getLiveProducts
};
