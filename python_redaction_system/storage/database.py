"""
Database management for the redaction system.
"""

import os
import platform
import sqlite3
from typing import Any, Dict, List, Optional, Tuple

from config.settings import SettingsManager


class DatabaseManager:
    """
    Manages the SQLite database for storing custom terms and application data.
    """

    def __init__(self, settings_manager: Optional[SettingsManager] = None):
        """
        Initialize the database manager.
        
        Args:
            settings_manager: An instance of SettingsManager to retrieve database path.
                            If None, a default path will be used.
        """
        self.settings_manager = settings_manager
        self.db_path = self._get_db_path()
        self._initialize_db()
    
    def _get_db_path(self) -> str:
        """
        Get the database file path from settings or use a default.
        
        Returns:
            The path to the database file.
        """
        if self.settings_manager:
            # Get path from settings, with platform-appropriate fallback
            default_path = self._get_default_db_path()
            return self.settings_manager.get("database_path", default_path)
        return self._get_default_db_path()
    
    def _get_default_db_path(self) -> str:
        """
        Get a platform-appropriate default database path.
        
        Returns:
            The default path for the database file.
        """
        system = platform.system()
        
        if system == "Windows":
            # Windows path
            app_data = os.environ.get("APPDATA", "")
            return os.path.join(app_data, "TextRedactionSystem", "redaction.db")
        elif system == "Darwin":  # macOS
            # macOS path
            return os.path.expanduser("~/Library/Application Support/TextRedactionSystem/redaction.db")
        else:
            # Linux and others
            return os.path.expanduser("~/.local/share/TextRedactionSystem/redaction.db")
    
    def _initialize_db(self) -> None:
        """Initialize the database schema if it doesn't exist."""
        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        
        conn = self._get_connection()
        cursor = conn.cursor()
        
        # Create tables if they don't exist
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS custom_terms (
            id INTEGER PRIMARY KEY,
            category TEXT NOT NULL,
            name TEXT NOT NULL,
            pattern TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(category, name)
        )
        ''')
        
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS redaction_logs (
            id INTEGER PRIMARY KEY,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            user_id TEXT,
            categories TEXT,
            redaction_count INTEGER,
            text_hash TEXT
        )
        ''')
        
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS audit_log (
            id INTEGER PRIMARY KEY,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            user_id TEXT,
            action TEXT,
            details TEXT
        )
        ''')
        
        conn.commit()
        conn.close()
    
    def _get_connection(self) -> sqlite3.Connection:
        """
        Get a connection to the SQLite database.
        
        Returns:
            A SQLite connection object.
        """
        return sqlite3.connect(self.db_path)
    
    def execute_query(self, query: str, parameters: Tuple = ()) -> List[Dict[str, Any]]:
        """
        Execute a SQL query and return the results as a list of dictionaries.
        
        Args:
            query: The SQL query to execute.
            parameters: The parameters to pass to the query.
        
        Returns:
            A list of dictionaries representing the query results.
        """
        conn = self._get_connection()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute(query, parameters)
        results = [dict(row) for row in cursor.fetchall()]
        
        conn.close()
        return results
    
    def execute_update(self, query: str, parameters: Tuple = ()) -> int:
        """
        Execute a SQL update query and return the number of affected rows.
        
        Args:
            query: The SQL query to execute.
            parameters: The parameters to pass to the query.
        
        Returns:
            The number of affected rows.
        """
        conn = self._get_connection()
        cursor = conn.cursor()
        
        cursor.execute(query, parameters)
        conn.commit()
        affected_rows = cursor.rowcount
        
        conn.close()
        return affected_rows
    
    def log_redaction(self, user_id: str, categories: List[str], 
                     redaction_count: int, text_hash: str) -> None:
        """
        Log a redaction operation.
        
        Args:
            user_id: The ID of the user who performed the redaction.
            categories: The categories that were applied.
            redaction_count: The number of items that were redacted.
            text_hash: A hash of the text that was redacted (for auditing).
        """
        categories_str = ",".join(categories)
        
        query = '''
        INSERT INTO redaction_logs (user_id, categories, redaction_count, text_hash)
        VALUES (?, ?, ?, ?)
        '''
        
        self.execute_update(query, (user_id, categories_str, redaction_count, text_hash))
    
    def log_audit(self, user_id: str, action: str, details: str) -> None:
        """
        Log an audit event.
        
        Args:
            user_id: The ID of the user who performed the action.
            action: The action that was performed.
            details: Additional details about the action.
        """
        query = '''
        INSERT INTO audit_log (user_id, action, details)
        VALUES (?, ?, ?)
        '''
        
        self.execute_update(query, (user_id, action, details))