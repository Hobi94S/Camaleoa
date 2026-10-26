import { z } from 'zod';
export const intakeSchema=z.object({name:z.string().trim().min(3,'Informe seu nome completo.').max(120),email:z.string().trim().email('Informe um e-mail válido.').max(254),whatsapp:z.string().trim().regex(/^\+?[\d\s()-]{10,20}$/,'Informe um WhatsApp válido com DDD.'),lifestyle:z.string().trim().min(5,'Conte um pouco mais sobre sua rotina.').max(2000),goals:z.string().trim().min(5,'Conte o que você deseja transformar.').max(2000),challenges:z.string().trim().min(5,'Conte sua principal dificuldade.').max(2000)});
export const bookingSchema=intakeSchema.extend({planId:z.string().min(1),slotId:z.string().min(1),consent:z.literal(true)});
export type Intake=z.infer<typeof intakeSchema>;
