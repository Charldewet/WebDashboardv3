#!/usr/bin/env python3
"""
Diagnostic script to check database configuration on Render.
This will help identify what type of database you're using and how to proceed.
"""

import os
import sys

# Add project root to the Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

def check_environment_variables():
    """Check all relevant environment variables."""
    print("🔍 Checking environment variables...")
    
    # Check if we're on Render
    is_render = os.environ.get("RENDER") == "true"
    print(f"   RENDER environment: {is_render}")
    
    # Check database URL
    database_url = os.environ.get("DATABASE_URL")
    print(f"   DATABASE_URL: {'Set' if database_url else 'Not set'}")
    
    if database_url:
        print(f"   Database URL type: {database_url[:20]}...")
        if database_url.startswith('postgresql://'):
            print("   ✅ PostgreSQL database detected")
        elif database_url.startswith('sqlite://'):
            print("   🔧 SQLite database detected")
        else:
            print(f"   ⚠️  Unknown database type: {database_url.split('://')[0]}")
    
    # Check other relevant variables
    secret_key = os.environ.get("SECRET_KEY")
    print(f"   SECRET_KEY: {'Set' if secret_key else 'Not set'}")
    
    return is_render, database_url

def check_database_connection():
    """Try to connect to the database and get information."""
    print("\n🔍 Testing database connection...")
    
    try:
        from app.db import create_session
        session = create_session()
        
        # Test basic connection
        result = session.execute("SELECT 1 as test")
        print("   ✅ Database connection successful")
        
        # Get database type
        try:
            result = session.execute("SELECT version()")
            version = result.fetchone()[0]
            print(f"   Database: PostgreSQL - {version[:50]}...")
        except:
            try:
                result = session.execute("SELECT sqlite_version()")
                version = result.fetchone()[0]
                print(f"   Database: SQLite - {version}")
            except:
                print("   Database: Unknown type")
        
        # Get table information
        try:
            result = session.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
                ORDER BY table_name
            """)
            tables = [row[0] for row in result]
            print(f"   Tables found: {len(tables)}")
            for table in tables[:5]:  # Show first 5 tables
                print(f"     - {table}")
            if len(tables) > 5:
                print(f"     ... and {len(tables) - 5} more")
        except:
            try:
                result = session.execute("SELECT name FROM sqlite_master WHERE type='table'")
                tables = [row[0] for row in result]
                print(f"   Tables found: {len(tables)}")
                for table in tables[:5]:
                    print(f"     - {table}")
                if len(tables) > 5:
                    print(f"     ... and {len(tables) - 5} more")
            except Exception as e:
                print(f"   ⚠️  Could not list tables: {e}")
        
        session.close()
        return True
        
    except Exception as e:
        print(f"   ❌ Database connection failed: {e}")
        return False

def check_render_database_service():
    """Check if there's a separate database service on Render."""
    print("\n🔍 Checking for Render database service...")
    
    # On Render, there might be a separate database service
    # Check if we can find database-related environment variables
    db_vars = []
    for key, value in os.environ.items():
        if 'DATABASE' in key.upper() or 'POSTGRES' in key.upper() or 'DB_' in key.upper():
            db_vars.append((key, value))
    
    if db_vars:
        print("   Found database-related environment variables:")
        for key, value in db_vars:
            print(f"     {key}: {value[:30]}...")
    else:
        print("   No database-related environment variables found")
    
    return len(db_vars) > 0

def provide_recommendations():
    """Provide recommendations based on the current setup."""
    print("\n📋 Recommendations:")
    
    is_render, database_url = check_environment_variables()
    
    if not is_render:
        print("   🔧 You're running locally - this is fine for testing")
        print("   ✅ You can proceed with local database setup")
        return
    
    if not database_url:
        print("   ⚠️  No DATABASE_URL found on Render")
        print("   📋 You need to:")
        print("      1. Create a PostgreSQL database service on Render")
        print("      2. Link it to your web service")
        print("      3. Set the DATABASE_URL environment variable")
        print("   🔗 Or check your Render dashboard for database services")
        return
    
    if database_url.startswith('sqlite://'):
        print("   ⚠️  SQLite database detected on Render")
        print("   📋 Note: SQLite on Render is not persistent across deployments")
        print("   🔗 Consider upgrading to PostgreSQL for production")
        print("   ✅ You can still proceed with the current setup")
        return
    
    if database_url.startswith('postgresql://'):
        print("   ✅ PostgreSQL database detected")
        print("   ✅ You can proceed with stock database setup")
        print("   ✅ Automatic backups are available")
        return
    
    print("   ⚠️  Unknown database configuration")
    print("   📋 Please check your Render dashboard for database setup")

def main():
    """Main diagnostic function."""
    print("🔍 Render Database Diagnostic")
    print("=" * 50)
    
    # Check environment
    is_render, database_url = check_environment_variables()
    
    # Check database connection
    connection_ok = check_database_connection()
    
    # Check for database service
    check_render_database_service()
    
    # Provide recommendations
    provide_recommendations()
    
    print("\n" + "=" * 50)
    if connection_ok:
        print("✅ Database connection is working")
        print("   You can proceed with stock database setup")
    else:
        print("❌ Database connection failed")
        print("   Please check your database configuration")
    
    return connection_ok

if __name__ == "__main__":
    main() 