from django.core.files.uploadedfile import UploadedFile

from django import forms

from .models import CategoriaFile, File


class DocumentoForm(forms.ModelForm):
    categoria_nuova = forms.CharField(label="Nome categoria", required=False, max_length=60)

    class Meta:
        model = File
        fields = ("nome_file", "categoria", "file")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["nome_file"].required = True
        self.fields["categoria"].required = False
        self.fields["categoria"].empty_label = "+ Nuova categoria"

    def clean(self):
        cleaned_data = super().clean()
        categoria = cleaned_data.get("categoria")
        categoria_nuova = cleaned_data.get("categoria_nuova", "").strip()
        if not categoria and not categoria_nuova:
            self.add_error("categoria_nuova", "Scegli una categoria esistente o indicane una nuova.")
        return cleaned_data

    def clean_file(self):
        file = self.cleaned_data.get("file")
        # In modifica il campo puo' restare vuoto per mantenere il file
        # attuale (comportamento nativo di ClearableFileInput): in quel
        # caso "file" e' il FieldFile gia' salvato, non un upload nuovo, e
        # non va ri-validato
        if not isinstance(file, UploadedFile):
            return file
        intestazione = file.read(4)
        file.seek(0)
        if intestazione != b"%PDF":
            raise forms.ValidationError("Il file deve essere un PDF.")
        return file

    def save(self, commit=True):
        # La select ha sempre la priorita': "categoria_nuova" va letto solo
        # se non e' stata scelta una categoria esistente, altrimenti un
        # testo dimenticato li' (il JS toglie solo la classe "d-none" al
        # cambio di "categoria", non lo svuota mai) sovrascriverebbe la
        # scelta appena fatta nella select
        categoria_nuova = self.cleaned_data.get("categoria_nuova", "").strip()
        if not self.cleaned_data.get("categoria") and categoria_nuova:
            categoria, _ = CategoriaFile.objects.get_or_create(
                nome_categoria__iexact=categoria_nuova,
                defaults={"nome_categoria": categoria_nuova},
            )
            self.instance.categoria = categoria
        return super().save(commit=commit)
