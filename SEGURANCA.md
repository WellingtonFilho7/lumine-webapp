# Segurança — Sistema Lumine

## Autenticação
- O webapp usa Supabase Auth e envia o JWT da sessão interna em `X-User-Jwt`.
- A API exige perfil interno ativo e papel permitido para leitura e escrita operacionais.
- Não há mais dependência de token Bearer exposto no bundle do frontend.

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
1. Se um usuário interno for comprometido, desative o perfil em `perfis_internos`.
2. Se necessário, revogue sessões no Supabase Auth e force novo login.
3. Revalide `GET /api/bootstrap` e operações principais com `X-User-Jwt`.

## Limitações conhecidas
- Dados locais em `localStorage` sem criptografia.
- Origin check é barreira complementar, não substitui autenticação.
- Sessão expirada ou perfil interno desativado bloqueiam o uso até novo login/aprovação.
