# Segurança — Sistema Lumine

## Autenticação
- A API exige token Bearer em todas as requisições (GET/POST).
- Token configurado via variáveis de ambiente, não versionado.
- O token é uma barreira de acesso simples (visível no bundle do frontend).

## Proteção de dados
- CORS/Origin restritos por allowlist (barreiras leves de navegador).
- Overwrite protegido por DATA_REV e validação de conflito.
- Backups automáticos antes de overwrite para planilha secundária.
- Log de operações na aba Audit.
- Prevenção de regressão: bloqueia overwrite com menos dados que o servidor.

## Regras de uso
- Usar apenas em dispositivos pessoais ou institucionais.
- Não compartilhar a URL da API.
- Em dispositivos compartilhados, usar "Sair e limpar dados".
- Evitar uso em computadores públicos.

## Rotação de token
1. Gerar novo token (ex.: `openssl rand -hex 32`).
2. Atualizar `API_TOKEN` no Vercel (lumine-api) e redeploy.
3. Atualizar `REACT_APP_API_TOKEN` no Vercel (lumine-webapp) e redeploy.
4. Testar GET e POST.

## Limitações conhecidas
- Token visível no bundle do frontend.
- Sem autenticação por usuário.
- Dados locais em `localStorage` sem criptografia.
- Origin check é best effort (não substitui token).
