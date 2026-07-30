// AI-powered itinerary generator — calls DeepSeek via Vercel API

const ITINERARY_API = 'https://gp-landing-rho.vercel.app/api/itinerary';

// Fallback: generate a basic template itinerary if the API fails
function parseDate(str, year) {
  if (!str) return new Date();
  const d = new Date(str);
  if (!isNaN(d)) return d;
  const months = {Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11};
  const parts = str.split(' ');
  if (parts.length >= 2 && months[parts[0]] !== undefined) {
    return new Date(year || new Date().getFullYear(), months[parts[0]], parseInt(parts[1]));
  }
  return new Date();
}

function fallbackItinerary(trip) {
  if (!trip) return [];
  const dest = trip.destination || 'Your destination';
  const dIn = parseDate(trip.checkIn || trip.start_date, trip.year);
  const dOut = parseDate(trip.checkOut || trip.end_date, trip.year);
  const totalDays = Math.max(1, Math.ceil((dOut - dIn) / (1000 * 60 * 60 * 24)));

  const labels = ['Arrivo', 'Esplorare', 'Gita', 'Scoprire', 'Relax', 'Avventura', 'Cultura', 'Partenza'];
  const icons = ['✈️', '🏛️', '🏖️', '⛵', '🌳', '🎭', '🏔️', '🚗'];

  const fallbackTemplates = {
    arrival: [
      { time: 'Pomeriggio', icon: '🚗', title: (d) => `Arrivo a ${d}`, desc: 'Check-in e primo giro', price: null },
      { time: 'Cena', icon: '🍽️', title: 'Cena tipica', desc: 'Ristorante locale', price: '~€20 pp' },
    ],
    explore: [
      { time: 'Mattina', icon: '🏛️', title: (d) => `Visita di ${d}`, desc: 'Esplorate i luoghi iconici', price: '~€5-10' },
      { time: 'Pranzo', icon: '🥘', title: 'Pranzo locale', desc: 'Assaggiate le specialità', price: '~€10-15 pp' },
      { time: 'Pomeriggio', icon: '🚶', title: 'Passeggiata', desc: 'Godetevi l\'atmosfera', price: null },
    ],
    departure: [
      { time: 'Mattina', icon: '☀️', title: 'Ultima colazione', desc: 'Preparate i bagagli', price: null },
      { time: 'Check-out', icon: '🚗', title: 'Partenza', desc: 'Check-out e arrivederci!', price: null },
    ],
  };

  const days = [];
  for (let i = 0; i < totalDays; i++) {
    const key = i === 0 ? 'arrival' : i === totalDays - 1 ? 'departure' : 'explore';
    const template = fallbackTemplates[key] || fallbackTemplates.explore;
    const activities = template.map(act => ({
      time: act.time,
      icon: act.icon,
      title: typeof act.title === 'function' ? act.title(dest) : act.title,
      desc: typeof act.desc === 'function' ? act.desc(dest) : act.desc,
      price: act.price,
    }));

    const date = new Date(dIn);
    date.setDate(date.getDate() + i);

    days.push({
      day: `Day ${i + 1}`,
      date: date.getDate().toString(),
      label: labels[Math.min(i, labels.length - 1)],
      icon: icons[Math.min(i, icons.length - 1)],
      subtitle: i === 0 ? `Arrivo a ${dest}` : i === totalDays - 1 ? `Partenza da ${dest}` : `Esplorare ${dest}`,
      location: dest,
      image: '',
      activities,
    });
  }
  return days;
}

// Parse the AI response into our day format
function parseAIResponse(aiData, dest) {
  if (!aiData || !aiData.days || aiData.days.length === 0) {
    return null;
  }

  return aiData.days.map((day, di) => {
    const date = new Date();
    date.setDate(date.getDate() + di);

    return {
      day: day.day || `Day ${di + 1}`,
      date: date.getDate().toString(),
      label: day.label || 'Giorno',
      icon: day.icon || '📍',
      subtitle: day.subtitle || `Giorno a ${dest}`,
      location: day.location || dest,
      image: '', // Will be filled by Unsplash
      activities: (day.activities || []).map((act, ai) => ({
        time: act.time || '',
        icon: act.icon || '📍',
        title: act.title || '',
        desc: act.desc || '',
        price: act.price || null,
      })),
    };
  });
}

// Get relevant image URL for a location
function getImageForLocation(location, seed = 0) {
  if (!location) return '';
  const query = encodeURIComponent(`${location} travel`);
  return `https://source.unsplash.com/featured/600x300/?${query}&sig=${seed}`;
}

// Generate itinerary — tries AI first, falls back to template
export async function generateItinerary(trip) {
  if (!trip) return [];

  // If trip already has an AI-generated itinerary saved, use it directly
  if (trip.itinerary && trip.itinerary.days && trip.itinerary.days.length > 0) {
    const parsed = parseAIResponse(trip.itinerary, trip.destination);
    if (parsed) {
      return parsed.map((day, i) => ({
        ...day,
        image: getImageForLocation(day.location, i),
      }));
    }
  }

  // If trip has tips but no parsed days yet (shouldn't happen, but be safe)
  // Actually tips are inside trip.itinerary, so they come along with the data

  const { destination, checkIn, checkOut, start_date, end_date, hotel, year } = trip;
  // Support both naming conventions (Supabase: start_date/end_date, legacy: checkIn/checkOut)
  const ci = checkIn || start_date || '';
  const co = checkOut || end_date || '';

  try {
    const res = await fetch(ITINERARY_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        destination,
        checkIn: ci,
        checkOut: co,
        hotel: hotel || '',
        preferences: trip.preferences || {},
      }),
    });

    if (!res.ok) {
      console.warn('Itinerary API error, using fallback');
      return fallbackItinerary(trip);
    }

    const data = await res.json();
    const parsed = parseAIResponse(data, destination);

    if (!parsed) {
      return fallbackItinerary(trip);
    }

    // Add images for each day based on the location
    return parsed.map((day, i) => ({
      ...day,
      image: getImageForLocation(day.location, i),
    }));

  } catch (e) {
    console.warn('Itinerary fetch failed, using fallback:', e.message);
    return fallbackItinerary(trip);
  }
}
