from django.db import models
from django.core.exceptions import ValidationError
from django.core.files.storage import FileSystemStorage
from django.utils import timezone
from django.urls import reverse


DEFAULT_IMMAGINE_ARTICOLO = "/media/default_immagine_articolo/saniscope_logo 2.png"


def puo_vedere_precursori(user):
    # True per utenti anonimi, staff, superuser o account azienda.
    if not user.is_authenticated:
        return True
    return user.is_staff or user.is_superuser or user.is_azienda


class Categoria(models.Model):
    nome_categoria = models.CharField(max_length=30, unique=True)
    immagine_categoria = models.ImageField(upload_to='immagini_categoria/', default=DEFAULT_IMMAGINE_ARTICOLO)

    def clean(self):
        self.nome_categoria = self.nome_categoria.strip()
        nuovo = self.nome_categoria
        if self.pk is not None:
            attuale = Categoria.objects.filter(pk=self.pk).values_list('nome_categoria', flat=True).first()
            if attuale is not None and attuale != nuovo and attuale.lower() == nuovo.lower():
                raise ValidationError({'nome_categoria': "Non puoi rinominare una categoria cambiando solo maiuscole/minuscole o spazi."})

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return str(self.pk) + " " + self.nome_categoria

    def get_absolute_url(self):
        return reverse("dettaglio_categoria", kwargs={"pk": self.pk})
    
    class Meta:
        db_table = "Categoria"
        verbose_name = "Categoria"
        verbose_name_plural = "Categorie"
        ordering = ['pk']


class Sottocategoria(models.Model):

    nome_sottocategoria=models.CharField(max_length=30)
    categoria=models.ForeignKey("Categoria", on_delete=models.CASCADE)
    codice_sottocategoria=models.IntegerField(unique=True, default=0)

    @classmethod
    def _prossimo_codice(cls, categoria_id):
        ultima = cls.objects.filter(categoria_id=categoria_id).order_by('codice_sottocategoria').last()
        if ultima is not None:
            return ultima.codice_sottocategoria + 1
        return categoria_id * 10 + 1

    def save(self, *args, **kwargs):
        self.nome_sottocategoria = self.nome_sottocategoria.strip()
        self.full_clean(exclude=['codice_sottocategoria'])
        if self.pk is None:
            self.codice_sottocategoria = self._prossimo_codice(self.categoria_id)
        else:
            categoria_attuale, codice_attuale = Sottocategoria.objects.filter(pk=self.pk).values_list('categoria_id', 'codice_sottocategoria').first()
            if categoria_attuale != self.categoria_id:
                self.codice_sottocategoria = self._prossimo_codice(self.categoria_id)
            else:
                self.codice_sottocategoria = codice_attuale
        super().save(*args, **kwargs)

    def __str__ (self):
        return str(self.codice_sottocategoria%10) +" " + self.nome_sottocategoria

    class Meta:
        db_table="Sottocategoria"
        verbose_name = "Sottocategoria"
        verbose_name_plural ="Sottocategorie"

class Prodotto(models.Model):
    codice_prodotto=models.CharField(max_length=10)
    nome_prodotto=models.CharField(max_length=300)
    descrizione=models.CharField(max_length=250, blank=True, null=True)
    unita_di_misura = models.CharField(max_length=4,null=True)
    precursore = models.FileField(
        upload_to="documenti/",
        blank=True,
        default="",
    )
    gruppo=models.IntegerField(default=0)
    categoria=models.ForeignKey("Categoria", on_delete=models.CASCADE)
    sottocategoria = models.ForeignKey("Sottocategoria",to_field="codice_sottocategoria", on_delete=models.CASCADE, blank=True, null=True)
    sottocategoriaGestionale = models.IntegerField(blank=True, null=True)

    def save(self, *args, **kwargs):
        if self.sottocategoria_id is not None:
            self.sottocategoriaGestionale = self.sottocategoria_id % 10
        else:
            self.sottocategoriaGestionale = None
        super().save(*args, **kwargs)


    def __str__ (self):
        return "Id: "+ str(self.pk)+",   codice prodotto: " + self.codice_prodotto

    def get_absolute_url(self):
        return reverse("dettaglio_categoria", kwargs={"pk": self.categoria_id})

    class Meta:
        db_table="Prodotto"
        verbose_name = "Prodotto"
        verbose_name_plural ="Prodotti"
        ordering = ['codice_prodotto']


class ImmaginiArticolo(models.Model):
    articolo = models.OneToOneField(Prodotto, on_delete= models.CASCADE, related_name='immagine_rel')
    immagine = models.ImageField(upload_to='immagini_articoli/', default=DEFAULT_IMMAGINE_ARTICOLO)

    def __str__ (self):
        return "id: "+ str(self.pk) + " id_articolo: " + str(self.articolo.pk)+ " url: " + str(self.immagine)

    class Meta:
        db_table="ImmaginiArticolo"
        verbose_name = "ImmaginiArticolo"
        verbose_name_plural ="ImmaginiArticoli"


class SchedeTecniche (models.Model):
    articolo = models.OneToOneField(Prodotto, on_delete= models.CASCADE, related_name='scheda_rel')
    data_inizio = models.DateTimeField(default=timezone.now)
    data_fine = models.DateTimeField(null =True)
    scheda = models.FileField(upload_to ="schede_tecniche/")
    
    def __str__ (self):
        return  str(self.data_inizio)+ " " + str(self.articolo.codice_prodotto)

    class Meta:
        db_table="SchedeTecnica"
        verbose_name = "SchedeTecnica"
        verbose_name_plural ="SchedeTecniche"