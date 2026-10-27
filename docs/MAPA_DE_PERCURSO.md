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

## La Kaline — transplante de idioma 06

| Gate | Estado | Evidência / pendência |
|---|---|---|
| Preservação | PARTIAL | Backup SQLite consistente e patch/WIP salvos localmente em `/tmp/la-kaline-language-transplant-06-checkpoint`; quatro sessões francesas intactas. |
| Catálogo espanhol | PARCIAL | Quatro IDs ES e proveniência. No navegador, `ESL001` abriu e a resposta correta mostrou feedback determinístico; a leitura é original e contextualizada pela página da UNICEF. A escuta abre o vídeo público por link; não foi concluída a atividade. |
| Isolamento por idioma | PARCIAL | Migração aditiva; API/UI mostraram progresso 0 em espanhol e quatro sessões preservadas em francês. Alternância foi verificada. Conclusão/reload de sessão espanhola não foi executada para evitar inserir progresso artificial. |
| Fluxo espanhol e celular | PARCIAL | Desktop verificado em `ESL001` e `ESD001`. Seleção de texto exibiu a palavra destacada, mas o painel não reagiu nessa interação automatizada; listener de mouse/toque foi acrescentado e ainda requer nova verificação com interação manual. Celular 390×844 não foi testado nesta missão. |
| Chat e voz | BLOCKED | `OPENROUTER_API_KEY` ausente no último estado confirmado; não inventar respostas nem declarar TTS/STT. |

Estado da missão 06: `PARTIAL` até o fluxo real espanhol ser percorrido e persistido. Próxima ação exata: iniciar `node server.mjs`, confirmar que a tela inicial abre em espanhol, e validar no navegador o conteúdo de `ESL001` antes de qualquer novo registro de sessão. Depois confirmar com o proprietário se o registro de progresso de teste deve ser feito na base SQLite ativa; não criar sessões artificiais para declarar aceitação.

## Direção de produto aprovada — 2026-10-27

### Visão

O produto passa a se chamar **LA KALINE**. A direção aprovada é um jogo narrativo original de investigação que ensina espanhol por leitura, escuta, conversa, escrita e dedução. A experiência pode se inspirar na estrutura de pistas, viagens e raciocínio de jogos clássicos de investigação geográfica, incluindo Carmen Sandiego, sem reutilizar personagens, marcas, textos, imagens, roteiros ou arquivos protegidos. A interface será adulta, minimalista, cinematográfica e original.

Kaline é uma mulher misteriosa em fuga pelo mundo hispanófono. Ela deixa mensagens, documentos, gravações, poemas, músicas e enigmas. O jogador acompanha as pistas e aprende espanhol para interpretá-las. **O motivo da fuga, quem a persegue, se ela quer ser encontrada e o desfecho continuam em aberto**; nenhuma dessas hipóteses é cânone antes da aprovação narrativa do proprietário.

### Objetivo pedagógico e estrutura por destino

Cada país ou território hispanófono visitado será um destino de investigação. Puerto Rico participa como território, não como Estado soberano. Cada destino proposto reúne quatro elementos pedagógicos:

1. **Un texto** — leitura literária, histórica, jurídica, filosófica ou educacional;
2. **Una voz** — poeta ou poetisa ligada à produção local;
3. **Una canción** — música autêntica acessada por meio autorizado;
4. **Un enigma** — problema lógico relacionado às evidências.

O jogador combina as quatro pistas para deduzir o próximo destino. As soluções terão critérios verificáveis; a IA poderá explicar e orientar, mas não decidir nem inventar o gabarito. Investigações devem poder ser interrompidas e retomadas sem perda de evidências, usando o SQLite, as sessões, o histórico, os catálogos, a revisão e o player já existentes. Não se prevê um motor de jogo separado sem necessidade demonstrada.

No CASE 001 foram implementados o cartão de entrada, expediente Bogotá, três pistas consultáveis, enigma determinístico, cuaderno com notas/vocabulário/progresso de leitura e indicador do destino deduzido. Não há mapa interativo nem chat funcional neste caso; Kaline informa indisponibilidade quando o provedor não está configurado.

### Núcleo editorial aprovado

O romance de longo prazo será *Cien años de soledad*, de Gabriel García Márquez, Colômbia. O progresso deverá seguir a edição do proprietário, sem spoilers, citações fabricadas ou reprodução integral não autorizada.

O percurso de pensamento existencial prioriza Miguel de Unamuno e Emilio Uranga; José Ortega y Gasset será contextualizado pelo raciovitalismo; Carlos Astrada também integra a seleção filosófica. O núcleo de poesia inclui Sor Juana Inés de la Cruz, Delmira Agustini, Alfonsina Storni, Gabriela Mistral, Idea Vilariño, Piedad Bonnett, Sara Uribe, Elena Medel, Jorge Manrique, Gustavo Adolfo Bécquer, Rubén Darío, Antonio Machado, Federico García Lorca, César Vallejo, Raúl Zurita e Luis García Montero. O núcleo musical inclui Bad Bunny, Rosalía, Natalia Lafourcade, Jorge Drexler, Shakira e Mercedes Sosa. Esta seleção é uma direção editorial, não um catálogo bibliográfico já validado; equilíbrio regional, histórico e de gênero, obras específicas, proveniência e direitos ainda precisam de revisão.

### Roteiro narrativo e estado dos casos

| Caso proposto | Destino | Texto | Voz | Música | Enigma |
|---|---|---|---|---|---|
| 001 | Bogotá, Colômbia | *Cien años de soledad* | Piedad Bonnett | Carlos Vives | Reconstruir acontecimentos com evidências |
| 002 | San Juan, Puerto Rico | Crônica porto-riquenha a selecionar | Julia de Burgos | Bad Bunny | Comparar depoimentos, inferências e contradições |
| 003 | Ciudad de México, México | Emilio Uranga | Sor Juana Inés de la Cruz | Natalia Lafourcade | Comparar proposições e testemunhos |

O caso 001 foi implementado e validado localmente conforme a seção de entrega abaixo. Casos 002 e 003 continuam propostas; obras, direitos, roteiro, solução e aprovação permanecem pendentes.

### Estado técnico vigente nesta decisão

| Área | Estado | Evidência e limite |
|---|---|---|
| Histórico de missões | GENESIS_01 `PARTIAL`; UX_02 `PARTIAL`; MEDIA_FLOW_03 `PASS`; KALINE_04 `BLOCKED`; KALINE_05 `PARTIAL`; LANGUAGE_TRANSPLANT_06 `PARTIAL` | Estados preservados como registrados; não significam que a nova experiência de jogo já exista. |
| Aplicativo e interface | App abre localmente; CASE 001 está implementado no fluxo espanhol | Validação manual em navegador e SQLite isolado registrada abaixo; não houve deploy. |
| Francês | Catálogo 40/40/40 preservado; quatro sessões anteriores permanecem francesas | O catálogo passou pelo validador; auditoria bibliográfica item a item segue pendente. |
| Espanhol | Catálogo piloto de quatro itens; `ESL001` abriu e mostrou correção determinística; fluxo parcial | Persistência de conclusão, vocabulário selecionado e isolamento por idioma ainda não passaram por um percurso completo. |
| SQLite | Integridade `ok`; quatro sessões francesas preservadas; nenhuma sessão espanhola de teste | O banco real e arquivos WAL/SHM são dados locais do proprietário e não serão publicados. |
| Kaline e voz | Chat, Kokoro/TTS e Whisper/STT sem validação real | `OPENROUTER_API_KEY` estava ausente no último estado verificado; nenhuma resposta ou transcrição simulada. |

### Riscos e gates pendentes

- Confirmar direitos, proveniência e condições de acesso para cada obra, poema, gravação, documento e imagem antes de inclusão ou redistribuição.
- Evitar spoilers e preservar o texto protegido do romance; usar somente a edição indicada pelo proprietário e trechos autorizados.
- Definir um mistério coerente sem canonizar o motivo da fuga ou seu desfecho prematuramente.
- Validar que cada pista sustenta a dedução e que o gabarito lógico não depende de resposta improvisada do modelo.
- Concluir e persistir uma sessão espanhola real, validar seleção/salvamento de vocabulário, confirmar o gabarito gramatical e testar retomada após reload sem fabricar progresso.
- Validar navegação móvel em 390×844; testar chat, voz e transcrição somente após configuração legítima dos serviços.
- Planejar o caso 002 apenas após revisão editorial; manter motivo da viagem e eventuais perseguidores sem cânone aprovado.

### Próxima missão exata

`MISSION=LA_KALINE_CASE_001_GENESIS` — concluída localmente; ver seção “Entrega CASE 001”. Próxima ação: revisar integração pública segura sobre `origin/master`, sem incluir histórico/arquivos locais privados.


### Entrega CASE 001 — 2026-10-27

| Gate | Estado | Evidência / limite |
|---|---|---|
| Caso jogável | PASS local | `content/case001.json` fornece a nota ficcional, três fontes, três cidades candidatas e o enigma. O motivo da viagem continua explicitamente desconhecido. |
| Texto e leitura | PASS local | Nota original identificada como ficção; edição de *Cien años de soledad* tem link editorial. O livro não é reproduzido nem presumido lido. |
| Voz / poesia | PASS local | Link para recital institucional de Piedad Bonnett. Link testado no player do YouTube; não se copiam versos. |
| Música | PASS local | Vídeo oficial de Carlos Vives testado com reprodução e avanço do contador, sem pedido de login no cenário observado. Não se copiam letras. |
| Dedução | PASS local | Resposta errada e justificativa insuficiente rejeitadas; justificativa completa aceitou San Juan, Puerto Rico, como próximo destino proposto. Enigma exige as três pistas anteriores e registra tentativas no SQLite. |
| Persistência | PASS em cópias isoladas | Notas, leitura, tentativas, estado do caso e vocabulário usam tabelas SQLite aditivas; recarga recuperou o estado. Não se criaram sessões francesas artificiais. |
| Responsividade | PASS local | Navegador verificado em desktop 1440×900 e mobile 390×844. |
| Percurso anterior | PRESERVADO | Cópia de teste e SQLite proprietário mantêm SARTRE-01, P001, M001 e G001. O banco principal e o WAL correspondem ao checkpoint; o SHM transitório tem hash diferente e não foi restaurado nem substituído. |
| Chat e voz | BLOCKED | Chat depende de `OPENROUTER_API_KEY`; TTS/STT não foram implementados nesta missão. O caso segue jogável sem esses serviços. |
| Publicação | PENDENTE | `origin/master` não contém o histórico privado local. Publicar exige branch baseada em `origin/master` com apenas os arquivos aprovados desta missão. |

Os testes com progresso ocorreram somente em bancos isolados criados do backup consistente em `/tmp/la-kaline-case-001-checkpoint/`. `PRAGMA integrity_check` retornou `ok` nas duas cópias e no banco do proprietário. O banco principal e o WAL do proprietário mantêm o hash do checkpoint; o hash do SHM transitório divergiu na verificação final. O banco principal e os quatro registros de sessão permaneceram intactos.

Arquivos desta missão: `app.js`, `server.mjs`, `styles.css`, `content/case001.json` e este mapa. Os quatro arquivos WIP não rastreados foram preservados e excluídos da alteração. Nenhum deploy foi realizado.

`NEXT_EXACT_ACTION=criar commit isolado dos arquivos aprovados e preparar branch pública a partir de origin/master, sem carregar commits/arquivos privados locais; revisar PR antes de merge.`
