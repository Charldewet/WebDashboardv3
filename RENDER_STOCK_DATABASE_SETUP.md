# Render Stock Database Setup Guide

## Overview

This guide explains how to set up your stock management database on Render's persistent disk. The stock database will store 127,382+ stock items, 2,207 departments, and daily sales data for all your pharmacies.

## Current Database Configuration

Your application is currently configured to use:
- **Local Development**: SQLite database at `db/daily_reports.db`
- **Render Production**: PostgreSQL via `DATABASE_URL` environment variable

## Step 1: Verify Current Database Setup

### Check Current Configuration

Your database is configured in `config/settings.py`:

```python
# Database URI: use DATABASE_URL from .env if set, otherwise default to SQLite
DATABASE_URI = os.getenv("DATABASE_URL", "sqlite:///db/daily_reports.db")
```

This means:
- **Local**: Uses SQLite at `db/daily_reports.db`
- **Render**: Uses PostgreSQL from `DATABASE_URL` environment variable

### Current Database Location

The database is stored in:
- **Local**: `db/daily_reports.db` (SQLite file)
- **Render**: PostgreSQL database (managed by Render)

## Step 2: Set Up Stock Database on Render

### Option A: Use Existing PostgreSQL Database (Recommended)

Since you already have a PostgreSQL database on Render, the stock tables will be added to your existing database:

1. **Deploy your updated code** to Render
2. **Run the database setup script** on Render:

```bash
# Connect to your Render service via SSH or use the Render shell
python scripts/setup_sales_database.py
```

3. **Import your stock data**:

```bash
# Import Reitz pharmacy data
python scripts/run_large_import.py
```

### Option B: Create Separate Database (If Needed)

If you want a separate database for stock data:

1. **Create a new PostgreSQL database** in Render dashboard
2. **Set environment variable** in your service:
   ```
   STOCK_DATABASE_URL=postgresql://username:password@host:port/stock_database
   ```
3. **Update configuration** to use separate database for stock data

## Step 3: Database Migration Strategy

### For Local Development

1. **Set up local database**:
   ```bash
   python scripts/setup_sales_database.py
   ```

2. **Import Reitz data locally**:
   ```bash
   python scripts/run_large_import.py
   ```

### For Render Production

1. **Deploy code** to Render
2. **Run setup on Render**:
   ```bash
   # Via Render shell or SSH
   python scripts/setup_sales_database.py
   ```

3. **Import data on Render**:
   ```bash
   python scripts/run_large_import.py
   ```

## Step 4: Environment Variables

### Required Environment Variables

Make sure these are set in your Render service:

```bash
# Database (already configured)
DATABASE_URL=postgresql://username:password@host:port/database

# JWT Secret (for API authentication)
SECRET_KEY=your_jwt_secret_key

# Email credentials (already configured)
REITZ_GMAIL_USERNAME=your_email
REITZ_GMAIL_APP_PASSWORD=your_app_password
# ... other pharmacy credentials
```

### Optional Environment Variables

```bash
# For separate stock database (if using Option B)
STOCK_DATABASE_URL=postgresql://username:password@host:port/stock_database

# For debugging
DEBUG=False
RENDER=true
```

## Step 5: Database Schema

The stock management system adds these tables to your existing database:

### New Tables

1. **`departments`** - 2,207 department codes
   ```sql
   CREATE TABLE departments (
       id SERIAL PRIMARY KEY,
       department_code VARCHAR(50) UNIQUE NOT NULL,
       department_name VARCHAR(255) NOT NULL,
       description TEXT,
       is_active INTEGER DEFAULT 1
   );
   ```

2. **`stock_items`** - 127,382+ stock items (pharmacy-specific)
   ```sql
   CREATE TABLE stock_items (
       id SERIAL PRIMARY KEY,
       stock_code VARCHAR(100) NOT NULL,
       stock_name TEXT NOT NULL,
       department_id INTEGER REFERENCES departments(id),
       pharmacy_code VARCHAR(50) NOT NULL,
       annual_sales_qty DECIMAL(15,2) DEFAULT 0,
       annual_sales_value DECIMAL(15,2) DEFAULT 0,
       avg_monthly_sales DECIMAL(15,2) DEFAULT 0,
       unit_cost DECIMAL(10,2) DEFAULT 0,
       unit_price DECIMAL(10,2) DEFAULT 0,
       last_updated DATE,
       UNIQUE(stock_code, pharmacy_code)
   );
   ```

3. **`daily_stock_sales`** - Daily sales records (pharmacy-specific)
   ```sql
   CREATE TABLE daily_stock_sales (
       id SERIAL PRIMARY KEY,
       stock_item_id INTEGER REFERENCES stock_items(id),
       pharmacy_code VARCHAR(50) NOT NULL,
       report_date DATE NOT NULL,
       daily_sales_qty DECIMAL(15,2) DEFAULT 0,
       daily_sales_value DECIMAL(15,2) DEFAULT 0,
       daily_cost_of_sales DECIMAL(15,2) DEFAULT 0,
       daily_gross_profit DECIMAL(15,2) DEFAULT 0,
       daily_gross_profit_percent DECIMAL(5,2) DEFAULT 0,
       opening_stock DECIMAL(15,2) DEFAULT 0,
       closing_stock DECIMAL(15,2) DEFAULT 0,
       stock_value DECIMAL(15,2) DEFAULT 0,
       transactions_count INTEGER DEFAULT 0,
       avg_unit_price DECIMAL(10,2) DEFAULT 0,
       UNIQUE(stock_item_id, pharmacy_code, report_date)
   );
   ```

## Step 6: Deployment Checklist

### Before Deploying

- [ ] Test database setup locally
- [ ] Verify all scripts work with PostgreSQL
- [ ] Check environment variables are set
- [ ] Ensure data files are accessible

### After Deploying

- [ ] Run database setup script on Render
- [ ] Import Reitz pharmacy data
- [ ] Test API endpoints
- [ ] Verify data integrity

## Step 7: Monitoring and Maintenance

### Database Size

With 127,382 stock items, expect:
- **Stock items table**: ~50-100 MB
- **Daily sales table**: ~10-50 MB per month
- **Total initial size**: ~100-200 MB

### Backup Strategy

1. **Automatic backups**: Render provides automatic PostgreSQL backups
2. **Manual exports**: Use pg_dump for additional backups
3. **Data verification**: Regular checks of data integrity

### Performance Considerations

1. **Indexes**: Automatically created on primary keys and foreign keys
2. **Partitioning**: Consider partitioning daily_sales table by date for large datasets
3. **Archiving**: Archive old daily sales data periodically

## Troubleshooting

### Common Issues

1. **Database connection errors**:
   - Check `DATABASE_URL` environment variable
   - Verify PostgreSQL service is running

2. **Import failures**:
   - Check file permissions on Render
   - Verify CSV files are accessible
   - Monitor memory usage during large imports

3. **Performance issues**:
   - Monitor database size
   - Check query performance
   - Consider adding indexes

### Support Commands

```bash
# Check database connection
python -c "from app.db import create_session; session = create_session(); session.execute('SELECT 1'); print('Database connected')"

# Check table counts
python -c "from app.db import create_session; from app.models import Department, StockItem; session = create_session(); print(f'Departments: {session.query(Department).count()}'); print(f'Stock Items: {session.query(StockItem).count()}')"

# Test API endpoints
curl -H "Authorization: Bearer YOUR_TOKEN" https://your-render-app.onrender.com/api/departments
```

## Next Steps

1. **Deploy the updated code** to Render
2. **Run the database setup** script
3. **Import Reitz pharmacy data**
4. **Test the API endpoints**
5. **Import other pharmacies** as needed

The stock database will be automatically stored on Render's persistent disk and will survive service restarts and deployments. 