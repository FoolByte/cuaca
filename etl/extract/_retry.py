"""Simple retry with exponential backoff — no extra dependency."""

import logging
import time
from typing import Callable, TypeVar

logger = logging.getLogger(__name__)

T = TypeVar("T")


def retry_with_backoff(
    fn: Callable[..., T],
    *args,
    max_retries: int = 3,
    base_delay: float = 1.0,
    **kwargs,
) -> T:
    """Call *fn* up to max_retries times with exponential backoff.

    Raises the last exception if all retries are exhausted.
    """
    last_exc: Exception | None = None
    for attempt in range(1, max_retries + 1):
        try:
            return fn(*args, **kwargs)
        except Exception as exc:
            last_exc = exc
            if attempt < max_retries:
                delay = base_delay * (2 ** (attempt - 1))
                logger.warning(
                    "Attempt %d/%d failed: %s — retrying in %.1fs",
                    attempt,
                    max_retries,
                    exc,
                    delay,
                )
                time.sleep(delay)
            else:
                logger.error(
                    "Attempt %d/%d failed: %s — giving up",
                    attempt,
                    max_retries,
                    exc,
                )
    raise last_exc  # type: ignore[misc]
