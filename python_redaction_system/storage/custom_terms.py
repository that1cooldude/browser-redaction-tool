"""
Management of custom redaction terms.
"""

from typing import Dict, List, Optional

from storage.database import DatabaseManager


class CustomTermsManager:
    """
    Manages custom redaction terms and their persistence in the database.
    """

    def __init__(self, db_manager: Optional[DatabaseManager] = None):
        """
        Initialize the custom terms manager.
        
        Args:
            db_manager: An instance of DatabaseManager. If None, a new instance will be created.
        """
        self.db_manager = db_manager or DatabaseManager()
        self._load_terms()
    
    def _load_terms(self) -> None:
        """Load custom terms from the database."""
        self.terms = {}
        
        query = "SELECT category, name, pattern FROM custom_terms"
        results = self.db_manager.execute_query(query)
        
        for row in results:
            category = row["category"]
            name = row["name"]
            pattern = row["pattern"]
            
            if category not in self.terms:
                self.terms[category] = {}
            
            self.terms[category][name] = pattern
    
    def get_categories(self) -> List[str]:
        """
        Get all categories that have custom terms.
        
        Returns:
            A list of category names.
        """
        return list(self.terms.keys())
    
    def get_terms_for_category(self, category: str) -> Dict[str, str]:
        """
        Get all custom terms for a specific category.
        
        Args:
            category: The category name.
        
        Returns:
            A dictionary mapping term names to regex patterns.
        """
        return self.terms.get(category, {})
    
    def add_term(self, category: str, name: str, pattern: str) -> None:
        """
        Add a custom term to the database and in-memory cache.
        
        Args:
            category: The category name.
            name: The term name.
            pattern: The regex pattern for the term.
        """
        # Add to database
        query = '''
        INSERT INTO custom_terms (category, name, pattern)
        VALUES (?, ?, ?)
        ON CONFLICT(category, name) DO UPDATE SET
        pattern = excluded.pattern
        '''
        
        self.db_manager.execute_update(query, (category, name, pattern))
        
        # Update in-memory cache
        if category not in self.terms:
            self.terms[category] = {}
        
        self.terms[category][name] = pattern
        
        # Log the action
        details = f"Added/updated custom term '{name}' in category '{category}'"
        self.db_manager.log_audit("system", "add_custom_term", details)
    
    def remove_term(self, category: str, name: str) -> None:
        """
        Remove a custom term from the database and in-memory cache.
        
        Args:
            category: The category name.
            name: The term name.
        """
        # Remove from database
        query = '''
        DELETE FROM custom_terms
        WHERE category = ? AND name = ?
        '''
        
        self.db_manager.execute_update(query, (category, name))
        
        # Update in-memory cache
        if category in self.terms and name in self.terms[category]:
            del self.terms[category][name]
            
            # If the category is now empty, remove it
            if not self.terms[category]:
                del self.terms[category]
        
        # Log the action
        details = f"Removed custom term '{name}' from category '{category}'"
        self.db_manager.log_audit("system", "remove_custom_term", details)
    
    def export_terms(self) -> Dict[str, Dict[str, str]]:
        """
        Export all custom terms for backup or transfer.
        
        Returns:
            A nested dictionary of all custom terms.
        """
        return self.terms
    
    def import_terms(self, terms: Dict[str, Dict[str, str]]) -> None:
        """
        Import custom terms from a backup or another instance.
        
        Args:
            terms: A nested dictionary of custom terms.
        """
        for category, category_terms in terms.items():
            for name, pattern in category_terms.items():
                self.add_term(category, name, pattern)