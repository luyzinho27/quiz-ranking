# QuizMaster - Sistema de Quiz Educacional

QuizMaster ? uma aplica??o web educacional para cria??o e execu??o de quizzes com foco em aprendizado competitivo. Ela atende dois p?blicos: alunos (que fazem os quizzes e acompanham desempenho) e administradores (que criam conte?dos, gerenciam usu?rios e analisam resultados).

## Visao Geral

A aplica??o oferece uma experiencia completa de quiz com timer, progresso e resultados, al?m de recursos de ranking e relatorios. O sistema foi pensado para ser simples de usar na pr?tica e consistente do ponto de vista tecnico, com dados centralizados no Firebase e uma interface responsiva para uso em desktop e mobile.

## Diferenciais e Atualizacoes Recentes

- Continuidade do quiz mesmo com recarregamento (F5 ou reload), mantendo questao atual e tempo restante.
- Persistencia de estado local combinada com Firestore para recuperar progresso com confiabilidade.
- Controle de saidas do quiz: primeira saida salva progresso, segunda saida finaliza automaticamente.
- Protecao do conteudo durante o quiz com bloqueio de selecao, copia e impressao (melhor esforco no navegador).
- Rankings geral e por quiz, com filtros e destaque do proprio usuario.
- Relatorios administrativos com indicadores do sistema e quizzes mais populares.

## Funcionalidades Para Alunos

- Lista de quizzes ativos com informacoes de tempo, categoria e quantidade de questoes.
- Inicio e continuidade de quizzes em andamento.
- Timer visual e progresso de questoes em tempo real.
- Historico de desempenho com percentuais, pontuacao e tempo.
- Ranking geral e ranking por quiz com busca de usuarios.
- Revisao de respostas quando o quiz permite.

## Funcionalidades Para Administradores

- Criacao, edicao e exclusao de quizzes.
- Ativacao e desativacao de quizzes.
- Configuracao de visibilidade por todos os alunos ou alunos especificos.
- Definicao de tempo, categoria e quantidade de questoes.
- Bloqueio ou liberacao de revisao de respostas.
- Banco de questoes com cadastro, edicao e exclusao.
- Importacao de questoes via JSON.
- Gestao completa de usuarios (editar, ativar, desativar e excluir).
- Relatorios e estatisticas gerais do sistema.

## Fluxo Pratico Do Quiz

1. O aluno escolhe um quiz disponivel na aba Quizzes.
2. O quiz abre em tela dedicada com timer e navegacao entre questoes.
3. Ao sair pela primeira vez, o progresso e salvo para continuar depois.
4. Ao sair pela segunda vez, o quiz e finalizado com as respostas atuais.
5. Em caso de recarregamento da pagina, o quiz e retomado automaticamente.

## Tecnologias Utilizadas

- Frontend: HTML5, CSS3 e JavaScript puro.
- Autenticacao: Firebase Authentication (email/senha e Google).
- Banco de dados: Firestore.
- Graficos: Chart.js.
- Icones: Font Awesome.
- Hospedagem: site estatico (ex: GitHub Pages ou servidor local).

## Estrutura Tecnica (Firestore)

- `users`: dados de usuarios, incluindo `name`, `email`, `userType`, `status`, `createdAt`, `updatedAt`.
- `quizzes`: metadados do quiz, como `title`, `description`, `category`, `questionsCount`, `time`, `visibility`, `allowedStudents`, `allowReview`, `status`, `createdAt`.
- `questions`: banco de questoes com `text`, `options`, `correctAnswer`, `category`, `createdAt`.
- `userQuizzes`: tentativas e progresso, com `userId`, `quizId`, `status`, `answers`, `currentQuestionIndex`, `timeRemaining`, `exitCount`, `questionIds`, `score`, `percentage`, `timeTaken`, `updatedAt`, `completedAt`.

## Seguranca e Limitacoes

- Bloqueios de copia e impressao funcionam no navegador, mas nao impedem capturas de tela em nivel de sistema operacional.
- O sistema depende de regras do Firestore bem configuradas para controle de acesso aos dados.

## Instalacao e Configuracao

1. Clone o repositorio:
   `git clone <URL_DO_REPOSITORIO>`
2. Edite as credenciais do Firebase em `script.js`.
3. No Firebase Console, habilite os provedores de login usados (Email/Senha e Google).
4. Configure as regras do Firestore para separar permissoes de alunos e administradores.
5. Execute localmente usando um servidor estatico (por exemplo, Live Server) ou publique em um host estatico.

## Licenca

Este projeto utiliza a licenca MIT. Consulte o arquivo `LICENSE`.
