from django.db import models

# Create your models here.


class CategoriaFile(models.Model):
    nome_categoria = models.CharField(max_length=60, blank=True, null=True)

    def __str__ (self):
        return  self.nome_categoria

class File(models.Model):
    nome_file=models.CharField(max_length=100, blank=True, null=True) 
    file = models.FileField(upload_to="documenti/", null=True)   
    categoria = models.OneToOneField(CategoriaFile, on_delete=models.CASCADE, null=True, related_name='file_cat')

    def __str__ (self):
        return  self.nome_file