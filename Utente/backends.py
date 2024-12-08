from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend
import logging


class EmailBackend(ModelBackend):
    def authenticate(self, request, username=None, password=None, **kwargs):
        logger = logging.getLogger(__name__)
        UserModel = get_user_model()
        try:
            user = UserModel.objects.get(email=username)
        except UserModel.DoesNotExist:
            return None
        else:
            if user.check_password(password):
                logger.info("Si è loggato l'utente " + user.email)
                return user
        return None