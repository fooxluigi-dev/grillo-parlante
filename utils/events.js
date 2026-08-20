// Shared helpers for event bookings (single events + extraEvents from mixed uploads)

const MONTHS = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
const WEEKDAYS_IT = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];

// Parse 'Aug 24', '24 Aug', '2026-08-24', or any Date-parseable string → Date | null
export function parseEventDate(str) {
  if (!str) return null;
  const s = String(str).trim();
  let m = s.match(/^([A-Za-z]{3})[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s+(\d{4}))?$/);
  if (m && MONTHS[m[1]] !== undefined) {
    const d = new Date(+(m[3] || 2000), MONTHS[m[1]], parseInt(m[2], 10));
    if (!isNaN(d)) return d;
  }
  m = s.match(/^(\d{1,2})\s+([A-Za-z]{3})[a-z]*\.?(?:\s+(\d{4}))?$/);
  if (m && MONTHS[m[2]] !== undefined) {
    const d = new Date(+(m[3] || 2000), MONTHS[m[2]], parseInt(m[1], 10));
    if (!isNaN(d)) return d;
  }
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    const d = new Date(+m[1], +m[2] - 1, +m[3]);
    if (!isNaN(d)) return d;
  }
  const d = new Date(s);
  return isNaN(d) ? null : d;
}

function sameDay(a, b) {
  return a.getDate() === b.getDate() && a.getMonth() === b.getMonth();
}

// Normalize to a fixed year so day-diffs are year-independent
// (dates may carry year 2000 from JS parsing vs the real year)
function monthDay(d) {
  return new Date(2000, d.getMonth(), d.getDate());
}

function itDayLabel(d) {
  return `${WEEKDAYS_IT[d.getDay()]} ${d.getDate()}`;
}

// Build a ParsedBooking for a secondary event detected in a mixed upload
export function eventBookingFromExtra(main, x) {
  return {
    type: 'event',
    destination: x?.venueCity || main?.destination || x?.venue || 'Event',
    checkIn: x?.eventDate,
    checkOut: x?.eventDate,
    confirmation: main?.confirmation,
    guests: null,
    guestNames: null,
    hotel: x?.venue,
    notes: null,
    flight: main?.flight,
    event: {
      eventName: x?.eventName,
      eventDate: x?.eventDate,
      eventTime: x?.eventTime,
      venue: x?.venue,
      ticketType: x?.ticketType,
      ticketCount: x?.ticketCount,
    },
    _isFallback: false,
  };
}

// Build an itinerary day for an event
export function buildEventDay(booking) {
  const e = booking?.event || {};
  const name = e.eventName || booking?.hotel || 'Event';
  const venue = e.venue || booking?.hotel || '';
  const date = e.eventDate || booking?.checkIn || '';
  const time = e.eventTime || '';
  const d = parseEventDate(date);
  return {
    day: d ? itDayLabel(d) : 'Event',
    date: String(date || ''),
    label: name,
    icon: '🎟️',
    subtitle: venue || date || 'Event day',
    location: venue || booking?.destination || 'Venue',
    activities: [{
      time: time || 'Mattina',
      icon: '🎟️',
      title: name,
      desc: [venue, e.ticketType].filter(Boolean).join(' · ') || 'Event ticket',
      price: null,
    }],
  };
}

// Chronological rank for an activity's time field:
// 'Colazione' < 'Mattina' < 'Pranzo' < 'Pomeriggio' < 'Sera' < 'Notte',
// clock times map onto the same scale (09:30 → Mattina, 18:00 → Sera)
const TIME_RANK = { colazione: 0, mattina: 1, pranzo: 2, pomeriggio: 3, sera: 4, notte: 5 };

function activityTimeRank(a) {
  const t = String(a?.time || '').trim().toLowerCase();
  if (TIME_RANK[t] !== undefined) return TIME_RANK[t];
  const m = t.match(/(\d{1,2}):(\d{2})/);
  if (m) {
    const h = parseInt(m[1], 10);
    if (h < 8) return 0;
    if (h < 12) return 1;
    if (h < 15) return 2;
    if (h < 19) return 3;
    if (h < 23) return 4;
    return 5;
  }
  return 2;
}

// Merge an event into a trip's itinerary:
// - if the event date matches a trip day (checkIn + index, or day/date field), the
//   event activity is merged INTO that day (so it shows on the right date)
// - otherwise it is inserted at the correct position (or appended)
export function mergeEventIntoItinerary(trip, booking) {
  const days = Array.isArray(trip?.itinerary?.days)
    ? trip.itinerary.days.map(d => ({ ...d, activities: [...(d.activities || [])] }))
    : [];
  const eventDay = buildEventDay(booking);
  const evDate = parseEventDate(eventDay.date);
  const baseDate = parseEventDate(trip?.checkIn || trip?.start_date || trip?.itinerary?.checkIn || '');

  let idx = -1;
  if (evDate) {
    if (baseDate) {
      const diff = Math.round((monthDay(evDate) - monthDay(baseDate)) / 86400000);
      if (diff >= 0 && diff < days.length) idx = diff;
    }
    if (idx < 0) {
      idx = days.findIndex(d => {
        const dd = parseEventDate(d.date) || parseEventDate(d.day);
        return dd ? sameDay(dd, evDate) : false;
      });
    }
  }

  if (idx >= 0) {
    const day = days[idx];
    const acts = [...(day.activities || [])];
    for (const ev of eventDay.activities) {
      // skip if the same activity is already in the day
      const dup = acts.find(a => String(a?.title || '').toLowerCase() === String(ev.title || '').toLowerCase());
      if (dup) continue;
      // insert chronologically: before the first activity that comes later
      // (a booked clock-time event goes before generic same-slot activities)
      const rank = activityTimeRank(ev);
      const pos = acts.findIndex(a => activityTimeRank(a) >= rank);
      acts.splice(pos < 0 ? acts.length : pos, 0, ev);
    }
    days[idx] = { ...day, activities: acts, icon: day.icon || '🎟️' };
  } else if (evDate && baseDate) {
    // Insert at the correct chronological position (month/day comparison)
    let pos = days.length;
    for (let i = 0; i < days.length; i++) {
      const dd = parseEventDate(days[i].day) || (() => { const x = new Date(baseDate); x.setDate(x.getDate() + i); return x; })();
      if (monthDay(evDate).getTime() < monthDay(dd).getTime()) { pos = i; break; }
    }
    days.splice(pos, 0, eventDay);
  } else {
    days.push(eventDay);
  }

  return { ...(trip.itinerary || {}), days };
}
