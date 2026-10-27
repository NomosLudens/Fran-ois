# Mapa de percurso e gates

## Estado registrado em 2026-10-27

| Gate | Estado | Evidência / pendência |
|---|---|---|
| A — Auditoria | PARTIAL | 42 repositórios e manifestos consultados; leitura aprofundada dos prioritários; nenhum código copiado. Triagem de outros repositórios não é revisão linha a linha. |
| B — Catálogo | PARTIAL | Contagens 40/40/40, IDs únicas e campos preenchidos passaram validador. Poemas e músicas ainda precisam validação bibliográfica item a item; créditos das músicas pendentes; percurso Sartre sem paginação porque edição física/digital do proprietário não foi fornecida. |
| C — Aplicativo | PARTIAL | App inicia; screenshot 390×844 confirmou layout mobile e rosto da imagem visível. A correção gravou SQLite, recarga recuperou progresso e próxima etapa mostrou música. Chat retorna indisponível sem chave; síntese do navegador falhou no IAB e não confirmou `onstart` no Chrome; microfone/STT não testados. |
| D — Deploy | PARTIAL | MELLON auditada sem escrita; recurso reduzido; nenhum túnel, serviço ou deploy François criado. |

## Fluxo implementado para verificação

1. Início propõe etapa do ciclo atual.
2. Abrir poesia, música, gramática ou o percurso do Sartre.
3. Responder G001 e comparar com resposta editorial fixa.
4. Registrar a etapa no banco local SQLite.
5. Recarregar e consultar a área Progresso.
6. Continuar pelo próximo tipo do ciclo.

Respostas exatas e persistência são observáveis; uma tela renderizada, resposta HTTP isolada ou build não substitui o fluxo manual. Resultado final desta missão depende da validação manual abaixo e da auditoria individual de fontes. `PRODUCTION_CHANGED=NO`.
