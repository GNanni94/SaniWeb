from django.shortcuts import render
from django.core.mail import send_mail
from django.shortcuts import  HttpResponse
import logging
# Create your views here.

#DA PREVENTIVO PUOI ACCEDERE AL CLIENTE CHE RISULTA ESSERE L'UTENTE REGISTRATO
def emailPreventivo(request, carrello, dettaglio_preventivo, preventivo):
    logger = logging.getLogger(__name__)
    logger.info(f"Email preventivo dell'utente con id: {request.user.pk} ed email {request.user.email}")
    subject = 'Richiesta Preventivo'

    message ='Messaggio inviato da: '+ preventivo.cliente.first_name + " " + preventivo.cliente.cognome_ragione_sociale + ", con email " + preventivo.cliente.email + ", numero di telefono: " + preventivo.cliente.telefono +"\n "  
    mes=" "
    for x in carrello:
        mes = "* codice prodotto: " + x.prodotto.codice_prodotto + ", nome prodotto: " + x.prodotto.nome_prodotto + ", quantità: " +  str(x.quantita) + "\n " + mes + "\n"
    
    message = message + mes + "\n "
    message = message + "\n " + "messaggio aggiuntivo preventivo: " + str(dettaglio_preventivo.messaggio) + ", luogo di destinazione: " + str(dettaglio_preventivo.luogo)

    from_email = preventivo.cliente.email
    recipient_list = ['info@saniscope-chimica.it']
    send_mail(subject, message, from_email, recipient_list)
    return HttpResponse('ok')


def emailMessaggio(request, cliente, messaggio):
    logger = logging.getLogger(__name__)
    logger.info(f"Email preventivo dell'utente con id: {cliente.pk} ed email {cliente.email}")

    subject = 'Messaggio da SitoWeb'
    message = 'Messaggio inviato da: '+ " " + str(cliente.nome) + " "+ str(cliente.cognome_ragione_sociale) + ", contenuto del messaggio:" + str(messaggio)
    from_email = cliente.email
    recipient_list = ['info@saniscope-chimica.it']
    rispostaEmailMessaggio(request, cliente)
    send_mail(subject, message, from_email, recipient_list)


def rispostaEmailMessaggio(request, cliente):
    subject = 'SaniScope-Chimica s.r.l.'  
    message = 'La ringraziamo per averci scelto, la contatteremo prima possibile Saniscope-chimica s.r.l.' 
    from_email = 'info@saniscope-chimica.it'
    recipient_list = [cliente.email]