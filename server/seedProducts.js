const mongoose = require('mongoose');
const Product = require('./models/Product');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/whatsapp-bot";

const sampleProducts = [
  {
    model: "Latitude 5490",
    brand: "Dell",
    processor: "i5-8th Gen",
    ram: "8GB",
    storage: "256GB SSD",
    screen: "14inch",
    condition: "Grade A",
    price: 18500,
    stock: 3
  },
  {
    model: "EliteBook 840 G5",
    brand: "HP",
    processor: "i5-8th Gen",
    ram: "8GB",
    storage: "512GB SSD",
    screen: "14inch",
    condition: "Grade A",
    price: 22000,
    stock: 2
  },
  {
    model: "ThinkPad T470",
    brand: "Lenovo",
    processor: "i5-7th Gen",
    ram: "8GB",
    storage: "256GB SSD",
    screen: "14inch",
    condition: "Grade B",
    price: 15000,
    stock: 5
  },
  {
    model: "Inspiron 3542",
    brand: "Dell",
    processor: "i3-4th Gen",
    ram: "4GB",
    storage: "500GB HDD",
    screen: "15inch",
    condition: "Grade B",
    price: 9500,
    stock: 4
  },
  {
    model: "840 G3",
    brand: "HP",
    processor: "i7-6th Gen",
    ram: "16GB",
    storage: "512GB SSD",
    screen: "14inch",
    condition: "Grade A",
    price: 28000,
    stock: 2
  }
];

mongoose.connect(MONGODB_URI).then(async () => {
  console.log("Connected to MongoDB");
  
  try {
    await Product.deleteMany({});
    console.log("Cleared existing products");
    
    await Product.insertMany(sampleProducts);
    console.log("Sample products inserted successfully!");
  } catch (err) {
    console.error("Error inserting products:", err);
  } finally {
    mongoose.connection.close();
  }
}).catch(err => {
  console.error("Connection error:", err);
});
