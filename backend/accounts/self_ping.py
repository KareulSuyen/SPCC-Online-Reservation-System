import threading
import time
import logging
import requests
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)

class SelfPingKeepAlive:
    def __init__(self):
        self.running = False
        self.thread = None
        self.ping_interval = 840  
        self.started = False
        
    def _ping_loop(self):
        logger.info("="*60)
        logger.info("[SELF-PING] Service started")
        logger.info(f"[SELF-PING] It will ping every {self.ping_interval // 60} minutes")
        logger.info(f"[SELF-PING] Ping target: /api/auth/heartbeat/")
        logger.info("="*60)
        
        time.sleep(60)
        
        ping_count = 0
        
        while self.running:
            try:
                ping_count += 1
                current_time = timezone.now().strftime('%Y-%m-%d %H:%M:%S')
                
                logger.info(f"[SELF-PING] Ping #{ping_count} at {current_time}")
                
                backend_url = getattr(settings, 'BACKEND_URL', 'https://spcc-ors.onrender.com')
                ping_url = f"{backend_url}/api/auth/heartbeat/"
                
                response = requests.get(
                    ping_url,
                    timeout=30,
                    headers={'User-Agent': 'SPCC-ORS-KeepAlive/1.0'}
                )
                
                if response.status_code == 200:
                    logger.info(f"Success! Status: {response.status_code}")
                    logger.info(f"Next ping in 14 minutes")
                else:
                    logger.warning(f"Unexpected status: {response.status_code}")
                
            except requests.exceptions.Timeout:
                logger.error(f"Ping timeout after 30s")
                logger.error(f"Will retry in 14 minutes")
            except requests.exceptions.RequestException as e:
                logger.error(f"Request failed: {str(e)}")
                logger.error(f"Will retry in 14 minutes")
            except Exception as e:
                logger.error(f"Unexpected error: {str(e)}")
                logger.error(f"Will retry in 14 minutes")
            
            time.sleep(self.ping_interval)
        
        logger.info("[SELF-PING] Keep-alive service stopped")
    
    def start(self):
        if self.started:
            logger.debug("Already running, skipping start")
            return
        
        if settings.DEBUG:
            logger.info("Disabled in local development")
            return
        
        self.running = True
        self.started = True
        
        self.thread = threading.Thread(target=self._ping_loop, daemon=False, name="SelfPingThread")
        self.thread.start()
        
        logger.info("Background thread started successfully")
    
    def stop(self):
        self.running = False
        if self.thread and self.thread.is_alive():
            self.thread.join(timeout=5)
        logger.info("Stopped")

_keep_alive_service = SelfPingKeepAlive()

def start_keep_alive():
    _keep_alive_service.start()

def stop_keep_alive():
    _keep_alive_service.stop()
