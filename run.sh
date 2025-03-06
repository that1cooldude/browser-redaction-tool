#!/bin/bash

# Activate the virtual environment
source venv/bin/activate

# Start the application
python run.py

# Keep the terminal open if there's an error
read -p "Press Enter to exit..." dummy 