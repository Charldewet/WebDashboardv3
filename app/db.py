import os
os.makedirs('db', exist_ok=True)
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import Base
from config.settings import DATABASE_URI # Import DATABASE_URI

# Initialize engine directly
engine = create_engine(DATABASE_URI)
Base.metadata.create_all(engine) # Create tables if they don't exist

# Global session factory
_SessionFactory = sessionmaker(bind=engine)

def create_session():
    """Creates and returns a new SQLAlchemy session."""
    return _SessionFactory()

# Add this function for compatibility with scripts

def setup_db(database_uri=None):
    """Create all tables in the database specified by database_uri (or default)."""
    from app.models import Base
    if database_uri is None:
        database_uri = DATABASE_URI
    engine = create_engine(database_uri)
    Base.metadata.create_all(engine)

# The setup_db function is no longer needed as engine is initialized globally.
# def setup_db(db_uri):
#     engine = create_engine(db_uri)
#     Base.metadata.create_all(engine)
#     return engine 