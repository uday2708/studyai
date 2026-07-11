import logging
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger(__name__)

class WorkerService:
    """
    Service to run asynchronous background tasks using a ThreadPoolExecutor.
    """
    _executor = None

    @classmethod
    def initialize(cls, max_workers=4):
        if cls._executor is None:
            cls._executor = ThreadPoolExecutor(max_workers=max_workers, thread_name_prefix="StudyAI-Worker")
            logger.info(f"WorkerService initialized with {max_workers} thread workers.")

    @classmethod
    def submit_task(cls, fn, *args, **kwargs):
        """
        Submit a function to be run asynchronously in the background.
        """
        if cls._executor is None:
            cls.initialize()
            
        logger.info(f"Submitting background task: {fn.__name__}")
        
        # We wrapper execution to capture any exceptions and log them
        def wrapper():
            try:
                fn(*args, **kwargs)
                logger.info(f"Background task {fn.__name__} completed successfully.")
            except Exception as e:
                logger.exception(f"Exception occurred in background task {fn.__name__}: {e}")
                
        cls._executor.submit(wrapper)

    @classmethod
    def shutdown(cls):
        if cls._executor:
            cls._executor.shutdown(wait=True)
            logger.info("WorkerService shutdown completed.")
            cls._executor = None
