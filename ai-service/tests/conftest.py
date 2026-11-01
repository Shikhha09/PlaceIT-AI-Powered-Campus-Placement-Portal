import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
os.environ.pop("AI_SERVICE_API_KEY", None)
os.environ["APP_ENV"] = "development"
