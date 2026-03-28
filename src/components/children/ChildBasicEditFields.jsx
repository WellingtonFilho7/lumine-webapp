import React from 'react';

const INPUT_CLASS =
  'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-cyan-500';

export default function ChildBasicEditFields({ prefix, data, onChange }) {
  const fieldId = field => `${prefix}-${field}`;

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <div className="md:col-span-2">
        <label htmlFor={fieldId('name')} className="mb-1 block text-xs font-medium text-gray-700">
          Nome completo
        </label>
        <input
          id={fieldId('name')}
          type="text"
          value={data.name}
          onChange={e => onChange('name', e.target.value)}
          className={INPUT_CLASS}
        />
      </div>

      <div>
        <label htmlFor={fieldId('birthDate')} className="mb-1 block text-xs font-medium text-gray-700">
          Data de nascimento
        </label>
        <input
          id={fieldId('birthDate')}
          type="date"
          value={data.birthDate}
          onChange={e => onChange('birthDate', e.target.value)}
          className={INPUT_CLASS}
        />
      </div>

      <div>
        <label htmlFor={fieldId('sexo')} className="mb-1 block text-xs font-medium text-gray-700">
          Sexo da criança
        </label>
        <select
          id={fieldId('sexo')}
          value={data.sexo}
          onChange={e => onChange('sexo', e.target.value)}
          className={INPUT_CLASS}
        >
          <option value="">Selecione</option>
          <option value="M">Masculino</option>
          <option value="F">Feminino</option>
          <option value="nao_declarado">Não declarado</option>
        </select>
      </div>

      <div>
        <label htmlFor={fieldId('guardianName')} className="mb-1 block text-xs font-medium text-gray-700">
          Nome do responsável
        </label>
        <input
          id={fieldId('guardianName')}
          type="text"
          value={data.guardianName}
          onChange={e => onChange('guardianName', e.target.value)}
          className={INPUT_CLASS}
        />
      </div>

      <div>
        <label htmlFor={fieldId('parentesco')} className="mb-1 block text-xs font-medium text-gray-700">
          Parentesco
        </label>
        <input
          id={fieldId('parentesco')}
          type="text"
          value={data.parentesco}
          onChange={e => onChange('parentesco', e.target.value)}
          className={INPUT_CLASS}
        />
      </div>

      <div>
        <label htmlFor={fieldId('guardianPhone')} className="mb-1 block text-xs font-medium text-gray-700">
          Telefone principal
        </label>
        <input
          id={fieldId('guardianPhone')}
          type="tel"
          value={data.guardianPhone}
          onChange={e => onChange('guardianPhone', e.target.value)}
          className={INPUT_CLASS}
        />
      </div>

      <div>
        <label
          htmlFor={fieldId('contatoEmergenciaNome')}
          className="mb-1 block text-xs font-medium text-gray-700"
        >
          Contato de emergência
        </label>
        <input
          id={fieldId('contatoEmergenciaNome')}
          type="text"
          value={data.contatoEmergenciaNome}
          onChange={e => onChange('contatoEmergenciaNome', e.target.value)}
          className={INPUT_CLASS}
        />
      </div>

      <div>
        <label
          htmlFor={fieldId('contatoEmergenciaTelefone')}
          className="mb-1 block text-xs font-medium text-gray-700"
        >
          Telefone de emergência
        </label>
        <input
          id={fieldId('contatoEmergenciaTelefone')}
          type="tel"
          value={data.contatoEmergenciaTelefone}
          onChange={e => onChange('contatoEmergenciaTelefone', e.target.value)}
          className={INPUT_CLASS}
        />
      </div>

      <div>
        <label htmlFor={fieldId('neighborhood')} className="mb-1 block text-xs font-medium text-gray-700">
          Bairro
        </label>
        <input
          id={fieldId('neighborhood')}
          type="text"
          value={data.neighborhood}
          onChange={e => onChange('neighborhood', e.target.value)}
          className={INPUT_CLASS}
        />
      </div>

      <div>
        <label htmlFor={fieldId('school')} className="mb-1 block text-xs font-medium text-gray-700">
          Escola
        </label>
        <input
          id={fieldId('school')}
          type="text"
          value={data.school}
          onChange={e => onChange('school', e.target.value)}
          className={INPUT_CLASS}
        />
      </div>

      <div>
        <label htmlFor={fieldId('schoolShift')} className="mb-1 block text-xs font-medium text-gray-700">
          Turno escolar
        </label>
        <select
          id={fieldId('schoolShift')}
          value={data.schoolShift}
          onChange={e => onChange('schoolShift', e.target.value)}
          className={INPUT_CLASS}
        >
          <option value="">Selecione</option>
          <option value="manha">Manhã</option>
          <option value="tarde">Tarde</option>
          <option value="integral">Integral</option>
        </select>
      </div>

      <div>
        <label htmlFor={fieldId('priority')} className="mb-1 block text-xs font-medium text-gray-700">
          Prioridade
        </label>
        <select
          id={fieldId('priority')}
          value={data.priority}
          onChange={e => onChange('priority', e.target.value)}
          className={INPUT_CLASS}
        >
          <option value="">Selecione</option>
          <option value="baixa">Baixa</option>
          <option value="media">Média</option>
          <option value="alta">Alta</option>
        </select>
      </div>

      <div className="md:col-span-2">
        <label htmlFor={fieldId('triageNotes')} className="mb-1 block text-xs font-medium text-gray-700">
          Observações da triagem
        </label>
        <textarea
          id={fieldId('triageNotes')}
          value={data.triageNotes}
          onChange={e => onChange('triageNotes', e.target.value)}
          rows={3}
          className={INPUT_CLASS}
        />
      </div>
    </div>
  );
}
