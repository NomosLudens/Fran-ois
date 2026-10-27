# La Kaline — Tu español, a tu manera

Aplicativo local-first para aprender espanhol com atividades curtas de leitura, escuta, conversa e gramática. O acervo francês original permanece disponível como segundo idioma. A direção aprovada prevê transformar LA KALINE em um jogo narrativo original de investigação; o jogo ainda não está implementado. Consulte [docs/MAPA_DE_PERCURSO.md](docs/MAPA_DE_PERCURSO.md) para propostas e estado real.

## Iniciar

Requer Node.js 22 ou superior (`node:sqlite` nativo). Na raiz do repositório:

```sh
node server.mjs
```

Abra <http://127.0.0.1:4173>. O servidor escuta somente em loopback. O idioma padrão é espanhol; use o seletor `ES`/`FR` no cabeçalho para alternar. A preferência e o progresso são guardados no SQLite existente.

Para habilitar conversa e voz reais, configure `OPENROUTER_API_KEY` localmente no `.env` (ignorado pelo Git) e reinicie o servidor. Sem chave, as funções externas permanecem indisponíveis; não há respostas de demonstração.

## Catálogos

- `content/catalog.es.json`: quatro atividades iniciais com IDs próprios, objetivos, níveis, critérios de conclusão e proveniência. O texto de leitura e os exercícios são originais do projeto; o vídeo abre no player público do YouTube a partir da página institucional da UNICEF.
- `content/catalog.json`: catálogo francês original de 40 poemas, 40 músicas e 40 unidades gramaticais. Mantém IDs e conteúdo sem alterações.
- O percurso de Sartre pertence somente ao francês. Seu exemplar pessoal continua no navegador e não é enviado ao servidor.

O progresso francês legado recebe `language='fr'` em uma migração aditiva do SQLite. O espanhol tem contagem de sessões, revisão de vocabulário e contexto de conversa separados. Não se infere fluência a partir da conclusão de uma atividade.

## Limites atuais

O catálogo espanhol é um piloto de quatro atividades, não um curso completo nem uma avaliação diagnóstica de proficiência. A conversa e a voz dependem da chave OpenRouter e precisam ser testadas com serviços configurados. A escuta abre o vídeo institucional no YouTube; a disponibilidade depende do serviço e da rede do estudante. Consulte [docs/MAPA_DE_PERCURSO.md](docs/MAPA_DE_PERCURSO.md) para o estado de validação e pendências.
