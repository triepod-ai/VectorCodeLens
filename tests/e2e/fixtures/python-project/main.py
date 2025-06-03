#!/usr/bin/env python3
"""
Main module for the Python test project
"""

import sys
import json
import logging
from datetime import datetime
from typing import Dict, Any, Optional, List, Union

from utils.data_processor import process_data
from utils.error_handler import handle_error, ProcessingError

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def load_config(config_path: Optional[str] = None) -> Dict[str, Any]:
    """
    Load configuration from a file
    
    Args:
        config_path: Path to config file, or None for default
        
    Returns:
        Configuration dictionary
    """
    if not config_path:
        # Use default config
        return {
            'processing': {
                'validate': True,
                'transform': True,
                'timeout': 5.0
            },
            'logging': {
                'level': 'INFO',
                'file': None
            },
            'input': {
                'default_data': {'sample': 'data'}
            }
        }
    
    try:
        with open(config_path, 'r') as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Failed to load config from {config_path}: {e}")
        raise

def main(input_data: Optional[Union[Dict, List, str]] = None, 
         config_path: Optional[str] = None) -> Dict[str, Any]:
    """
    Main application function
    
    Args:
        input_data: Data to process, or None to use default
        config_path: Path to config file, or None for default
        
    Returns:
        Processing result
    """
    try:
        # Load configuration
        config = load_config(config_path)
        
        # Configure logging
        log_level = getattr(logging, config['logging']['level'], logging.INFO)
        logger.setLevel(log_level)
        
        logger.info("Starting application")
        
        # Get data from config if not provided
        if input_data is None:
            input_data = config['input'].get('default_data')
            logger.debug(f"Using default data: {input_data}")
        
        # Process the data
        result = process_data(
            data=input_data,
            validate=config['processing'].get('validate', True),
            transform=config['processing'].get('transform', True),
            timeout=config['processing'].get('timeout', 5.0)
        )
        
        logger.info("Data processing completed successfully")
        
        return {
            'success': True,
            'result': result,
            'timestamp': datetime.now().isoformat()
        }
        
    except ProcessingError as e:
        # Handle known processing errors
        error_info = handle_error(e, "main")
        logger.error(f"Processing error: {error_info}")
        
        return {
            'success': False,
            'error': error_info,
            'timestamp': datetime.now().isoformat()
        }
        
    except Exception as e:
        # Handle unexpected errors
        logger.exception(f"Unexpected error: {e}")
        
        return {
            'success': False,
            'error': {
                'type': 'UnexpectedError',
                'message': str(e)
            },
            'timestamp': datetime.now().isoformat()
        }

if __name__ == "__main__":
    # Parse command line arguments
    input_arg = sys.argv[1] if len(sys.argv) > 1 else None
    config_arg = sys.argv[2] if len(sys.argv) > 2 else None
    
    # Parse input data if provided
    input_data = None
    if input_arg:
        try:
            input_data = json.loads(input_arg)
        except json.JSONDecodeError:
            # If not valid JSON, use as string
            input_data = input_arg
    
    # Run the application
    result = main(input_data, config_arg)
    
    # Output the result
    print(json.dumps(result, indent=2))
