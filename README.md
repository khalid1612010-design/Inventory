# KAIZEN Inventory Management System

A professional, bilingual (Arabic/English) inventory management web application built with vanilla JavaScript, HTML5, CSS3, and Supabase.

## 📁 Project Structure

```
kaizen-inventory/
├── index.html      # Main HTML entry point
├── style.css       # All styles (ERP-style dashboard)
├── app.js          # Application logic, UI rendering, navigation
├── supabase.js     # Supabase client & database API
├── pdf.js          # PDF generation for transactions
├── init.sql        # SQL script for Supabase table setup
└── README.md       # This file
```

## 🚀 Quick Start

### Step 1: Set Up Supabase Database

1. Go to [Supabase Dashboard](https://jiglufmniplwwrhwxkty.supabase.co)
2. Open the **SQL Editor**
3. Create a new query
4. Copy and paste the entire contents of `init.sql`
5. Click **Run**
6. You should see 3 tables created: `products`, `inventory_in`, `inventory_out`

### Step 2: Open the Application

Simply open `index.html` in any modern web browser. No server required!

### Step 3: Start Using

- Use the **Dashboard** to see inventory stats
- Click **Inventory In** to add stock
- Click **Inventory Out** to remove stock
- View **Products** to see current inventory
- Check **Operations History** for all transactions

## 🌍 Language Support

The application supports both **English** and **Arabic**:

- Click **EN** / **العربية** in the top-right corner to switch
- Arabic mode includes full RTL (right-to-left) support
- All labels, notifications, and PDFs adapt to the selected language

## 📋 Features

### Dashboard
- Total Products, Total Quantity, Total Value cards
- Inventory In/Out operations count
- Quick action buttons for Inventory In/Out
- Recent operations table

### Inventory In (Stock Addition)
- Product name with autocomplete suggestions
- Auto-calculation: Quantity × Unit Price = Total Price
- Reverse calculation: Total Price ÷ Quantity = Unit Price
- Supplier name, entry date, employee name, notes
- Automatically creates new products or increases existing stock

### Inventory Out (Stock Removal)
- Select product from existing inventory dropdown
- Displays available stock
- Validates quantity doesn't exceed stock
- Prevents negative inventory
- Customer name, date, seller name, notes
- Automatically decreases stock

### Products Page
- Full product list with quantities, unit prices, stock values
- Search/filter functionality
- Real-time updates

### Operations History
- Combined view of all In and Out operations
- Filter by: search text, date, employee, product, type (In/Out)
- PDF download for each transaction

### PDF Export
- Professional A4 PDF receipts for every transaction
- Includes company branding (KAIZEN header)
- All transaction details formatted for printing
- Works for both Inventory In and Inventory Out

## 🔧 Technical Details

### Database Schema

#### `products` Table
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | TEXT (UNIQUE) | Product name |
| quantity | NUMERIC | Current stock quantity |
| unit_price | NUMERIC | Unit price |
| supplier_name | TEXT | Supplier name |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

#### `inventory_in` Table
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| product_name | TEXT | Product name |
| quantity | NUMERIC | Quantity added |
| unit_price | NUMERIC | Unit price |
| total_price | NUMERIC | Total price |
| supplier_name | TEXT | Supplier |
| entry_date | DATE | Entry date |
| employee_name | TEXT | Receiving employee |
| notes | TEXT | Optional notes |
| created_at | TIMESTAMPTZ | Creation timestamp |

#### `inventory_out` Table
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| product_name | TEXT | Product name |
| quantity | NUMERIC | Quantity removed |
| total_selling_price | NUMERIC | Selling price |
| customer_name | TEXT | Customer |
| date | DATE | Sale date |
| employee_name | TEXT | Seller |
| notes | TEXT | Optional notes |
| created_at | TIMESTAMPTZ | Creation timestamp |

### External Libraries (CDN)
- **Supabase JS Client v2**: Database connectivity
- **jsPDF 2.5.1**: PDF generation

## ⚠️ Important Notes

- No authentication system (internal company use)
- Anonymous access configured via Supabase RLS policies
- Stock is always calculated automatically from operations
- Employees cannot manually edit stock quantities
- Run `init.sql` first before using the application

## 📱 Responsive Design

- Desktop: Full sidebar + content layout
- Tablet: Collapsible sidebar
- Mobile: Full-width, stacked layout with hamburger menu
- All tables are horizontally scrollable on small screens

## 🎨 Design

- Professional ERP-style interface
- Deep blue company color scheme (#1e3a8a)
- Card-based dashboard with colored accents
- Smooth animations and transitions
- Toast notifications for success/error feedback
- Loading spinners for async operations
