#!/usr/bin/env python3
"""
Updates the database schema by creating any missing tables.
This script is non-destructive and safe to run on an existing database.
It will NOT delete or modify existing tables or data.
"""

import os
import sys

# Add project root to the Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# We need to import all the modules that define models so that
# Base.metadata knows about them.
from app import models
from app.db import engine
from app.models import Base

def create_missing_tables():
    """Create all tables defined in models that do not yet exist."""
    print("Checking database schema...")
    try:
        # This command checks for all tables defined in your models
        # (DailyReport, Department, Product, StockSale, ProcessedStockSales, etc.)
        # and creates only those that are missing.
        # It does not alter existing tables or data.
        print("Creating missing tables (if any)...")
        Base.metadata.create_all(engine)
        print("✅ Database schema is up-to-date. All required tables exist.")
    except Exception as e:
        print(f"❌ An error occurred while updating the schema: {e}")

if __name__ == "__main__":
    print("--- Database Schema Update ---")
    create_missing_tables()
    print("----------------------------") 