#!/usr/bin/env bash
# exit on error
set -o errexit

echo "-------- STARTING BUILD SCRIPT --------"
echo "Upgrading pip..."
python3 -m pip install --upgrade pip

echo "Installing requirements from requirements.txt..."
python3 -m pip install -r requirements.txt

echo "List installed packages:"
python3 -m pip list

echo "-------- BUILD FINISHED --------"
