import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
const plans = [
{id:'essencia',name:'Essência',subtitle:'O primeiro encontro com você mesma.',price:39000,duration:'1 encontro · 1h30',features:JSON.stringify(['Análise de estilo pessoal','Direcionamento de imagem','Guia de estilo personalizado'])},
{id:'metamorfose',name:'Metamorfose',subtitle:'Um novo olhar. Infinitas possibilidades.',price:89000,duration:'3 encontros · jornada completa',features:JSON.stringify(['Tudo do plano Essência','Análise de coloração pessoal','Curadoria do guarda-roupa','Montagem de looks e combinações','Acompanhamento por 30 dias'])},
{id:'plenitude',name:'Plenitude',subtitle:'Sua imagem, em sua melhor versão.',price:149000,duration:'5 encontros · experiência exclusiva',features:JSON.stringify(['Tudo do plano Metamorfose','Personal shopping acompanhado','Imagem profissional e presença','Dossiê completo de imagem','Acompanhamento por 60 dias'])}
];
for(const p of plans) await db.plan.upsert({where:{id:p.id},create:p,update:p});
for(let i=1;i<=28;i++){const d=new Date();d.setUTCDate(d.getUTCDate()+i); if([0,6].includes(d.getUTCDay()))continue;for(const h of [12,15,18]){d.setUTCHours(h,0,0,0);await db.slot.upsert({where:{startsAt:d},create:{startsAt:d},update:{}})}}
await db.$disconnect();
console.log('Planos e horários preparados.');
