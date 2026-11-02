import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, ChevronLeft, ChevronRight, Clock, LockKeyhole, X } from 'lucide-react';
import { intakeSchema, type Intake } from '../shared/validation';
import { api, dateLabel, money, type Plan, type Slot } from './api';

const dayKey = (date: Date) => date.toLocaleDateString('en-CA', { timeZone: 'America/Fortaleza' });
const getStatus = (error: unknown) =>
  typeof error === 'object' && error !== null && 'status' in error
    ? (error as { status?: number }).status
    : undefined;

type CreatedBooking = { id: string; confirmationToken: string };

export default function Booking({ plan, onClose }: { plan: Plan; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [suggestedSlot, setSuggestedSlot] = useState<Slot | null>(null);
  const [day, setDay] = useState('');
  const [month, setMonth] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [consent, setConsent] = useState(false);
  const [result, setResult] = useState<CreatedBooking | null>(null);
  const [customerConfirmed, setCustomerConfirmed] = useState(false);
  const dialog = useRef<HTMLDivElement>(null);
  const { register, trigger, getValues, formState: { errors } } = useForm<Intake>({
    resolver: zodResolver(intakeSchema),
    defaultValues: { name: '', email: '', whatsapp: '', lifestyle: '', goals: '', challenges: '' },
  });

  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    document.body.style.overflow = 'hidden';
    dialog.current?.focus();
    return () => {
      document.body.style.overflow = '';
      previous?.focus();
    };
  }, []);

  useEffect(() => {
    setLoading(true);
    api<Slot[]>('/slots/available')
      .then(setSlots)
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os horários.'))
      .finally(() => setLoading(false));
  }, []);

  const next = async () => {
    const valid = step === 0
      ? await trigger(['name', 'email', 'whatsapp'])
      : step === 1
        ? await trigger(['lifestyle', 'goals', 'challenges'])
        : !!slot;
    if (valid) {
      setStep(step + 1);
      setError('');
    } else if (step === 2) {
      setError('Escolha uma data e um horário.');
    }
  };

  const submit = async () => {
    if (!slot || !consent || loading) return;
    setLoading(true);
    setError('');
    try {
      const booking = await api<CreatedBooking>('/bookings', {
        method: 'POST',
        body: JSON.stringify({ ...getValues(), planId: plan.id, slotId: slot.id, consent }),
      });
      setResult(booking);
    } catch (cause) {
      if (getStatus(cause) === 409) {
        try {
          const currentSlots = await api<Slot[]>('/slots/available');
          const alternative = [...currentSlots].sort(
            (a, b) => Math.abs(Date.parse(a.startsAt) - Date.parse(slot.startsAt))
              - Math.abs(Date.parse(b.startsAt) - Date.parse(slot.startsAt)),
          )[0] ?? null;
          setSlots(currentSlots);
          setSuggestedSlot(alternative);
          setSlot(null);
          setStep(2);
          setError(alternative
            ? 'Esse horário acabou de ser reservado. Confira a sugestão ou escolha outro horário.'
            : 'Esse horário acabou de ser reservado e não há outros horários disponíveis no momento.');
        } catch (refreshError) {
          setStep(2);
          setError(refreshError instanceof Error
            ? `O horário acabou de ser reservado, mas não foi possível atualizar a disponibilidade: ${refreshError.message}`
            : 'O horário acabou de ser reservado, mas não foi possível atualizar a disponibilidade.');
        }
      } else {
        setError(cause instanceof Error ? cause.message : 'Não foi possível enviar a solicitação. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const confirm = async () => {
    if (!result || loading) return;
    setLoading(true);
    setError('');
    try {
      await api(`/bookings/${result.id}/confirm`, {
        method: 'POST',
        body: JSON.stringify({ token: result.confirmationToken }),
      });
      setCustomerConfirmed(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível confirmar os dados. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const acceptSuggestion = () => {
    if (!suggestedSlot) return;
    setSlot(suggestedSlot);
    setDay(dayKey(new Date(suggestedSlot.startsAt)));
    setMonth(new Date(suggestedSlot.startsAt));
    setSuggestedSlot(null);
    setStep(3);
    setError('');
  };

  const field = (name: keyof Intake, label: string, placeholder: string, multiline = false) => (
    <label className="field" key={name}>
      {label}
      {multiline
        ? <textarea rows={3} placeholder={placeholder} {...register(name)} aria-invalid={!!errors[name]} />
        : <input
            type={name === 'email' ? 'email' : name === 'whatsapp' ? 'tel' : 'text'}
            autoComplete={name === 'name' ? 'name' : name === 'email' ? 'email' : 'tel'}
            placeholder={placeholder}
            {...register(name)}
            aria-invalid={!!errors[name]}
          />}
      <span className="field-error">{errors[name]?.message}</span>
    </label>
  );
  const days = Array.from({ length: new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate() }, (_, i) => i + 1);

  return (
    <div className="modal-backdrop">
      <div
        ref={dialog}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-title"
        className="booking-modal"
        onKeyDown={event => {
          if (event.key === 'Escape') onClose();
          if (event.key === 'Tab') {
            const items = dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input,textarea,a[href]');
            if (!items?.length) return;
            const first = items[0];
            const last = items[items.length - 1];
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first.focus();
            }
          }
        }}
      >
        <button className="close-button" onClick={onClose} aria-label="Fechar agendamento"><X /></button>
        {result ? (
          <div className="success">
            <CheckCircle2 size={55} />
            <div className="eyebrow">{customerConfirmed ? 'DADOS CONFERIDOS' : 'PEDIDO RECEBIDO'}</div>
            <h2 id="booking-title">
              {customerConfirmed ? <>Obrigada, <em>{getValues('name').split(' ')[0]}.</em></> : <>Confira seu <em>pedido.</em></>}
            </h2>
            <p>
              {customerConfirmed
                ? 'Seus dados foram confirmados. A solicitação segue pendente até a análise da consultora, que confirmará os detalhes pelo contato informado.'
                : 'Confira as informações e as orientações antes de confirmar seus dados. A consultora analisará o pedido e confirmará os detalhes pelo contato informado.'}
            </p>
            <div className="summary">
              <strong>{plan.name} · {money(plan.price)}</strong>
              <span>{slot && dateLabel(slot.startsAt)} · Fortaleza</span>
              <span>{getValues('name')}</span>
              <span>{getValues('email')} · {getValues('whatsapp')}</span>
              <small>Protocolo: {result.id}</small>
              <span>Status: aguardando confirmação da consultora</span>
            </div>
            {!customerConfirmed && (
              <>
                <div className="review-answers">
                  <p><strong>Sua rotina</strong>{getValues('lifestyle')}</p>
                  <p><strong>Seus objetivos</strong>{getValues('goals')}</p>
                  <p><strong>Seus desafios</strong>{getValues('challenges')}</p>
                </div>
                <p className="privacy-note">
                  Orientações: reserve um local em que se sinta confortável e tenha em mãos suas dúvidas ou combinações que gostaria de conversar.
                </p>
                {error && <p className="error" role="alert">{error}</p>}
                <div className="form-actions">
                  <button className="button" disabled={loading} onClick={() => void confirm()}>
                    {loading ? 'Confirmando…' : 'Confirmar dados e orientações'} <Check size={18} />
                  </button>
                </div>
              </>
            )}
            {customerConfirmed && (
              <>
                <p>Não houve cobrança nesta etapa.</p>
                <button className="button" onClick={onClose}>Voltar à Camaleoa <Check size={18} /></button>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="eyebrow">SUA JORNADA · {plan.name.toUpperCase()}</div>
            <h2 id="booking-title">{['Vamos conhecer você?', 'Sua história importa.', 'Um momento só seu.', 'Tudo pronto para começar?'][step]}</h2>
            <div className="stepper">
              {['Sobre você', 'Seu estilo', 'Seu encontro', 'Revisão'].map((label, index) => (
                <div className={index <= step ? 'active' : ''} key={label}>
                  <span>{index < step ? <Check size={13} /> : index + 1}</span>
                  <small>{label}</small>
                </div>
              ))}
            </div>
            <form onSubmit={event => {
              event.preventDefault();
              step === 3 ? void submit() : void next();
            }}>
              <div className="step-content">
                {step === 0 && (
                  <>
                    <p className="form-intro">Toda transformação começa com uma conversa. Como podemos chamar você?</p>
                    {field('name', 'Nome completo', 'Seu nome e sobrenome')}
                    {field('email', 'E-mail', 'voce@exemplo.com')}
                    {field('whatsapp', 'WhatsApp com DDD', '(85) 99999-9999')}
                    <p className="privacy-note"><LockKeyhole size={14} /> Seus dados são usados apenas para seu atendimento.</p>
                  </>
                )}
                {step === 1 && (
                  <>
                    {field('lifestyle', 'Como é a sua rotina?', 'Trabalho, lazer, atividades… conte um pouco sobre você.', true)}
                    {field('goals', 'O que você deseja expressar com sua imagem?', 'Como você gostaria de se sentir ao se vestir?', true)}
                    {field('challenges', 'Qual é seu maior desafio com o guarda-roupa?', 'O que mais dificulta suas escolhas hoje?', true)}
                  </>
                )}
                {step === 2 && (
                  <>
                    <p className="form-intro">Escolha um horário para nosso primeiro encontro.<br />Todos os horários seguem o fuso de Fortaleza (UTC−3).</p>
                    <div className="calendar-head">
                      <button type="button" aria-label="Mês anterior" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft size={19} /></button>
                      <strong>{month.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</strong>
                      <button type="button" aria-label="Próximo mês" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight size={19} /></button>
                    </div>
                    <div className="calendar">
                      {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((label, index) => <small key={index}>{label}</small>)}
                      {Array.from({ length: month.getDay() }, (_, index) => <span key={`blank-${index}`} />)}
                      {days.map(date => {
                        const key = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
                        const available = slots.some(item => dayKey(new Date(item.startsAt)) === key);
                        return (
                          <button
                            type="button"
                            key={date}
                            disabled={!available}
                            className={day === key ? 'selected' : ''}
                            onClick={() => { setDay(key); setSlot(null); setSuggestedSlot(null); }}
                          >
                            {date}
                          </button>
                        );
                      })}
                    </div>
                    {loading ? <p>Buscando horários…</p> : !slots.length
                      ? <p>Nenhum horário disponível no momento. Tente novamente mais tarde.</p>
                      : (
                        <div className="time-slots">
                          {day
                            ? slots.filter(item => dayKey(new Date(item.startsAt)) === day).map(item => (
                              <button
                                type="button"
                                className={slot?.id === item.id ? 'selected' : ''}
                                key={item.id}
                                onClick={() => { setSlot(item); setSuggestedSlot(null); setError(''); }}
                              >
                                <Clock size={14} />
                                {new Date(item.startsAt).toLocaleTimeString('pt-BR', { timeZone: 'America/Fortaleza', hour: '2-digit', minute: '2-digit' })}
                              </button>
                            ))
                            : <p>Selecione um dia disponível no calendário.</p>}
                        </div>
                      )}
                    {suggestedSlot && (
                      <div className="suggested-slot">
                        <p>Horário alternativo disponível: <strong>{dateLabel(suggestedSlot.startsAt)} (Fortaleza)</strong></p>
                        <div className="form-actions">
                          <button type="button" className="button" onClick={acceptSuggestion}>Aceitar sugestão <Check size={16} /></button>
                          <button type="button" className="back" onClick={() => { setSuggestedSlot(null); setSlot(null); setStep(0); setError(''); }}>
                            Corrigir formulário
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
                {step === 3 && (
                  <>
                    <div className="summary">
                      <strong>{plan.name} · {money(plan.price)}</strong>
                      <span>{slot && dateLabel(slot.startsAt)} · Fortaleza</span>
                      <span>{getValues('name')}</span>
                      <span>{getValues('email')} · {getValues('whatsapp')}</span>
                    </div>
                    <div className="review-answers">
                      {([
                        ['lifestyle', 'Sua rotina'],
                        ['goals', 'Seus objetivos'],
                        ['challenges', 'Seus desafios'],
                      ] as const).map(([key, label]) => (
                        <p key={key}><strong>{label}</strong>{getValues(key)}</p>
                      ))}
                    </div>
                    <label className="consent">
                      <input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} />
                      Autorizo o uso dos dados informados para meu atendimento e o contato por WhatsApp ou e-mail.
                    </label>
                    <p className="privacy-note">O pedido ficará pendente até a confirmação da consultora. Nenhum pagamento será realizado agora.</p>
                  </>
                )}
              </div>
              {error && <p className="error" role="alert">{error}</p>}
              <div className="form-actions">
                {step > 0
                  ? <button type="button" className="back" onClick={() => setStep(step - 1)}><ArrowLeft size={16} /> Voltar</button>
                  : <span />}
                <button className="button" disabled={loading || (step === 3 && !consent)} type="submit">
                  {loading ? 'Aguarde…' : step === 3 ? 'Solicitar agendamento' : 'Continuar'} <ArrowRight size={16} />
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
