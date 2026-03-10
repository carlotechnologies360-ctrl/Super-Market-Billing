import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import db from "./db.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import routes from "./routes.js";

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(bodyParser.json());

// API Routes
app.use('/api', routes);

// Initialize Database Schema
const initDb = async () => {
  try {
    const schemaPath = path.join(__dirname, "schema.sql");
    const schemaSql = fs.readFileSync(schemaPath, "utf8");

    console.log("Initializing database tables...");
    await db.query(schemaSql);

    // Migrations to ensure all columns exist (for existing databases)
    await db.query(`
      ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10,2);
      ALTER TABLE products ADD COLUMN IF NOT EXISTS expiry_date DATE;
      ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS actual_price DECIMAL(10,2);
      ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS barcode VARCHAR(100);

      -- Fix Foreign Key for sale_items to allow Product Deletion
      DO $$ 
      BEGIN 
        IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'sale_items_product_id_fkey') THEN
          ALTER TABLE sale_items DROP CONSTRAINT sale_items_product_id_fkey;
          ALTER TABLE sale_items ADD CONSTRAINT sale_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    console.log("Database tables checked/created successfully.");
  } catch (err) {
    console.error("Error initializing database:", err);
  }
};

app.get("/", (req, res) => {
  res.send("SmartMart Backend Running");
});

const PORT = process.env.PORT || 5000;

// Initialize DB then start server
initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});

