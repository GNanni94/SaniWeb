import re

from django.core.exceptions import ValidationError
from django.utils.translation import gettext as _


class UppercaseValidator:
    '''
    Richiede almeno una lettera maiuscola, stesso controllo gia' fatto
    lato client in signup.html (hasMaiuscola)
    '''
    def validate(self, password, user=None):
        if not re.search(r'[A-Z]', password):
            raise ValidationError(
                _("La password deve contenere almeno una lettera maiuscola."),
                code='password_no_upper',
            )

    def get_help_text(self):
        return _("La password deve contenere almeno una lettera maiuscola.")


class SpecialCharacterValidator:
    '''
    Richiede almeno un carattere speciale (non alfanumerico), stesso
    controllo gia' fatto lato client in signup.html (hasSpeciale)
    '''
    def validate(self, password, user=None):
        if not re.search(r'[^A-Za-z0-9]', password):
            raise ValidationError(
                _("La password deve contenere almeno un carattere speciale."),
                code='password_no_special',
            )

    def get_help_text(self):
        return _("La password deve contenere almeno un carattere speciale.")
