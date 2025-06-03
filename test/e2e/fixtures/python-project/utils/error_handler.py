"""
Error handling module for the Python test project
"""

import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

class ProcessingError(Exception):
    """Base class for all processing errors"""
    def __init__(self, message: str, error_type: str = "ProcessingError", context: Optional[Dict[str, Any]] = None):
        super().__init__(message)
        self.error_type = error_type
        self.context = context or {}

class ValidationError(ProcessingError):
    """Error raised when validation fails"""
    def __init__(self, message: str, context: Optional[Dict[str, Any]] = None):
        super().__init__(message, "ValidationError", context)

class ParsingError(ProcessingError):
    """Error raised when parsing fails"""
    def __init__(self, message: str, context: Optional[Dict[str, Any]] = None):
        super().__init__(message, "ParsingError", context)

class TimeoutError(ProcessingError):
    """Error raised when processing times out"""
    def __init__(self, message: str, context: Optional[Dict[str, Any]] = None):
        super().__init__(message, "TimeoutError", context)

class NetworkError(ProcessingError):
    """Error raised for network issues"""
    def __init__(self, message: str, context: Optional[Dict[str, Any]] = None):
        super().__init__(message, "NetworkError", context)

def handle_error(error: Exception, context_name: str) -> Dict[str, Any]:
    """
    Handle an error and format it consistently
    
    Args:
        error: The exception that occurred
        context_name: The context where the error occurred
        
    Returns:
        Formatted error information
    """
    # Extract error information
    if isinstance(error, ProcessingError):
        error_type = error.error_type
        error_context = error.context
    else:
        error_type = error.__class__.__name__
        error_context = {}
    
    # Format the error
    error_info = {
        "type": error_type,
        "message": str(error),
        "context": context_name,
        **error_context
    }
    
    # Log the error
    logger.error(f"Error in {context_name}: {error_type} - {error}")
    
    return error_info
