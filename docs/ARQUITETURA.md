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
