import React from 'react';
import { cn } from '../../utils/cn';

const INPUT_CLASS =
  'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-cyan-500';

const DOCUMENT_OPTIONS = [
  { key: 'certidao_nascimento', label: 'Certidão de nascimento' },
  { key: 'documento_responsavel', label: 'Documento do responsável' },
  { key: 'comprovante_residencia', label: 'Comprovante de residência' },
  { key: 'carteira_vacinacao', label: 'Carteira de vacinação' },
];

export default function ChildEnrollmentEditFields({
  prefix,
  data,
  onChange,
  onToggleDocument,
  participationDays = [],
}) {
  const fieldId = field => `${prefix}-${field}`;

  return (
    <div className="space-y-3 border-t border-gray-100 pt-4">
      <div>
        <h4 className="font-medium text-gray-900">Dados de matrícula</h4>
        <p className="text-xs text-gray-500">Atualize os campos adicionais da matrícula.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label htmlFor={fieldId('startDate')} className="mb-1 block text-xs font-medium text-gray-700">
            Data de início
          </label>
          <input
            id={fieldId('startDate')}
            type="date"
            value={data.startDate}
            onChange={e => onChange('startDate', e.target.value)}
            className={INPUT_CLASS}
          />
        </div>

        <div>
          <label htmlFor={fieldId('classGroup')} className="mb-1 block text-xs font-medium text-gray-700">
            Turma/Grupo
          </label>
          <select
            id={fieldId('classGroup')}
            value={data.classGroup}
            onChange={e => onChange('classGroup', e.target.value)}
            className={INPUT_CLASS}
          >
            <option value="">Selecione</option>
            <option value="pre_alfabetizacao">Pré-alfabetização</option>
            <option value="alfabetizacao">Alfabetização</option>
            <option value="fundamental_1">Fundamental 1</option>
            <option value="fundamental_2">Fundamental 2</option>
          </select>
        </div>

        <div>
          <label htmlFor={fieldId('referralSource')} className="mb-1 block text-xs font-medium text-gray-700">
            Como conheceu o Lumine?
          </label>
          <select
            id={fieldId('referralSource')}
            value={data.referralSource}
            onChange={e => onChange('referralSource', e.target.value)}
            className={INPUT_CLASS}
          >
            <option value="">Selecione</option>
            <option value="igreja">Igreja</option>
            <option value="escola">Escola</option>
            <option value="CRAS">CRAS</option>
            <option value="indicacao">Indicação</option>
            <option value="redes_sociais">Redes sociais</option>
            <option value="outro">Outro</option>
          </select>
        </div>

        <div>
          <label
            htmlFor={fieldId('schoolCommuteAlone')}
            className="mb-1 block text-xs font-medium text-gray-700"
          >
            Vai e volta desacompanhada da escola?
          </label>
          <select
            id={fieldId('schoolCommuteAlone')}
            value={data.schoolCommuteAlone}
            onChange={e => onChange('schoolCommuteAlone', e.target.value)}
            className={INPUT_CLASS}
          >
            <option value="">Selecione</option>
            <option value="sim">Sim</option>
            <option value="nao">Não</option>
          </select>
        </div>

        <div>
          <label htmlFor={fieldId('renovacao')} className="mb-1 block text-xs font-medium text-gray-700">
            Renovação de matrícula
          </label>
          <select
            id={fieldId('renovacao')}
            value={data.renovacao}
            onChange={e => onChange('renovacao', e.target.value)}
            className={INPUT_CLASS}
          >
            <option value="">Selecione</option>
            <option value="sim">Sim</option>
            <option value="nao">Não</option>
          </select>
        </div>

        <div>
          <label
            htmlFor={fieldId('healthCareNeeded')}
            className="mb-1 block text-xs font-medium text-gray-700"
          >
            Existe algum cuidado de saúde?
          </label>
          <select
            id={fieldId('healthCareNeeded')}
            value={data.healthCareNeeded}
            onChange={e => onChange('healthCareNeeded', e.target.value)}
            className={INPUT_CLASS}
          >
            <option value="">Selecione</option>
            <option value="sim">Sim</option>
            <option value="nao">Não</option>
          </select>
        </div>

        {data.healthCareNeeded === 'sim' && (
          <div className="md:col-span-2">
            <label htmlFor={fieldId('healthNotes')} className="mb-1 block text-xs font-medium text-gray-700">
              Qual cuidado de saúde?
            </label>
            <input
              id={fieldId('healthNotes')}
              type="text"
              value={data.healthNotes}
              onChange={e => onChange('healthNotes', e.target.value)}
              className={INPUT_CLASS}
            />
          </div>
        )}

        <div className="md:col-span-2">
          <p className="mb-2 text-xs font-medium text-gray-700">Dias de participação</p>
          <div className="flex flex-wrap gap-2">
            {participationDays.map(day => (
              <button
                key={day.value}
                type="button"
                aria-pressed={data.participationDays.includes(day.value)}
                onClick={() =>
                  onChange(
                    'participationDays',
                    data.participationDays.includes(day.value)
                      ? data.participationDays.filter(item => item !== day.value)
                      : [...data.participationDays, day.value]
                  )
                }
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium',
                  data.participationDays.includes(day.value)
                    ? 'bg-cyan-700 text-white'
                    : 'bg-gray-100 text-gray-700'
                )}
              >
                {day.label}
              </button>
            ))}
          </div>
        </div>

        <div className="md:col-span-2">
          <label
            htmlFor={fieldId('authorizedPickup')}
            className="mb-1 block text-xs font-medium text-gray-700"
          >
            Pessoas autorizadas a retirar
          </label>
          <input
            id={fieldId('authorizedPickup')}
            type="text"
            value={data.authorizedPickup}
            onChange={e => onChange('authorizedPickup', e.target.value)}
            className={INPUT_CLASS}
          />
        </div>

        <div>
          <label htmlFor={fieldId('canLeaveAlone')} className="mb-1 block text-xs font-medium text-gray-700">
            Pode sair desacompanhada?
          </label>
          <select
            id={fieldId('canLeaveAlone')}
            value={data.canLeaveAlone}
            onChange={e => onChange('canLeaveAlone', e.target.value)}
            className={INPUT_CLASS}
          >
            <option value="">Selecione</option>
            <option value="sim">Sim</option>
            <option value="nao">Não</option>
          </select>
        </div>

        <div>
          <label htmlFor={fieldId('formaChegada')} className="mb-1 block text-xs font-medium text-gray-700">
            Forma de chegada/saída
          </label>
          <select
            id={fieldId('formaChegada')}
            value={data.formaChegada}
            onChange={e => onChange('formaChegada', e.target.value)}
            className={INPUT_CLASS}
          >
            <option value="">Selecione</option>
            <option value="levada_responsavel">Levada/buscada pelo responsável</option>
            <option value="a_pe">A pé</option>
            <option value="transporte_escolar">Transporte escolar</option>
            <option value="outro">Outro</option>
          </select>
        </div>

        <div>
          <label htmlFor={fieldId('imageConsent')} className="mb-1 block text-xs font-medium text-gray-700">
            Autorização de uso de imagem
          </label>
          <select
            id={fieldId('imageConsent')}
            value={data.imageConsent}
            onChange={e => onChange('imageConsent', e.target.value)}
            className={INPUT_CLASS}
          >
            <option value="">Não autorizo</option>
            <option value="interno">Uso interno</option>
            <option value="comunicacao">Uso institucional e comunicação</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <p className="mb-2 text-xs font-medium text-gray-700">Documentos recebidos</p>
          <div className="grid grid-cols-1 gap-2 text-xs text-gray-700 md:grid-cols-2">
            {DOCUMENT_OPTIONS.map(option => (
              <label key={option.key} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={data.documentsReceived.includes(option.key)}
                  onChange={() => onToggleDocument(option.key)}
                  className="h-4 w-4 rounded"
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>

        <div className="md:col-span-2">
          <label
            htmlFor={fieldId('initialObservations')}
            className="mb-1 block text-xs font-medium text-gray-700"
          >
            Observações pedagógicas
          </label>
          <textarea
            id={fieldId('initialObservations')}
            value={data.initialObservations}
            onChange={e => onChange('initialObservations', e.target.value)}
            rows={3}
            className={INPUT_CLASS}
          />
        </div>
      </div>
    </div>
  );
}
