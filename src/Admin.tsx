import { useEffect, useState } from 'react';
import { ArrowLeft, CalendarDays, LogOut, Search, Users, X } from 'lucide-react';
import { api, dateLabel, type Slot } from './api';

type Booking = {
  id: string;
  status: string;
  customerConfirmedAt: string | null;
  client: { name: string; email: string; whatsapp: string };
  plan: { name: string };
  slot: Slot;
  anamnesis: { lifestyle: string; goals: string; challenges: string } | null;
};

const statuses: Record<string, string> = {
  PENDING: 'Pendente',
  CONFIRMED: 'Confirmado',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
};

const getStatus = (error: unknown) =>
  typeof error === 'object' && error !== null && 'status' in error
    ? (error as { status?: number }).status
    : undefined;

export default function Admin() {
  const [auth, setAuth] = useState(false);
  const [checking, setChecking] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [tab, setTab] = useState('bookings');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState<Booking | null>(null);

  const refresh = async () => {
    const [nextBookings, nextSlots] = await Promise.all([
      api<Booking[]>('/admin/bookings'),
      api<Slot[]>('/admin/slots'),
    ]);
    setBookings(nextBookings);
    setSlots(nextSlots);
    setAuth(true);
  };

  useEffect(() => {
    refresh()
      .catch(cause => {
        if (getStatus(cause) !== 401) {
          setError(cause instanceof Error ? cause.message : 'Não foi possível carregar o painel.');
        }
      })
      .finally(() => setChecking(false));
  }, []);

  const action = async (run: () => Promise<unknown>) => {
    setBusy(true);
    setError('');
    try {
      await run();
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível concluir a ação.');
      if (getStatus(cause) === 401) setAuth(false);
    } finally {
      setBusy(false);
    }
  };

  if (checking) return <div className="admin-login">Carregando seu espaço…</div>;

  if (!auth) {
    return (
      <main className="admin-login">
        <a href="/" className="wordmark">camaleoa<span>SEU ESPAÇO DE CUIDADO</span></a>
        <form
          className="login-card"
          onSubmit={event => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            void action(() => api('/admin/login', {
              method: 'POST',
              body: JSON.stringify(Object.fromEntries(data)),
            }));
          }}
        >
          <div className="eyebrow">ÁREA DA CONSULTORA</div>
          <h2>Bem-vinda <em>de volta.</em></h2>
          <label className="field">E-mail<input name="email" type="email" autoComplete="username" required /></label>
          <label className="field">Senha<input name="password" type="password" autoComplete="current-password" required /></label>
          {error && <p className="error" role="alert">{error}</p>}
          <button className="button" disabled={busy}>{busy ? 'Entrando…' : 'Entrar no meu espaço'}</button>
          <a className="text-link" href="/"><ArrowLeft size={15} /> Voltar ao site</a>
        </form>
      </main>
    );
  }

  const visible = bookings.filter(booking =>
    (!filter || booking.status === filter)
    && `${booking.client.name} ${booking.client.email} ${booking.client.whatsapp}`.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="admin">
      <header className="header">
        <a href="/" className="wordmark">camaleoa<span>ÁREA DA CONSULTORA</span></a>
        <button
          className="back"
          onClick={async () => {
            try {
              await api('/admin/logout', { method: 'POST' });
              setAuth(false);
            } catch (cause) {
              setError(cause instanceof Error ? cause.message : 'Não foi possível encerrar a sessão.');
            }
          }}
        >
          <LogOut size={16} /> Sair
        </button>
      </header>
      <main className="admin-main">
        <div className="eyebrow">CUIDAR DE CADA HISTÓRIA</div>
        <h1>Olá, <em>Suênia.</em></h1>
        <p>Acompanhe suas clientes e prepare os próximos encontros.</p>
        <div className="stats">
          <div><Users /><strong>{bookings.length}</strong><span>Agendamentos</span></div>
          <div><CalendarDays /><strong>{bookings.filter(booking => booking.status === 'PENDING').length}</strong><span>Aguardando confirmação</span></div>
          <div><CalendarDays /><strong>{slots.filter(item => !item.blocked && !item.reserved).length}</strong><span>Horários disponíveis</span></div>
        </div>
        <div className="tabs">
          <button className={tab === 'bookings' ? 'active' : ''} onClick={() => setTab('bookings')}>Agendamentos</button>
          <button className={tab === 'slots' ? 'active' : ''} onClick={() => setTab('slots')}>Disponibilidade</button>
        </div>
        {error && <p className="error" role="alert">{error}</p>}
        {tab === 'bookings' ? (
          <>
            <div className="admin-filters">
              <label className="search"><Search size={18} /><input aria-label="Buscar clientes" placeholder="Buscar nome, e-mail ou WhatsApp…" value={search} onChange={event => setSearch(event.target.value)} /></label>
              <select aria-label="Filtrar status" value={filter} onChange={event => setFilter(event.target.value)}>
                <option value="">Todos os status</option>
                {Object.entries(statuses).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Cliente</th><th>Experiência</th><th>Encontro · Fortaleza</th><th>Status</th><th>Perfil</th></tr></thead>
                <tbody>
                  {visible.map(booking => (
                    <tr key={booking.id}>
                      <td><strong>{booking.client.name}</strong><small>{booking.client.email}</small></td>
                      <td>{booking.plan.name}</td>
                      <td>{dateLabel(booking.slot.startsAt)}</td>
                      <td>
                        <select
                          aria-label={`Status de ${booking.client.name}`}
                          disabled={busy || booking.status === 'CANCELLED'}
                          value={booking.status}
                          onChange={event => void action(() => api(`/admin/bookings/${booking.id}`, {
                            method: 'PATCH',
                            body: JSON.stringify({ status: event.target.value }),
                          }))}
                        >
                          {Object.entries(statuses).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                        </select>
                        {booking.customerConfirmedAt && <small>Cliente conferiu os dados</small>}
                      </td>
                      <td><button className="text-link" onClick={() => setDetail(booking)}>Ver anamnese</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!visible.length && <div className="empty">Nenhum agendamento encontrado.</div>}
            </div>
          </>
        ) : (
          <>
            <form
              className="slot-form"
              onSubmit={event => {
                event.preventDefault();
                const form = event.currentTarget;
                const data = new FormData(form);
                void action(async () => {
                  await api('/admin/slots', {
                    method: 'POST',
                    body: JSON.stringify({ startsAt: new Date(`${data.get('date')}:00-03:00`).toISOString() }),
                  });
                  form.reset();
                });
              }}
            >
              <label className="field">Adicionar horário · Fortaleza (UTC−3)<input required type="datetime-local" name="date" /></label>
              <button className="button" disabled={busy}>Adicionar horário</button>
            </form>
            <div className="slots-admin">
              {slots.map(item => (
                <div key={item.id}>
                  <strong>{dateLabel(item.startsAt)}</strong>
                  <span>{item.reserved ? 'Reservado' : item.blocked ? 'Bloqueado' : 'Disponível'}</span>
                  <button
                    className="back"
                    disabled={item.reserved || busy}
                    onClick={() => void action(() => api(`/admin/slots/${item.id}`, {
                      method: 'PATCH',
                      body: JSON.stringify({ blocked: !item.blocked }),
                    }))}
                  >
                    {item.blocked ? 'Liberar' : 'Bloquear'}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
        {detail && (
          <div className="modal-backdrop">
            <section className="booking-modal" role="dialog" aria-modal="true" aria-label="Perfil da cliente">
              <button className="close-button" onClick={() => setDetail(null)} aria-label="Fechar"><X /></button>
              <div className="eyebrow">HISTÓRIA DA CLIENTE</div>
              <h2>{detail.client.name}</h2>
              <p>{detail.client.email}<br />{detail.client.whatsapp}</p>
              <p>{detail.customerConfirmedAt
                ? `Dados conferidos pela cliente em ${dateLabel(detail.customerConfirmedAt)}.`
                : 'A cliente ainda não confirmou a conferência dos dados.'}</p>
              <div className="review-answers">
                {([
                  ['Rotina', detail.anamnesis?.lifestyle],
                  ['Objetivos', detail.anamnesis?.goals],
                  ['Desafios', detail.anamnesis?.challenges],
                ] as const).map(([label, answer]) => <p key={label}><strong>{label}</strong>{answer ?? 'Não informado'}</p>)}
              </div>
              <button className="button" onClick={() => setDetail(null)}>Fechar perfil</button>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
