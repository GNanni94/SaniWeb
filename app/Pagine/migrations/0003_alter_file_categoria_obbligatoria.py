import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('Pagine', '0002_alter_file_categoria'),
    ]

    operations = [
        migrations.AlterField(
            model_name='file',
            name='categoria',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='file_cat', to='Pagine.categoriafile'),
        ),
    ]
