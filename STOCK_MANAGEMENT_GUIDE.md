# Stock Management System Guide

## Overview

This guide explains how to set up and use the new stock management system that has been added to your WebDashboardv3 application. The system allows you to track individual stock items, their sales history, and daily stock levels.

## Database Structure

The new system adds three new tables to your existing database:

### 1. Departments Table (`departments`)
- **Purpose**: Organize stock items by department/category
- **Key Fields**:
  - `department_code` (unique identifier)
  - `department_name` (display name)
  - `description` (optional description)
  - `is_active` (1 = active, 0 = inactive)

### 2. Stock Items Table (`stock_items`)
- **Purpose**: Store individual stock items with 12-month sales baseline
- **Key Fields**:
  - `stock_code` (unique item code)
  - `stock_name` (item description)
  - `department_id` (links to departments table)
  - `pharmacy_code` (which pharmacy owns this item)
  - `annual_sales_qty` (12-month cumulative sales quantity)
  - `annual_sales_value` (12-month cumulative sales value)
  - `avg_monthly_sales` (calculated average monthly sales)
  - `unit_cost` and `unit_price`
  - `last_updated` (when the baseline was last updated)

### 3. Daily Stock Sales Table (`daily_stock_sales`)
- **Purpose**: Track daily sales and stock levels for each item
- **Key Fields**:
  - `stock_item_id` (links to stock_items table)
  - `pharmacy_code` and `report_date`
  - `daily_sales_qty` and `daily_sales_value`
  - `opening_stock` and `closing_stock`
  - `stock_value` (closing stock value)
  - Calculated fields: `daily_cost_of_sales`, `daily_gross_profit`, `daily_gross_profit_percent`

## Setup Instructions

### Step 1: Create Database Tables

Run the setup script to create the new tables:

```bash
python scripts/setup_sales_database.py
```

This will:
- Create all new database tables
- Add sample departments and stock items for testing
- Set up the database structure

### Step 2: Import Your Actual Data

**For Reitz Pharmacy (127,382+ items) - CURRENT**

Run the Reitz-specific import script:

```bash
python scripts/run_large_import.py
```

This script will:
- Import data specifically for Reitz pharmacy (`pharmacy_code: "reitz"`)
- Verify your data files (127,382 stock items, 2,207 departments)
- Import all departments from `Stock information/Department_codes.csv`
- Import all stock items from `Stock information/Daily_sales.csv`
- Import daily sales data for today's date
- Show progress every 1,000 items
- Provide memory optimization for large datasets

**For Other Pharmacies (Future)**

Use the template script for each pharmacy:

```bash
# Copy the template
cp scripts/pharmacy_import_template.py scripts/import_roos_pharmacy.py

# Edit the pharmacy code in the new file
# Change PHARMACY_CODE = "roos" and PHARMACY_NAME = "Roos Pharmacy"

# Run the import
python scripts/import_roos_pharmacy.py
```

**For Smaller Datasets**

Run the standard import script:

```bash
python scripts/run_stock_import.py
```

**Option B: Manual Import**

If you prefer to import data step by step:

```bash
# Analyze your data structure first
python scripts/import_actual_stock_data.py --analyze

# Import departments
python scripts/import_actual_stock_data.py --departments

# Import stock items
python scripts/import_actual_stock_data.py --stock-items --pharmacy reitz

# Import daily sales (specify date)
python scripts/import_actual_stock_data.py --daily-sales --pharmacy reitz --date 2025-01-15

# Or import everything at once
python scripts/import_actual_stock_data.py --all --pharmacy reitz --date 2025-01-15
```

### Step 2: Prepare Your Data Files

The system works with CSV files for easy data upload. Create the following files:

#### A. Departments CSV (`departments.csv`)
```csv
department_code,department_name,description,is_active
PHARM,Pharmacy,Prescription medications and pharmaceutical products,1
OTC,Over the Counter,Non-prescription medications and health products,1
COSMETIC,Cosmetics,Beauty and personal care products,1
SUPPLEMENTS,Supplements,Vitamins minerals and dietary supplements,1
MEDICAL,Medical Supplies,Medical devices and supplies,1
```

#### B. Stock Items CSV (`stock_items.csv`)
```csv
stock_code,stock_name,department_code,pharmacy_code,annual_sales_qty,annual_sales_value,unit_cost,unit_price
PAN001,Panado 500mg Tablets,OTC,reitz,1200,4800.00,3.50,4.00
ASP002,Aspirin 100mg Tablets,OTC,reitz,800,3200.00,3.00,4.00
VIT001,Vitamin C 1000mg,SUPPLEMENTS,reitz,600,9000.00,12.00,15.00
```

#### C. Daily Sales CSV (`daily_sales.csv`)
```csv
stock_code,pharmacy_code,report_date,daily_sales_qty,daily_sales_value,opening_stock,closing_stock,stock_value,transactions_count,avg_unit_price
PAN001,reitz,2025-01-15,5,20.00,50,45,180.00,3,4.00
ASP002,reitz,2025-01-15,3,12.00,30,27,108.00,2,4.00
VIT001,reitz,2025-01-15,2,30.00,20,18,270.00,1,15.00
```

### Step 3: Upload Your Data

Use the upload script to populate your database:

```bash
# Create sample CSV files for reference
python scripts/upload_stock_data.py --create-samples

# Upload departments
python scripts/upload_stock_data.py --departments departments.csv

# Upload stock items
python scripts/upload_stock_data.py --stock-items stock_items.csv

# Upload daily sales data
python scripts/upload_stock_data.py --daily-sales daily_sales.csv
```

## API Endpoints

The system provides the following API endpoints:

### Departments
- `GET /api/departments` - Get all departments
- `POST /api/departments` - Create a new department

### Stock Items
- `GET /api/stock-items` - Get stock items for authorized pharmacy
- `POST /api/stock-items` - Create a new stock item

### Daily Sales
- `GET /api/daily-stock-sales/<start_date>/<end_date>` - Get daily sales for date range
- `POST /api/daily-stock-sales` - Create or update daily sales record

### Summary
- `GET /api/stock-summary/<start_date>/<end_date>` - Get stock summary for date range

## Daily Workflow

### 1. Initial Setup (One-time)
1. Create departments using CSV upload or API
2. Upload your 12-month sales history for all stock items
3. This establishes your baseline sales averages

### 2. Daily Operations
1. **Morning**: Check opening stock levels
2. **Throughout the day**: Record sales as they happen (optional)
3. **End of day**: Upload daily sales report with:
   - Daily sales quantities and values
   - Opening and closing stock levels
   - Stock values

### 3. Data Upload Methods

#### Option A: CSV Upload (Recommended for bulk data)
```bash
python scripts/upload_stock_data.py --daily-sales daily_sales_2025-01-15.csv
```

#### Option B: API Upload (Good for individual records)
```bash
curl -X POST http://localhost:5000/api/daily-stock-sales \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Pharmacy: reitz" \
  -H "Content-Type: application/json" \
  -d '{
    "stock_code": "PAN001",
    "report_date": "2025-01-15",
    "daily_sales_qty": 5,
    "daily_sales_value": 20.00,
    "opening_stock": 50,
    "closing_stock": 45,
    "stock_value": 180.00
  }'
```

## Data Analysis Features

The system automatically calculates:

1. **Average Monthly Sales**: Based on your 12-month baseline
2. **Daily Gross Profit**: Sales value minus cost of sales
3. **Gross Profit Percentage**: Daily profit as percentage of sales
4. **Stock Turnover**: How quickly items are selling
5. **Stock Value**: Current inventory value

## Best Practices

### 1. Data Consistency
- Use consistent stock codes across all pharmacies
- Update your 12-month baseline quarterly
- Ensure all dates are in YYYY-MM-DD format

### 2. Regular Maintenance
- Review and update departments as needed
- Archive inactive stock items (set is_active = 0)
- Backup your database regularly

### 3. Performance
- Upload daily sales data in batches
- Use CSV upload for large datasets
- Monitor database size and performance

## Troubleshooting

### Common Issues

1. **"Department not found" error**
   - Ensure departments are created before stock items
   - Check department codes match exactly

2. **"Stock item not found" error**
   - Verify stock codes exist for the pharmacy
   - Check pharmacy codes match exactly

3. **Date format errors**
   - Always use YYYY-MM-DD format
   - Check for extra spaces in CSV files

### Getting Help

1. Check the sample CSV files created by `--create-samples`
2. Review the database structure in `app/models.py`
3. Test with small datasets first
4. Check the application logs for detailed error messages

## Integration with Existing System

The new stock management system:
- Uses the same authentication and authorization as your existing system
- Respects pharmacy access permissions
- Integrates with your existing database
- Follows the same memory management patterns
- Uses the same API structure and error handling

This ensures a seamless experience while adding powerful new stock tracking capabilities to your pharmacy management system. 