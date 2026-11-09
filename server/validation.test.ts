import { test } from 'node:test';
import assert from 'node:assert/strict';
import { intakeSchema } from '../shared/validation';
const valid = { name: 'Maria Silva', email: 'maria@example.com', whatsapp: '85999999999', lifestyle: 'Trabalho presencial.', goals: 'Mais confiança.', challenges: 'Combinar roupas.' };
test('contato rejeita pontuação sem dígitos e dados incompletos', () => {
  for (const whatsapp of ['----------', '() () () ()', '85000000000', '123', 'abc85999999999']) {
    assert.equal(intakeSchema.safeParse({ ...valid, whatsapp }).success, false, whatsapp);
  }
  for (const whatsapp of ['85999999999', '(85) 3333-4444', '+55 (85) 99999-9999']) {
    assert.equal(intakeSchema.safeParse({ ...valid, whatsapp }).success, true, whatsapp);
  }
  for (const field of ['name', 'email', 'lifestyle', 'goals', 'challenges']) {
    assert.equal(intakeSchema.safeParse({ ...valid, [field]: '  ' }).success, false, field);
  }
});
