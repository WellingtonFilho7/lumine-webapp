import { isMatriculated, parseParticipationDays } from './childData';
import { WEEKDAY_KEYS } from '../constants/enrollment';

export function getDashboardStats(children, dailyRecords) {
  const today = new Date().toISOString().split('T')[0];
  const todayRecs = dailyRecords.filter(r => r.date?.split('T')[0] === today);
  const present = todayRecs.filter(
    r => r.attendance === 'present' || r.attendance === 'late'
  ).length;
  const active = children.filter(isMatriculated).length;
  const thisMonth = new Date();
  thisMonth.setDate(1);
  const monthRecs = dailyRecords.filter(r => new Date(r.date) >= thisMonth);
  const meals = monthRecs.filter(
    r => r.attendance === 'present' || r.attendance === 'late'
  ).length;
  return { present, absent: active - present, total: active, meals };
}

export function getAttendanceAlerts(children, dailyRecords) {
  const alerts = [];
  const today = new Date();

  children
    .filter(isMatriculated)
    .forEach(child => {
      const participation = parseParticipationDays(child.participationDays);
      if (!participation.length) return;

      let confirmedAbsences = 0;
      let pending = 0;

      for (let offset = 0; offset < 14; offset += 1) {
        const date = new Date(today);
        date.setHours(0, 0, 0, 0);
        date.setDate(today.getDate() - offset);
        const dayKey = WEEKDAY_KEYS[date.getDay()];
        if (!participation.includes(dayKey)) continue;

        const dateStr = date.toISOString().split('T')[0];
        const record = dailyRecords.find(
          r => r.childInternalId === child.id && r.date?.split('T')[0] === dateStr
        );

        if (!record) {
          pending += 1;
          continue;
        }

        if (record.attendance === 'absent') {
          confirmedAbsences += 1;
          continue;
        }

        if (record.attendance === 'present' || record.attendance === 'late') {
          break;
        }
      }

      if (confirmedAbsences >= 3) {
        alerts.push({
          childId: child.id,
          childName: child.name,
          msg: '3+ faltas confirmadas seguidas',
          severity: 'strong',
        });
        return;
      }

      if (confirmedAbsences >= 2 && pending >= 1) {
        alerts.push({
          childId: child.id,
          childName: child.name,
          msg: 'Possível sequência de faltas. Verificar registros pendentes dos últimos encontros.',
          severity: 'weak',
        });
      }
    });

  return alerts;
}
