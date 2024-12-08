"""
Django settings for SitoWeb project.

Generated by 'django-admin startproject' using Django 4.1.

For more information on this file, see
https://docs.djangoproject.com/en/4.1/topics/settings/

For the full list of settings and their values, see
https://docs.djangoproject.com/en/4.1/ref/settings/
"""

from pathlib import Path
import os
import logging.config
from django.utils.log import DEFAULT_LOGGING

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/4.1/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = 'django-insecure--q!k-c1bfeebws@4rc#%_t!ae_t^fn-)!gqzo#t&grj&fb1a@b'

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

ALLOWED_HOSTS = ['192.168.100.107',
                 '127.0.0.1', 'localhost']


# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'Prodotti.apps.ProdottiConfig',
    'Pagine.apps.PagineConfig',
    'bootstrap5',
    'Carrello.apps.CarrelloConfig',
    'Preventivo.apps.PreventivoConfig',
    'Utente.apps.UtenteConfig',
    'crispy_forms',
    'crispy_bootstrap5',
    'phonenumber_field',
    'InvioEmail.apps.InvioemailConfig',
    'cookie_consent',
    
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'SitoWeb.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
                'Prodotti.views.catalogo_home',
            ],
        },
    },
]

WSGI_APPLICATION = 'SitoWeb.wsgi.application'


# Database
# https://docs.djangoproject.com/en/4.1/ref/settings/#databases

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}


# Password validation
# https://docs.djangoproject.com/en/4.1/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/4.1/topics/i18n/

LANGUAGE_CODE = 'it'

TIME_ZONE = 'Europe/Rome'

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/4.1/howto/static-files/

STATIC_URL = 'static/'
STATIC_ROOT = 'static/'
# Default primary key field type
# https://docs.djangoproject.com/en/4.1/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

#MEDIA_ROOT = '/media/'
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media/')

STATICFILES_DIRS = (
    os.path.join(BASE_DIR, 'assets/'),
)


AUTH_USER_MODEL = "Utente.Registrati" #new
AUTHENTICATION_BACKENDS = ['Utente.backends.EmailBackend']

LOGIN_REDIRECT_URL = "home" #new
LOGOUT_REDIRECT_URL = "home" #new

CRISPY_ALLOWED_TEMPLATE_PACKS = "bootstrap5" #new
CRISPY_TEMPLATE_PACK = "bootstrap5" #new

EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"

EMAIL_HOST = 'out.postassl.it'
EMAIL_PORT = 465
EMAIL_HOST_USER = 'info@saniscope-chimica.it'
EMAIL_HOST_PASSWORD = 'Term30@1961'
#EMAIL_USE_TLS = True
EMAIL_USE_SSL = True


# Disable Django's logging setup
LOGGING_CONFIG = None

LOGLEVEL = os.environ.get('LOGLEVEL', 'info').upper()

logging.config.dictConfig({
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'default': {
            # exact format is not important, this is the minimum information
            'format': '%(asctime)s %(name)-12s %(levelname)-8s %(message)s',
        },
        'django.server': DEFAULT_LOGGING['formatters']['django.server'],
    },
    'handlers': {
        # console logs to stderr
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'default',
        },
        'django.server': DEFAULT_LOGGING['handlers']['django.server'],
        'file': {
            'level': 'DEBUG',
            'class': 'logging.FileHandler',
            'filename': 'SaniLog.log',
            'formatter': 'default',
        },
    },
    'loggers': {
        # default for all undefined Python modules
        '': {
            'level': 'DEBUG',
            'handlers': ['console'],
        },
        # Our application code
        'Carrello': {
            'level': LOGLEVEL,
            'handlers': ['file'],
            # Avoid double logging because of root logger
            'propagate': False,
        },
        'InvioEmail': {
            'level': LOGLEVEL,
            'handlers': ['file'],
            # Avoid double logging because of root logger
            'propagate': False,
        },
        'Pagine': {
            'level': LOGLEVEL,
            'handlers': ['file'],
            # Avoid double logging because of root logger
            'propagate': False,
        },
        'Preventivo': {
            'level': LOGLEVEL,
            'handlers': ['file'],
            # Avoid double logging because of root logger
            'propagate': False,
        },
        'Prodotti': {
            'level': LOGLEVEL,
            'handlers': ['file'],
            # Avoid double logging because of root logger
            'propagate': False,
        },
        'Utente': {
            'level': LOGLEVEL,
            'handlers': ['file'],
            # Avoid double logging because of root logger
            'propagate': False,
        },
        # Default runserver request logging
        'django.server': DEFAULT_LOGGING['loggers']['django.server'],
    },
})


#SECURE_SSL_REDIRECT = False
#SECURE_HSTS_SECONDS = 31536000  # 1 year
#SECURE_HSTS_INCLUDE_SUBDOMAINS = True
#SECURE_HSTS_PRELOAD = True

#SESSION_COOKIE_SECURE = True
#CSRF_COOKIE_SECURE = True