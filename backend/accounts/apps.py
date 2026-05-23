from django.apps import AppConfig
import logging
import os
import sys

logger = logging.getLogger(__name__)

class AccountsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'accounts'
    
    def ready(self):
        if os.environ.get('RUN_MAIN') == 'true':
            return
        
        if len(sys.argv) > 1:
            command = sys.argv[1]
            skip_commands = [
                'migrate', 'makemigrations', 'collectstatic', 
                'createsuperuser', 'test', 'shell', 'dbshell',
                'check', 'compilemessages', 'makemessages'
            ]
            if command in skip_commands:
                logger.info(f"Skip on '{command}' command")
                return
        
        try:
            from .self_ping import start_keep_alive
            start_keep_alive()
            logger.info("self ping initialized" )
        except Exception as e:
            logger.error(f"self ping failed to start: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())