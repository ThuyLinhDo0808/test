import sqlite3
from functools import lru_cache
from app.services import SQLManager
from app.core import DB_PATH

@lru_cache(maxsize=1)
def get_sql_manager() -> SQLManager:
    connection = sqlite3.connect(DB_PATH, check_same_thread=False)
    connection.row_factory = (
        sqlite3.Row
    )  # Enable row factory to return rows as dictionaries
    return SQLManager(connection=connection)

