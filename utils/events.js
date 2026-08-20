// Shared helpers for event bookings (single events + extraEvents from mixed uploads)

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
  return {
    day: 'Day 1',
    date: String(date || ''),
    label: name,
    icon: '🎟️',
    subtitle: venue || date || 'Event day',
    location: venue || booking?.destination || 'Venue',
    activities: [{
      time: time || 'Mattina',
      icon: '🎟️',
      title: name,
      desc: venue || 'Event ticket',
      price: e.ticketType || null,
    }],
  };
}

// Merge an event into a trip's itinerary (same-date merge or append)
export function mergeEventIntoItinerary(trip, booking) {
  const days = Array.isArray(trip?.itinerary?.days)
    ? trip.itinerary.days.map(d => ({ ...d, activities: [...(d.activities || [])] }))
    : [];
  const eventDay = buildEventDay(booking);
  const dateStr = eventDay.date;
  if (dateStr) {
    const idx = days.findIndex(d => String(d.date || '') === String(dateStr));
    if (idx >= 0) {
      const day = days[idx];
      days[idx] = { ...day, activities: [...day.activities, ...eventDay.activities], icon: day.icon || '🎟️' };
    } else {
      days.push(eventDay);
    }
  } else {
    days.push(eventDay);
  }
  return { ...(trip.itinerary || {}), days };
}
