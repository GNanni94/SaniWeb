from io import BytesIO

from PIL import Image

from django.core.files.base import ContentFile

DIMENSIONE_MASSIMA_IMMAGINE = 1000
QUALITA_JPEG = 82


def comprimi_immagine(file_immagine):
    file_immagine.seek(0)
    contenuto_originale = file_immagine.read()
    file_immagine.seek(0)

    immagine = Image.open(file_immagine)
    formato = immagine.format
    immagine.thumbnail((DIMENSIONE_MASSIMA_IMMAGINE, DIMENSIONE_MASSIMA_IMMAGINE))

    parametri_salvataggio = {'format': formato}
    if formato == 'JPEG':
        if immagine.mode != 'RGB':
            immagine = immagine.convert('RGB')
        parametri_salvataggio.update(quality=QUALITA_JPEG, optimize=True)
    elif formato == 'PNG':
        parametri_salvataggio['optimize'] = True

    buffer = BytesIO()
    immagine.save(buffer, **parametri_salvataggio)
    contenuto_compresso = buffer.getvalue()

    if len(contenuto_compresso) >= len(contenuto_originale):
        return ContentFile(contenuto_originale)
    return ContentFile(contenuto_compresso)
