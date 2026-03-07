// Business Hours Service - Ótica Leve Mais
// Timezone: America/Campo_Grande (UTC-4) - Dourados-MS

const TIMEZONE = 'America/Campo_Grande';

// FIX: usar Intl.DateTimeFormat para obter componentes individuais do horário
// Evita o antipattern de parsear toLocaleString com new Date()
function getNow() {
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        weekday: 'short'
    });

    const parts = {};
    for (const { type, value } of formatter.formatToParts(new Date())) {
        parts[type] = value;
    }

    return {
        year: parseInt(parts.year),
        month: parseInt(parts.month),
        day: parseInt(parts.day),
        hour: parseInt(parts.hour === '24' ? '0' : parts.hour),
        minute: parseInt(parts.minute),
        second: parseInt(parts.second),
        weekday: parts.weekday // 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'
    };
}

// Feriados nacionais fixos + feriados de Dourados
function getFixedHolidays(year) {
    return [
        `${year}-01-01`, // Ano Novo
        `${year}-04-21`, // Tiradentes
        `${year}-05-01`, // Dia do Trabalho
        `${year}-09-07`, // Independência
        `${year}-10-12`, // N.S. Aparecida
        `${year}-11-02`, // Finados
        `${year}-11-15`, // Proclamação da República
        `${year}-12-25`, // Natal
        `${year}-05-20`, // Aniversário de Dourados
    ];
}

// Calcular Sexta-feira Santa e Carnaval (baseados na Páscoa)
function getEasterBasedHolidays(year) {
    // Algoritmo de Meeus/Jones/Butcher para calcular a Páscoa
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;

    const easter = new Date(year, month - 1, day);

    // Carnaval: 47 dias antes da Páscoa (terça-feira)
    const carnival = new Date(easter);
    carnival.setDate(carnival.getDate() - 47);

    // Segunda de Carnaval
    const carnivalMon = new Date(carnival);
    carnivalMon.setDate(carnivalMon.getDate() - 1);

    // Sexta-feira Santa: 2 dias antes da Páscoa
    const goodFriday = new Date(easter);
    goodFriday.setDate(goodFriday.getDate() - 2);

    // Corpus Christi: 60 dias após a Páscoa
    const corpusChristi = new Date(easter);
    corpusChristi.setDate(corpusChristi.getDate() + 60);

    const format = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    return [
        format(carnivalMon),     // Segunda de Carnaval
        format(carnival),        // Terça de Carnaval
        format(goodFriday),      // Sexta-feira Santa
        format(corpusChristi),   // Corpus Christi
    ];
}

function isHoliday(now) {
    const dateStr = `${now.year}-${String(now.month).padStart(2, '0')}-${String(now.day).padStart(2, '0')}`;
    const holidays = [
        ...getFixedHolidays(now.year),
        ...getEasterBasedHolidays(now.year)
    ];
    return holidays.includes(dateStr);
}

// Check if current time is within business hours
// Mon-Fri: 08:00-18:00
// Sat: 08:00-12:00
// Sun/Holidays: closed
function isBusinessHours() {
    const now = getNow();
    const timeInMinutes = now.hour * 60 + now.minute;

    // Feriados = fechado
    if (isHoliday(now)) return false;

    // Sunday = closed
    if (now.weekday === 'Sun') return false;

    // Saturday: 08:00-12:00
    if (now.weekday === 'Sat') {
        return timeInMinutes >= 480 && timeInMinutes < 720;
    }

    // Mon-Fri: 08:00-18:00
    return timeInMinutes >= 480 && timeInMinutes < 1080;
}

function getTimezone() {
    return TIMEZONE;
}

module.exports = { isBusinessHours, getNow, getTimezone };
