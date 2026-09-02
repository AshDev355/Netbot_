import logging
import sys


def configure_logging(level: int = logging.INFO) -> None:
    """Call once, at app startup (see main.py)."""
    logging.basicConfig(
        level=level,
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
        stream=sys.stdout,
    )


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
