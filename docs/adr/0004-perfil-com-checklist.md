# Dono cria Perfil com checklist; Loja fica no Vínculo

O MVP inclui Perfil nomeado com checklist de permissões, além do Dono como papel de sistema. Lojas não entram no checklist — o alcance de Loja é o Vínculo do usuário. Isso evita o IDOR clássico de “checkbox de loja” divergindo do vínculo. Criar/editar Perfil e criar Loja permanecem fora do checklist (premissa de trabalho; refinamento posterior).
