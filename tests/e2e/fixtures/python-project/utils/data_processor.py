"""
Data processing module for the Python test project
"""

import time
import json
import logging
from typing import Any, Dict, List, Union
from datetime import datetime
import threading

from .error_handler import ValidationError, ParsingError, TimeoutError

logger = logging.getLogger(__name__)

def process_data(
    data: Any,
    validate: bool = True,
    transform: bool = True,
    timeout: float = 5.0
) -> Dict[str, Any]:
    """
    Process input data with validation and transformation
    
    Args:
        data: Input data to process
        validate: Whether to validate the data
        transform: Whether to transform the data
        timeout: Timeout in seconds
        
    Returns:
        Processed data with metadata
        
    Raises:
        ValidationError: If validation fails
        ParsingError: If parsing fails
        TimeoutError: If processing times out
    """
    start_time = time.time()
    process_id = f"process-{int(time.time())}-{id(data)}"
    steps = []
    
    logger.info(f"Starting data processing: {process_id}")
    
    # Create a result container that can be accessed from another thread
    result_container = {"result": None, "error": None}
    
    def processing_task():
        try:
            # Validate data if enabled
            validated_data = data
            if validate:
                logger.debug("Validating data")
                steps.append("validation")
                validated_data = _validate_data(data)
            
            # Transform data if enabled
            processed_data = validated_data
            if transform:
                logger.debug("Transforming data")
                steps.append("transformation")
                processed_data = _transform_data(validated_data)
            
            # Create result
            result_container["result"] = {
                "id": process_id,
                "original_data": data,
                "processed_data": processed_data,
                "metadata": {
                    "processing_time": time.time() - start_time,
                    "timestamp": datetime.now().isoformat(),
                    "steps": steps
                }
            }
        except Exception as e:
            logger.error(f"Error in processing task: {e}")
            result_container["error"] = e
    
    # Start processing in a separate thread
    processing_thread = threading.Thread(target=processing_task)
    processing_thread.daemon = True
    processing_thread.start()
    
    # Wait for processing to complete or timeout
    processing_thread.join(timeout)
    
    # Check if processing is still running
    if processing_thread.is_alive():
        # Processing timed out
        error_msg = f"Processing timed out after {timeout} seconds"
        logger.error(error_msg)
        raise TimeoutError(error_msg)
    
    # Check for errors
    if result_container["error"]:
        raise result_container["error"]
    
    # Return the result
    return result_container["result"]

def _validate_data(data: Any) -> Any:
    """
    Validate input data
    
    Args:
        data: Data to validate
        
    Returns:
        Validated data
        
    Raises:
        ValidationError: If validation fails
        ParsingError: If parsing fails
    """
    # Add a small delay to simulate validation
    time.sleep(0.05)
    
    # Check for null data
    if data is None:
        raise ValidationError("Data cannot be None")
    
    # Parse strings as JSON
    if isinstance(data, str):
        try:
            return json.loads(data)
        except json.JSONDecodeError as e:
            raise ParsingError(f"Failed to parse string data as JSON: {e}")
    
    # Return the data if it passes validation
    return data

def _transform_data(data: Any) -> Any:
    """
    Transform the data
    
    Args:
        data: Data to transform
        
    Returns:
        Transformed data
    """
    # Add a small delay to simulate transformation
    time.sleep(0.1)
    
    # Handle lists
    if isinstance(data, list):
        return [{
            **item,
            "transformed": True,
            "timestamp": datetime.now().isoformat()
        } if isinstance(item, dict) else item for item in data]
    
    # Handle dictionaries
    if isinstance(data, dict):
        return {
            **data,
            "transformed": True,
            "timestamp": datetime.now().isoformat()
        }
    
    # Return primitives as is
    return data
