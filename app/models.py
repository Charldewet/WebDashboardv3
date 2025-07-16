from sqlalchemy import Column, Integer, String, Float, Date, UniqueConstraint, ForeignKey, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()

class DailyReport(Base):
    __tablename__ = "daily_reports"

    id = Column(Integer, primary_key=True)
    pharmacy_code = Column(String, nullable=False)
    report_date = Column(Date, nullable=False)

    # SALES SUMMARY
    cash_sales_today = Column(Float)
    cash_sales_trans_today = Column(Integer)
    cod_payments_today = Column(Float)
    cod_payments_trans_today = Column(Integer)
    receipt_on_account_today = Column(Float)
    receipt_on_account_trans_today = Column(Integer)
    subtotal_today = Column(Float)
    subtotal_trans_today = Column(Integer)
    paid_outs_today = Column(Float)
    paid_outs_trans_today = Column(Integer)
    cash_refunds_today = Column(Float)
    cash_refunds_trans_today = Column(Integer)
    sales_total_today = Column(Float)
    sales_total_trans_today = Column(Integer)
    account_sales_today = Column(Float)
    account_sales_trans_today = Column(Integer)
    cod_sales_today = Column(Float)
    cod_sales_trans_today = Column(Integer)
    account_refunds_today = Column(Float)
    account_refunds_trans_today = Column(Integer)
    pos_turnover_today = Column(Float)
    pos_turnover_trans_today = Column(Integer)

    # BASKET METRICS
    avg_items_per_basket = Column(Float)
    avg_value_per_basket = Column(Float)

    # CASH-UP RECONCILIATION
    cash_tenders_today = Column(Float)
    credit_card_tenders_today = Column(Float)
    total_banked_today = Column(Float)

    # STOCK TRADING ACCOUNT
    stock_sales_today = Column(Float)
    stock_purchases_today = Column(Float)
    stock_adjustments_today = Column(Float)
    cost_of_sales_today = Column(Float)
    stock_gross_profit_today = Column(Float)
    stock_gross_profit_percent_today = Column(Float)
    opening_stock_today = Column(Float)
    closing_stock_today = Column(Float)

    # DISPENSARY SUMMARY
    dispensary_turnover_today = Column(Float)
    scripts_dispensed_today = Column(Float)
    avg_script_value_today = Column(Float)
    avg_items_per_script_today = Column(Float)
    avg_item_gross_value_today = Column(Float)
    outstanding_levies_today = Column(Float)

    # TURNOVER SUMMARY
    retail_sales_today = Column(Float)
    type_r_sales_today = Column(Float)
    capitation_sales_today = Column(Float)
    total_turnover_today = Column(Float)

    __table_args__ = (
        UniqueConstraint("pharmacy_code", "report_date", name="_pharmacy_day_uc"),
    )

class Department(Base):
    """Department table for organizing stock items by department"""
    __tablename__ = "departments"
    
    id = Column(Integer, primary_key=True)
    department_code = Column(String(20), unique=True, nullable=False)
    department_name = Column(String(100), nullable=False)
    description = Column(Text)
    is_active = Column(Integer, default=1)  # 1 = active, 0 = inactive
    
    # Relationship to stock items
    stock_items = relationship("StockItem", back_populates="department")
    
    __table_args__ = (
        UniqueConstraint("department_code", name="_department_code_uc"),
    )

class StockItem(Base):
    """Stock items with 12-month sales history baseline"""
    __tablename__ = "stock_items"
    
    id = Column(Integer, primary_key=True)
    stock_code = Column(String(50), unique=True, nullable=False)
    stock_name = Column(String(200), nullable=False)
    department_id = Column(Integer, ForeignKey('departments.id'), nullable=False)
    pharmacy_code = Column(String(20), nullable=False)  # Which pharmacy this item belongs to
    
    # 12-month sales baseline
    annual_sales_qty = Column(Float, default=0)  # Cumulative sales for past 12 months
    annual_sales_value = Column(Float, default=0)  # Cumulative sales value for past 12 months
    avg_monthly_sales = Column(Float, default=0)  # Calculated average monthly sales
    
    # Additional item details
    unit_cost = Column(Float, default=0)
    unit_price = Column(Float, default=0)
    is_active = Column(Integer, default=1)  # 1 = active, 0 = inactive
    last_updated = Column(Date, nullable=False)
    
    # Relationships
    department = relationship("Department", back_populates="stock_items")
    daily_sales = relationship("DailyStockSales", back_populates="stock_item")
    
    __table_args__ = (
        UniqueConstraint("stock_code", "pharmacy_code", name="_stock_pharmacy_uc"),
    )

class DailyStockSales(Base):
    """Daily sales and stock on hand for individual items"""
    __tablename__ = "daily_stock_sales"
    
    id = Column(Integer, primary_key=True)
    stock_item_id = Column(Integer, ForeignKey('stock_items.id'), nullable=False)
    pharmacy_code = Column(String(20), nullable=False)
    report_date = Column(Date, nullable=False)
    
    # Daily sales metrics
    daily_sales_qty = Column(Float, default=0)
    daily_sales_value = Column(Float, default=0)
    daily_cost_of_sales = Column(Float, default=0)
    daily_gross_profit = Column(Float, default=0)
    daily_gross_profit_percent = Column(Float, default=0)
    
    # Stock on hand
    opening_stock = Column(Float, default=0)
    closing_stock = Column(Float, default=0)
    stock_value = Column(Float, default=0)  # Closing stock value
    
    # Additional metrics
    transactions_count = Column(Integer, default=0)  # Number of transactions involving this item
    avg_unit_price = Column(Float, default=0)  # Average selling price for the day
    
    # Relationships
    stock_item = relationship("StockItem", back_populates="daily_sales")
    
    __table_args__ = (
        UniqueConstraint("stock_item_id", "pharmacy_code", "report_date", name="_stock_daily_uc"),
    ) 