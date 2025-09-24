from django.db import models
from django.utils.translation import gettext as _
from django.core.files.storage import FileSystemStorage
import datetime
from django.urls import reverse


# Create your models here.
class Categoria(models.Model):
    nome_categoria=models.CharField(max_length=30, blank=True)
    immagine_categoria = models.ImageField(upload_to='immagini_categoria/', default ="logo/saniscope_logo 2.png")

    def __str__ (self):
        return str(self.pk) +" " + self.nome_categoria 

    def get_absolute_url(self):
        return reverse("dettaglio_categoria", kwargs={"pk": self.pk})
    
    class Meta:
        db_table="Categoria"
        verbose_name = "Categoria"
        verbose_name_plural ="Categorie"


class Sottocategoria(models.Model):

    nome_sottocategoria=models.CharField(_("nome_sottocategoria"), max_length=30, blank=True)
    categoria=models.ForeignKey("Categoria", on_delete=models.CASCADE, blank=True, null=True)
    codice_sottocategoria=models.IntegerField(unique=True, default=99)

    def save(self, *args, **kwargs):
        sottocategoria_target=Sottocategoria.objects.filter(categoria_id = self.categoria_id).order_by('codice_sottocategoria').last()
        if sottocategoria_target is not None:
            self.codice_sottocategoria = sottocategoria_target.codice_sottocategoria + 1
            return super().save( *args, **kwargs)

    def __str__ (self):
        return str(self.codice_sottocategoria%10) +" " + self.nome_sottocategoria 

        db_table="Sottocategoria"
        verbose_name = "Sottocategoria"
        verbose_name_plural ="Sottocategorie"

class Prodotto(models.Model):
    codice_prodotto=models.CharField(max_length=10, blank=True)
    nome_prodotto=models.CharField(max_length=300,blank=True)
    descrizione=models.CharField(max_length=250, blank=True, null=True)
    unita_di_misura = models.CharField(max_length=4,null=True)
    precursore = models.CharField(max_length=250, blank=True, null=True)
    gruppo=models.IntegerField(null=True)
    categoria=models.ForeignKey("Categoria", on_delete=models.CASCADE, blank=True, null=True)
    sottocategoria = models.ForeignKey("Sottocategoria",to_field="codice_sottocategoria", on_delete=models.CASCADE, blank=True, null=True)    
    sottocategoriaGestionale = models.IntegerField(null=True)

    def save(self, *args, **kwargs):
        if self.sottocategoriaGestionale is not None:
            sottocategoria_target=Sottocategoria.objects.filter(codice_sottocategoria = self.categoria_id * 10 + self.sottocategoriaGestionale ).first()
            self.sottocategoria = sottocategoria_target
            return super().save(*args, **kwargs)


    def __str__ (self):
        return "Id: "+ str(self.pk)+",   codice prodotto: " + self.codice_prodotto

    def get_absolute_url(self):
        return reverse("dettaglio_categoria", kwargs={"pk": self.categoria.pk})

    class Meta:
        db_table="Prodotto"
        verbose_name = "Prodotto"
        verbose_name_plural ="Prodotti"


class ImmaginiArticolo(models.Model):
    articolo = models.OneToOneField(Prodotto, on_delete= models.CASCADE, null=True, related_name='immagine_rel')
    immagine = models.ImageField(upload_to='immagini_articoli/', null=True)

    def __str__ (self):
        return "id: "+ str(self.pk) + " id_articolo: " + str(self.articolo.pk)+ " url: " + str(self.immagine)

    class Meta:
        db_table="ImmaginiArticolo"
        verbose_name = "ImmaginiArticolo"
        verbose_name_plural ="ImmaginiArticoli"


class SchedeTecniche (models.Model):
    articolo = models.OneToOneField(Prodotto, on_delete= models.CASCADE, null=True, related_name='scheda_rel')
    data_inizio = models.DateTimeField(default = datetime.datetime.now)
    data_fine = models.DateTimeField(null =True)
    scheda = models.FileField(upload_to ="schede_tecniche/", null=True)
    
    def __str__ (self):
        return  str(self.data_inizio)+ " " + str(self.articolo.codice_prodotto)

    class Meta:
        db_table="SchedeTecnica"
        verbose_name = "SchedeTecnica"
        verbose_name_plural ="SchedeTecniche"