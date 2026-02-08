Instruções para deploy da Cloud Function `adminUpdateUser`

Resumo
- A função `adminUpdateUser` é uma callable Cloud Function que usa o Admin SDK para atualizar o e-mail e/ou senha de um usuário do Firebase Authentication.
- Ela deve ser usada apenas a partir do cliente por administradores autenticados. Para maior segurança, configure custom claims no usuário administrador (por exemplo, customClaims.admin = true) e altere a função para checar essa claim.

Pré-requisitos
- Ter um projeto Firebase (mesmo usado no front-end). Você precisa do Firebase CLI instalado e do login (firebase login).
- Na conta free (Spark) do Firebase, Cloud Functions podem ser usadas, mas existem limitações (quanto a invocações e recursos). Caso precise de recursos extra, poderá ser necessário habilitar billing.

Deploy
1. Abra um terminal na pasta `functions`:
   cd functions
2. Instale dependências:
   npm install
3. Faça login e selecione o projeto:
   firebase login
   firebase use --add
4. Faça o deploy da função:
   firebase deploy --only functions:adminUpdateUser

Deploy automático via GitHub Actions (sem precisar executar `npm install` localmente)
--------------------------------------------------------------------------
Se você não consegue rodar `npm install` localmente, use o workflow GitHub Actions incluído em `.github/workflows/deploy-functions.yml`.

O que o workflow faz:
- Faz checkout do código
- Configura Node 14
- Autentica com uma service account (via secret `GCP_SA_KEY`)
- Executa `npm ci` dentro da pasta `functions`
- Instala `firebase-tools` e executa `firebase deploy --only functions:adminUpdateUser`

Secrets necessários (no repositório GitHub -> Settings -> Secrets):
- `GCP_SA_KEY` : Conteúdo da chave JSON da service account (valor inteiro do arquivo JSON)
- `FIREBASE_PROJECT_ID` : ID do projeto Firebase (ex: `quiz-informatica-2025`)

Para criar a service account (no console do Google Cloud):
1. Abra: https://console.cloud.google.com/iam-admin/serviceaccounts
2. Crie uma nova service account com role: `Cloud Functions Admin` e `Cloud Build Service Account` (ou roles equivalentes).
3. Gere e baixe a chave JSON e cole o conteúdo no secret `GCP_SA_KEY`.

Depois de adicionar os secrets, vá em Actions -> selecione o workflow "Deploy Firebase Function (adminUpdateUser)" e execute manualmente (Run workflow) ou faça push para `main`.

Segurança recomendada (opcional)
- Configure custom claims para marcar quais usuários são administradores. Exemplo com Admin SDK local ou via script:
  admin.auth().setCustomUserClaims(uidAdmin, { admin: true })
- Na função, descomente/check a claim para garantir que somente admins possam chamar a função.

Uso no front-end
- No front-end usamos `functions.httpsCallable('adminUpdateUser')({ uid, email, password })`.
- A função retornará `{ success: true }` em caso de sucesso ou `{ success: false, error: 'mensagem' }` em caso de erro.

Observação sobre GitHub Pages
- O front-end pode ser hospedado no GitHub Pages sem problemas.
- As Cloud Functions permanecem no Firebase (backend). Isso é compatível: o front-end faz chamadas HTTPS para as functions do Firebase.
