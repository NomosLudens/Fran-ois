# Arquitetura

## Escolha

Aplicação sem framework: HTML, CSS e JavaScript do navegador, mais servidor HTTP nativo de Node.js 22+ e `node:sqlite`. A missão parte de um repositório vazio; não havia base React ou dependências locais a preservar. A solução reduz instalação e mantém o conteúdo disponível offline dentro do checkout. O processo escuta apenas `127.0.0.1`.

## Fluxos reais

- Catálogo: `content/catalog.json` é carregado pelo navegador e também é renderizado em `content/CATALOGO_FRANCES.md`.
- Sessão: navegador envia ID, tipo e correção ao `POST /api/session`; o servidor valida o formato e registra sessão/data/resultado no SQLite. `GET /api/state` recupera histórico após recarregamento.
- Exercício: comparação local, determinística e exata após normalização de caixa, espaços e pontuação. Respostas livres não são aceitas como “entendidas” por IA.
- Chat: `POST /api/chat` encaminha mensagem ao OpenRouter no servidor. Sem chave retorna `503`; falha de provedor é mostrada como erro. O app não gera resposta substituta.
- Voz: SpeechSynthesis e SpeechRecognition nativos quando existentes. MediaRecorder grava temporariamente no navegador e permite replay; a gravação não é persistida, enviada nem analisada.
- Sartre: PDF/TXT escolhido no input é aberto localmente via File API. Nenhum upload de arquivo é implementado.

## Persistência e segredo

SQLite em `data/francois.sqlite` guarda somente sessões (ID, tipo, instante e acerto). `.env` é lido no servidor e ignorado pelo Git. `.env.example` não tem segredo. Conversas, arquivos, gravações, preferências e revisões espaçadas ainda não são persistidos. Backup previsto: cópia consistente do SQLite com `node:sqlite`/`VACUUM INTO` ou parada controlada; validar antes de operação persistente na MELLON.

## Limites

Sem autenticação: o servidor permanece em loopback e não está pronto para exposição de rede. Não há streaming de resposta, migrações, retenção, exportação, sincronização, PWA offline instalável nem SRS calculado. O histórico conta sessões e acertos, não mede fluência. Não reutilizamos código fonte externo.

## Extensão local em andamento — conversa e voz

O código local em andamento acrescenta `session_artifacts`, `session_activity`, `chat_conversations` e `chat_messages` com `CREATE TABLE IF NOT EXISTS`, sem apagar ou substituir as tabelas de progresso. Conversas são associadas a `user_id='local'`, item, tipo e chave de sessão; mensagens guardam papel, identidade do emissor, conteúdo, situação e ordem. Abrir Kaline cria somente o registro vazio da conversa, permitindo recuperar sua identidade do SQLite sem chave de IA; não cria mensagens. Falta validar mensagens reais do modelo, seu readback após reload e continuidade de uma conversa com conteúdo.

O servidor reconstrói o contexto da lição do catálogo e de `session_activity`/`session_artifacts`; histórico recuperado do SQLite é limitado às últimas 24 mensagens concluídas. A resposta corretiva gramatical é derivada do gabarito canônico do catálogo. A palavra/excerto selecionado chega do navegador. No fluxo francês legado, vocabulário salvo ainda é enviado pelo navegador e a revisão usa `localStorage`; no fluxo espanhol, mensagens ao provedor recuperam o vocabulário diretamente de `vocabulary_items` no SQLite. Um excerto autorizado é limitado a 1.200 caracteres. O arquivo PDF/TXT escolhido fica no navegador e o arquivo completo não é enviado.

O proxy local usa no servidor `OPENROUTER_API_KEY` para chat, `POST /api/tts` encaminhando a `/api/v1/audio/speech` (Kokoro `hexgrad/kokoro-82m`, voz `ff_siwis`) e `POST /api/stt` encaminhando a `/api/v1/audio/transcriptions` com `language: fr`. A interface usa captura explícita com `getUserMedia`/`MediaRecorder`, oferece replay e correção da transcrição antes de uma ação separada de envio. Código e contrato foram inspecionados, mas não se comprovou uma chamada de modelo nem áudio audível real.

Na validação local da missão FRANCOIS_KALINE_05, a API `/api/health` declarou chat e áudio não configurados; `.env` não existe neste checkout e a variável também estava ausente do ambiente de início. A conversa de M001 foi aberta e recarregada: o mesmo `conversationId=1`, `session_key=2:M001`, `user_id=local` foi recuperado, com zero mensagens, sem acionar o ciclo concluído ou a API externa. As quatro sessões anteriores permaneceram intactas. No navegador, M001 foi inspecionada em 1440×900 e 390×844; no celular a largura do documento (375 CSS px) não excedeu o viewport de 390 px. A interface exibiu indisponibilidade real e manteve chat/microfone desabilitados. `POST /api/chat` sem chave retornou HTTP 503 com a causa correta; não acionou o provedor. Catálogo validado: 120 IDs únicos. Estado atual: `PARTIAL`; chat real, persistência de mensagens reais, TTS, STT e round trip de voz aguardam a credencial e teste manual. O limite permanece loopback local.

## Transplante para La Kaline — espanhol e francês

O idioma padrão da experiência é espanhol (`es-419`); francês continua disponível como curso separado. `content/catalog.es.json` é carregado pelo endpoint `/api/catalog?language=es`, enquanto `content/catalog.json` permanece como o catálogo francês. A navegação existente Hoje · Estudar · Revisar · Kaline e o retrato aprovado são mantidos.

A migração do progresso usa `ALTER TABLE sessions ADD COLUMN language ... DEFAULT 'fr'` somente quando a coluna não existe. Assim os quatro registros legados continuam franceses e seus IDs, instantes e resultados não são regravados. `GET /api/state` retorna a identidade de idioma por sessão. A preferência de curso fica em `settings.active_language`; a revisão espanhola usa `vocabulary_items` em SQLite e não compartilha chaves com a revisão francesa legada.

Conversas e atividade recebem idioma e chaves com prefixo de idioma. A leitura do histórico francês também reconhece a chave antiga sem prefixo, preservando conversas anteriores. O endpoint GET de conversa é somente leitura e não cria registros vazios. O prompt do provedor adapta a professora ao espanhol latino-americano inicial e usa português como apoio; a chamada continua bloqueada quando não há `OPENROUTER_API_KEY`.

O catálogo espanhol inicial contém quatro itens, sem tentar igualar as 120 entradas francesas. A leitura didática é original e cita UNICEF como contexto temático; o vídeo de Shantal abre em seu canal do Banco Mundial via YouTube, a partir da página da UNICEF. O player incorporado falhou no navegador embutido, então a interface mostra um link para o player público que foi comprovado em execução. O exercício da leitura e a unidade gramatical têm correção determinística. TTS/STT encaminham `es` e a voz Kokoro `ef_dora` para espanhol; francês continua usando `ff_siwis`. Essas escolhas de contrato não provam TTS/STT: validar somente após teste real do serviço e do navegador.

Estado desta implementação: piloto de conteúdo e isolamento local; conclusão, atualização/reload, seleção e revisão de vocabulário ainda exigem validação manual com a base de dados do estudante. Não é avaliação diagnóstica de proficiência nem prova de fluência.
