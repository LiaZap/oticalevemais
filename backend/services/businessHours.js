// Business Hours Service - Ótica Leve Mais
// Timezone: America/Campo_Grande (UTC-4) - Dourados-MS

const TIMEZONE = 'America/Campo_Grande';

// Returns current date/time in Dourados-MS timezone
function getNow() {
    return new Date(new Date().toLocaleString('en-US', { timeZone: TIMEZONE }));
}

// Check if current time is within business hours
// Mon-Fri: 08:00-18:00
// Sat: 08:00-12:00
// Sun/Holidays: closed
function isBusinessHours() {
    const now = getNow();
    const day = now.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    const hour = now.getHours();
    const minute = now.getMinutes();
    const timeInMinutes = hour * 60 + minute;

    // Sunday = closed
    if (day === 0) return false;

    // Saturday: 08:00-12:00
    if (day === 6) {
        return timeInMinutes >= 480 && timeInMinutes < 720; // 8*60=480, 12*60=720
    }

    // Mon-Fri: 08:00-18:00
    return timeInMinutes >= 480 && timeInMinutes < 1080; // 8*60=480, 18*60=1080
}

function getTimezone() {
    return TIMEZONE;
}

module.exports = { isBusinessHours, getNow, getTimezone };
