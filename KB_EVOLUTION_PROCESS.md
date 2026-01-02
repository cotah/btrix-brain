# 📚 BTRIX Knowledge Base Evolution Process

Processo padrão para evoluir o BTRIX Brain com base em dados reais de produção.

---

## 🎯 Objetivo

Manter o Knowledge Base atualizado, preciso e alinhado com as necessidades reais dos usuários, usando dados de produção para guiar melhorias.

---

## 📊 Ciclo de Evolução

```
1. COLETAR DADOS (7-14 dias)
   ↓
2. ANALISAR GAPS (Learning Report)
   ↓
3. PRIORIZAR MUDANÇAS (High/Medium/Low)
   ↓
4. ATUALIZAR KB (Documentos .md)
   ↓
5. TESTAR MUDANÇAS (Smoke Tests)
   ↓
6. VERSIONAR E INGERIR (v1.0.X)
   ↓
7. DEPLOY CONTROLADO (Staging → Production)
   ↓
8. MONITORAR IMPACTO (Métricas)
   ↓
9. VALIDAR MELHORIA (Comparativo)
   ↓
10. ROLLBACK SE NECESSÁRIO
```

---

## 1️⃣ COLETAR DADOS (7-14 dias)

### Período Mínimo
- **Primeira iteração:** 14 dias
- **Iterações seguintes:** 7 dias

### Métricas a Monitorar
- Taxa de fallback por intent
- Similarity média por intent
- Top 20 queries em fallback
- Violações de guardrails
- Latência média

### Ferramentas
```bash
# Dashboard em tempo real
https://seu-dominio.com/dashboard

# Logs estruturados
tail -f logs/rag_requests.log
tail -f logs/price_violations.log

# Métricas via API
curl https://seu-dominio.com/api/metrics/rag
```

---

## 2️⃣ ANALISAR GAPS (Learning Report)

### Gerar Relatório

```bash
cd backend
node generate_learning_report.js daily    # Relatório diário
node generate_learning_report.js weekly   # Relatório semanal
```

### O Que Analisar

1. **Fallback Rate por Intent**
   - Meta: < 20%
   - Alerta: > 30%
   - Crítico: > 50%

2. **Similarity Média por Intent**
   - Meta: > 0.70
   - Alerta: < 0.60
   - Crítico: < 0.50

3. **Padrões Recorrentes**
   - Keywords comuns em fallbacks
   - Queries similares sem resposta
   - Gaps de conteúdo

4. **Violações de Guardrails**
   - Preços calculados/inferidos
   - Informações inventadas
   - Promessas não suportadas

### Exemplo de Gap Identificado

```
🔴 HIGH SEVERITY - high_fallback_rate
Intent: agents
Fallback Rate: 45%
Count: 23 queries
Recommendation: Add more content about "agents" to the KB. 
                 Current fallback rate is 45%.
Examples:
  - "Can I customize the Sales Agent?"
  - "Do agents work with my CRM?"
  - "How do I train an agent?"
```

---

## 3️⃣ PRIORIZAR MUDANÇAS

### Matriz de Priorização

| Severity | Fallback Rate | Similarity | Action Timeline |
|----------|---------------|------------|-----------------|
| 🔴 HIGH | > 40% | < 0.55 | Immediate (1-2 days) |
| 🟡 MEDIUM | 25-40% | 0.55-0.65 | Short-term (1 week) |
| 🔵 LOW | < 25% | > 0.65 | Long-term (1 month) |

### Critérios de Priorização

1. **Impacto no Negócio**
   - Pricing queries = HIGH (conversão direta)
   - Support queries = MEDIUM (satisfação)
   - Roadmap queries = LOW (informativo)

2. **Volume de Queries**
   - > 20 queries/semana = HIGH
   - 10-20 queries/semana = MEDIUM
   - < 10 queries/semana = LOW

3. **Facilidade de Implementação**
   - Adicionar sinônimos = EASY
   - Adicionar seção nova = MEDIUM
   - Reestruturar documento = HARD

---

## 4️⃣ ATUALIZAR KB (Documentos .md)

### Localização dos Documentos

```
btrix-brain/core/
├── BTRIX_CORE.md       # Filosofia, modelo de negócio
├── BTRIX_PACKS.md      # Preços e especificações
├── BTRIX_AGENTS.md     # Agentes disponíveis
├── BTRIX_FAQ.md        # Perguntas frequentes
└── BTRIX_LIMITS.md     # O que NÃO fazemos
```

### Tipos de Mudanças

#### A. Adicionar Sinônimos (EASY)

**Antes:**
```markdown
## Sales Agent

The Sales Agent qualifies leads...
```

**Depois:**
```markdown
## Sales Agent (AI Sales Representative, Lead Qualifier)

The Sales Agent (also known as AI Sales Representative or Lead Qualifier) 
qualifies leads...

**Common questions:**
- "Can I customize the Sales Agent?" → Yes, ...
- "Does it work with my CRM?" → Yes, ...
```

#### B. Adicionar Nova Seção (MEDIUM)

```markdown
## Agent Customization

BTRIX Agents can be customized to fit your business needs:

### What Can Be Customized
- Tone and personality
- Industry-specific terminology
- Integration with your existing tools
- Custom workflows and triggers

### What Cannot Be Customized
- Core AI model (we use best-in-class models)
- Security and compliance settings (fixed for all)
- Pricing structure

**Setup time:** 1-2 business days  
**Cost:** Included in agent subscription
```

#### C. Reestruturar Documento (HARD)

- Reorganizar seções para melhor fluxo
- Dividir documentos muito longos
- Consolidar informações duplicadas
- Melhorar hierarquia de headings

### Regras de Ouro

1. ✅ **Single Source of Truth** - Uma informação, um lugar
2. ✅ **Preços exatos** - Sempre valores oficiais (€1,400, €300, etc.)
3. ✅ **Linguagem clara** - Evitar jargão técnico
4. ✅ **Exemplos práticos** - Casos de uso reais
5. ✅ **Manter versão** - Atualizar `Version: 1.0.X` no topo

---

## 5️⃣ TESTAR MUDANÇAS (Smoke Tests)

### Antes de Ingerir

1. **Revisar Markdown**
   ```bash
   # Verificar sintaxe
   markdownlint core/*.md
   
   # Verificar preços
   grep -r "€" core/
   ```

2. **Chunking Local**
   ```bash
   cd scripts
   node chunker.js ../core 1.0.3
   # Verificar output: chunks.json
   ```

3. **Validar Tags**
   ```bash
   # Verificar se tags estão sendo extraídas
   cat chunks.json | jq '.[].tags'
   ```

### Smoke Tests Locais

```bash
# Ingerir em ambiente de teste
BRAIN_VERSION=1.0.3-test node ingest.js ingest ../core 1.0.3-test

# Testar queries problemáticas
node test_rag_v2.js
```

---

## 6️⃣ VERSIONAR E INGERIR (v1.0.X)

### Versionamento Semântico

- **v1.0.X** - Patch: Correções, sinônimos, pequenas adições
- **v1.X.0** - Minor: Novas seções, reestruturações
- **vX.0.0** - Major: Mudanças estruturais, novos documentos

### Atualizar CHANGELOG

```markdown
## [1.0.3] - 2026-01-10

### Added
- Agent customization section in BTRIX_AGENTS.md
- FAQ about CRM integration
- Synonyms for "agents" (AI workers, modules, specialists)

### Changed
- Improved pricing clarity in BTRIX_PACKS.md
- Reorganized support section in BTRIX_FAQ.md

### Fixed
- Typo in BTRIX_LIMITS.md
- Duplicate information about 24/7 support
```

### Ingestão

```bash
cd btrix-brain/scripts

# 1. Deletar versão antiga (se necessário)
node ingest.js delete 1.0.2

# 2. Ingerir nova versão
node ingest.js ingest ../core 1.0.3

# 3. Verificar stats
node ingest.js stats
```

**Esperado:**
```
Brain ID: btrix-brain:1.0.3
Total Chunks: 180-200
Total Tokens: 8,000-10,000
```

---

## 7️⃣ DEPLOY CONTROLADO

### Staging (Opcional mas Recomendado)

```bash
# Backend staging
BRAIN_VERSION=1.0.3 npm start

# Smoke tests
node smoke_tests.js

# Testar queries problemáticas manualmente
```

### Production

```bash
# 1. Atualizar .env
BRAIN_VERSION=1.0.3

# 2. Restart backend
pm2 restart btrix-backend

# 3. Verificar logs
pm2 logs btrix-backend | grep "Brain ID"
# Esperado: Brain ID: btrix-brain:1.0.3

# 4. Smoke tests em produção
node smoke_tests.js
```

---

## 8️⃣ MONITORAR IMPACTO

### Primeiras 24h

- [ ] Verificar logs a cada 2h
- [ ] Monitorar taxa de fallback
- [ ] Verificar similarity média
- [ ] Coletar feedback de usuários

### Primeira Semana

- [ ] Comparar métricas com semana anterior
- [ ] Gerar learning report
- [ ] Identificar novos gaps
- [ ] Ajustar se necessário

### Métricas-Chave

| Métrica | Antes (v1.0.2) | Depois (v1.0.3) | Meta |
|---------|----------------|-----------------|------|
| Fallback Rate | 25% | ? | < 20% |
| Avg Similarity | 0.68 | ? | > 0.70 |
| Agents Similarity | 0.57 | ? | > 0.65 |
| Violations | 2/semana | ? | 0 |

---

## 9️⃣ VALIDAR MELHORIA

### Relatório Comparativo

```bash
# Gerar relatório pós-deploy
node generate_learning_report.js weekly

# Comparar com relatório pré-deploy
diff logs/learning_report_weekly_<antes>.json \
     logs/learning_report_weekly_<depois>.json
```

### Critérios de Sucesso

✅ **Sucesso Total** (manter v1.0.3):
- Fallback rate reduzido em ≥ 10%
- Similarity aumentada em ≥ 0.05
- Zero novas violações
- Feedback positivo de usuários

⚠️ **Sucesso Parcial** (manter mas iterar):
- Fallback rate reduzido em 5-10%
- Similarity aumentada em 0.02-0.05
- 1-2 novas violações
- Feedback misto

❌ **Falha** (considerar rollback):
- Fallback rate aumentado
- Similarity reduzida
- Múltiplas novas violações
- Feedback negativo

---

## 🔄 ROLLBACK SE NECESSÁRIO

### Quando Fazer Rollback

- Taxa de fallback > 40% (nas primeiras 24h)
- Similarity média < 0.60
- Violações de guardrails > 10/dia
- Bugs críticos identificados

### Processo de Rollback

```bash
# 1. Rollback via script
cd btrix-brain/scripts
./rollback.sh 1.0.2

# 2. Restart backend
pm2 restart btrix-backend

# 3. Verificar logs
pm2 logs btrix-backend | grep "Brain ID"
# Esperado: Brain ID: btrix-brain:1.0.2

# 4. Smoke tests
cd backend
node smoke_tests.js

# 5. Confirmar estabilidade
# Monitorar por 1h
```

### Pós-Rollback

1. **Analisar o que deu errado**
   - Revisar mudanças feitas
   - Identificar causa raiz
   - Documentar lições aprendidas

2. **Corrigir e re-testar**
   - Fazer ajustes necessários
   - Testar localmente
   - Validar em staging

3. **Tentar novamente**
   - Versão 1.0.4 com correções
   - Deploy controlado
   - Monitoramento reforçado

---

## 📋 CHECKLIST DE EVOLUÇÃO

### Pré-Mudança
- [ ] Learning report gerado e analisado
- [ ] Gaps priorizados (High/Medium/Low)
- [ ] Mudanças documentadas no CHANGELOG
- [ ] Versão incrementada (1.0.X)

### Mudança
- [ ] Documentos .md atualizados
- [ ] Preços validados (se aplicável)
- [ ] Sinônimos adicionados
- [ ] Exemplos práticos incluídos

### Teste
- [ ] Markdown validado (sintaxe)
- [ ] Chunking local OK
- [ ] Tags extraídas corretamente
- [ ] Smoke tests locais passando

### Deploy
- [ ] Nova versão ingerida no Supabase
- [ ] BRAIN_VERSION atualizado no .env
- [ ] Backend restartado
- [ ] Smoke tests em produção passando

### Validação
- [ ] Logs monitorados (24h)
- [ ] Métricas comparadas (7 dias)
- [ ] Relatório comparativo gerado
- [ ] Sucesso validado ou rollback realizado

---

## 🎯 METAS DE LONGO PRAZO

### Q1 2026
- [ ] Fallback rate < 15%
- [ ] Similarity média > 0.75
- [ ] Zero violações de guardrails
- [ ] Latência média < 2s

### Q2 2026
- [ ] Fallback rate < 10%
- [ ] Similarity média > 0.80
- [ ] Suporte multi-idioma (PT/ES)
- [ ] Cache implementado (P2.4)

### Q3 2026
- [ ] Fallback rate < 5%
- [ ] Similarity média > 0.85
- [ ] KB expandido (10+ documentos)
- [ ] Auto-learning implementado

---

## 📞 RESPONSABILIDADES

| Papel | Responsabilidade |
|-------|------------------|
| **Product Owner** | Priorizar gaps, aprovar mudanças |
| **Content Writer** | Atualizar documentos .md |
| **DevOps** | Deploy, monitoramento, rollback |
| **Data Analyst** | Gerar reports, analisar métricas |
| **QA** | Validar mudanças, smoke tests |

---

**Última atualização:** 2026-01-02  
**Versão do processo:** 1.0
