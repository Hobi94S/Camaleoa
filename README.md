# Camaleoa

Aplicação de consultoria de imagem em português, com React 19, Vite, TypeScript, Tailwind CSS 4, Lucide, React Hook Form/Zod, Express e Prisma/SQLite.

## Executar localmente

Requer Node.js 22+.

```bash
npm install
cp .env.example .env
touch prisma/dev.db
npm run db:setup
npm run dev
```

Site: http://localhost:5173 · API: http://localhost:3001 · Painel: http://localhost:5173/admin.

Credenciais **somente para desenvolvimento** do `.env.example`: `admin@camaleoa.com.br` / `change-this-before-production`. Substitua `ADMIN_PASSWORD` e `JWT_SECRET` antes de publicar. O administrador é configurado por ambiente. Sessões usam JWT de 8 horas em cookie HttpOnly/SameSite Strict, Secure em produção. Login e reservas possuem limite de requisições.

Também é possível executar `npm run dev:client` e `npm run dev:server` separadamente. `CLIENT_ORIGIN` deve coincidir com a origem do navegador; CORS e validação de Origin restringem escritas.

```bash
npm run build
npm test
# Servir o bundle e a API pelo Express:
NODE_ENV=production npm start
```

Em produção use HTTPS e configure `CLIENT_ORIGIN` para a URL final. Mantenha o banco SQLite em volume persistente e faça backups. Para PostgreSQL, altere o provider e DATABASE_URL e crie migrações adequadas; este MVP vem configurado e testado com SQLite.

## Estrutura

- `src/App.tsx`: apresentação da marca, metodologia e planos dinâmicos.
- `src/Booking.tsx`: quatro etapas (contato, anamnese, calendário, revisão) e confirmação.
- `src/Admin.tsx`: login, pesquisa, filtro, anamnese, status e disponibilidade.
- `src/styles.css`: identidade visual editorial e layouts responsivos; Tailwind também está habilitado.
- `shared/validation.ts`: contratos Zod compartilhados.
- `server/index.ts`: API, autenticação e transações.
- `server/booking.test.ts`: teste integrado do ciclo de reserva.
- `prisma/schema.prisma`: Plan, Client, AnamnesisResponse, Slot e Appointment.
- `prisma/seed.ts`: três planos de demonstração e horários úteis para os próximos 28 dias.

O seed é idempotente para planos e horários existentes e não desfaz bloqueios/reservas. Preços são armazenados em centavos. Horários são armazenados em UTC e exibidos/administrados no fuso America/Fortaleza (UTC−3).

## API

| Método | Endpoint | Função |
|---|---|---|
| GET | `/api/plans` | Planos e benefícios |
| GET | `/api/slots/available` | Horários futuros, livres e não bloqueados |
| POST | `/api/bookings` | Cadastro, anamnese e reserva atômica |
| POST | `/api/admin/login` | Autenticação |
| POST | `/api/admin/logout` | Encerrar sessão |
| GET | `/api/admin/bookings` | Agendamentos e perfis completos |
| PATCH | `/api/admin/bookings/:id` | Atualizar status |
| GET | `/api/admin/slots` | Todos os horários futuros |
| POST | `/api/admin/slots` | Adicionar horário UTC ISO 8601 |
| PATCH | `/api/admin/slots/:id` | Bloquear/liberar horário livre |

As rotas administrativas de dados exigem sessão. Erros retornam `{ "error": "mensagem" }` e status 400, 401, 403, 404, 409 ou 500. Reservas recebem 201 e `{id, status}`. Status: PENDING, CONFIRMED, COMPLETED, CANCELLED. Cancelar libera o horário; reservas canceladas não podem ser reabertas. Horários reservados não podem ser bloqueados.

Exemplo de corpo de reserva:

```json
{"planId":"essencia","slotId":"ID_DO_HORARIO","name":"Maria Silva","email":"maria@example.com","whatsapp":"85999999999","lifestyle":"Trabalho presencial e passeios aos fins de semana.","goals":"Expressar confiança e autenticidade.","challenges":"Combinar as roupas que já tenho.","consent":true}
```

## Escopo e conteúdo

O pedido é registrado como pendente e confirmado manualmente pela consultora. Não há integração de pagamento, WhatsApp, e-mail ou videoconferência: o sistema informa isso à cliente e não simula notificações enviadas. O consentimento é obrigatório para enviar dados. Fotos externas do Unsplash são ilustrativas, não retratos reais de Suênia/clientes. Valores e textos dos planos são sugestões iniciais no seed; revise antes do lançamento. Depoimentos e números de clientes não foram inventados: adicione prova social real com autorização da marca.

O calendário considera cada registro um início de encontro exclusivo; os horários de demonstração têm 3 horas de intervalo. As durações dos pacotes descrevem a jornada comercial, e encontros posteriores são combinados pela consultora. Não há sincronização com calendários externos nem detecção de sobreposição por duração entre horários diferentes.
