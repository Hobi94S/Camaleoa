export type Plan={id:string;name:string;subtitle:string;price:number;duration:string;features:string[]};
export type Slot={id:string;startsAt:string;blocked:boolean;reserved:boolean};
export async function api<T>(url: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${url}`, { ...options, credentials: 'include', headers: { 'Content-Type': 'application/json', ...options.headers } });
  } catch {
    throw new Error('Não foi possível conectar. Verifique sua internet e tente novamente.');
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) throw Object.assign(new Error(data?.error || (response.status === 429
    ? 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.'
    : 'O serviço está indisponível. Tente novamente em instantes.')), { status: response.status });
  if (data === null) throw new Error('O serviço retornou uma resposta inválida. Tente novamente.');
  return data;
}
export const money=(value:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0}).format(value/100);
export const dateLabel=(value:string)=>new Date(value).toLocaleString('pt-BR',{timeZone:'America/Fortaleza',day:'2-digit',month:'long',hour:'2-digit',minute:'2-digit'});
