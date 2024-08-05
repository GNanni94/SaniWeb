from django.shortcuts import render
from django.core.mail import send_mail
from django.shortcuts import  HttpResponse
# Create your views here.

#DA PREVENTIVO PUOI ACCEDERE AL CLIENTE CHE RISULTA ESSERE L'UTENTE REGISTRATO
def emailPreventivo(request, carrello, dettaglio_preventivo, preventivo):

    subject = 'Richiesta Preventivo'

    message ='Messaggio inviato da: '+ preventivo.cliente.first_name + " " + preventivo.cliente.cognome_ragione_sociale + ", con email " + preventivo.cliente.email + ", numero di telefono: " + preventivo.cliente.telefono +"\n "  
    mes=" "
    for x in carrello:
        mes = "*  codice prodotto: " + x.prodotto.codice_prodotto + ", nome prodotto: " + x.prodotto.nome_prodotto + ", quantità: " +  str(x.quantita) + "\n " + mes + "\n"
    
    message = message + mes + "\n "
    message = message + "\n " + "messaggio aggiuntivo preventivo: " + dettaglio_preventivo.messaggio + ", luogo di destinazione: " + dettaglio_preventivo.luogo

    from_email = preventivo.cliente.email
    recipient_list = ['info@saniscope-chimica.it']
    send_mail(subject, message, from_email, recipient_list)
    return HttpResponse('ok')


def emailMessaggio(request, cleinte, messaggio):

    subject = 'Messaggio da SitoWeb'
    message = 'Messaggio inviato da: '+ " " + str(cleinte.nome) + " "+ str(cleinte.cognome_ragione_sociale) + ", contenuto del messaggio:" + str(messaggio)
    from_email = cleinte.email
    recipient_list = ['info@saniscope-chimica.it']
    rispostaEmailMessaggio(request, cleinte)
    send_mail(subject, message, from_email, recipient_list)


def rispostaEmailMessaggio(request, cliente):
    subject = 'SaniScope-Chimica s.r.l.'  
    message = 'La ringraziamo per averci scelto, la contatteremo prima possibile Saniscope-chimica s.r.l.' 
    from_email = 'giulionannicini@gmail.com'
    recipient_list = [cliente.email]