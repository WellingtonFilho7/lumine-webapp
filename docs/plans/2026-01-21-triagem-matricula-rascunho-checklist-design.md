# Plano de Design — Triagem/Matrícula (Rascunho + Checklist)

Data: 2026-01-21

## Contexto
O fluxo de triagem/matrícula é feito em campo e nem sempre todos os dados estão disponíveis no primeiro contato. Hoje a validação rígida pode travar a coleta inicial e gerar frustração. O objetivo é reduzir atrito, aumentar clareza do que falta e permitir progresso gradual sem criar novos estados no banco.

## Objetivos
- Permitir salvar triagem incompleta (rascunho) sem perder dados.
- Tornar visível, em tempo real, o que está faltando para concluir cada etapa.
- Manter o schema atual do Sheets (sem migração) e evitar novos status persistidos.

## Não‑objetivos
- Não criar novos status no backend.
- Não alterar regras de matrícula já existentes (continua exigindo campos completos).

## Proposta
### 1) Rascunho de triagem (estado derivado)
- A criança pode ser salva em `enrollmentStatus = em_triagem` mesmo com campos obrigatórios faltando.
- “Rascunho” é calculado no app (não persistido), quando faltam campos mínimos da triagem.
- `triageDate` só é preenchida quando a triagem estiver completa; `createdAt` e `enrollmentDate` continuam sendo gravados.
- Filtro “Rascunhos” na lista: `em_triagem + incompleto`.
- (Opcional) Contador no dashboard: “Triagens pendentes”.

### 2) Checklist visível + validação progressiva
- Mostrar um checklist compacto “Obrigatórios da etapa” com ✓/•.
- O botão principal muda de “Salvar rascunho” para “Concluir triagem” quando todos os obrigatórios estiverem preenchidos.
- Na matrícula, o botão “Matricular” só ativa com checklist completo; opcional “Salvar rascunho” mantém dados sem concluir.
- Checklist colapsável no mobile; fixo lateral no desktop.

## Regras de negócio (mantidas)
- Matrícula só finaliza quando campos obrigatórios estiverem completos.
- Mudança de status para `matriculado` continua exigindo validação completa.

## UX (microcopy sugerido)
- “Faltam X itens para concluir a triagem.”
- Botão: “Salvar rascunho” quando incompleto; “Concluir triagem” quando completo.

## Riscos e mitigação
- Rascunhos esquecidos → filtro + contador pendentes.
- Confusão entre salvar e concluir → microcopy e checklist explícito.

## Critérios de aceite
- É possível salvar triagem incompleta sem erro.
- Checklist reflete campos preenchidos em tempo real.
- Mudança de status para `matriculado` segue exigindo campos completos.

