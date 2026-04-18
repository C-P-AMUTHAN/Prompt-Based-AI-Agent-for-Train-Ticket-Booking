// backend/controllers/promptController.js
const chrono = require('chrono-node');
const axios = require('axios');
const Ticket = require('../models/Ticket');
const { generateErsTicketPDF } = require('../services/ticketPdfService');
const { sendTicketEmail } = require('../services/emailService');
const { calculateTicketPrice } = require('../utils/pricingCalculator');
const { getDistance } = require('../utils/stationDistance');

// parsePrompt: best-effort offline parser for the new format.
// Format: "Book [number] [class] tickets from [from] to [to] on [date]. Passengers: [name1, age1, gender1]; [name2, age2, gender2]; etc. Contact: [phone], [email]"
function parsePrompt(prompt) {
  const lower = prompt.toLowerCase();

  // Extract number of tickets (passengers)
  let passengersCount = 1;
  const paxMatch = lower.match(/book\s+(\d+)/);
  if (paxMatch) {
    passengersCount = parseInt(paxMatch[1], 10);
  }

  // Extract class
  let travelClass = "Sleeper";
  if (lower.includes("ac 3") || lower.includes("ac3")) travelClass = "AC 3-Tier";
  else if (lower.includes("ac 2") || lower.includes("ac2")) travelClass = "AC 2-Tier";
  else if (lower.includes("ac")) travelClass = "AC 3-Tier";
  else if (lower.includes("sleeper")) travelClass = "Sleeper";

  // Extract from, to
  const fromMatch = lower.match(/from\s+([A-Za-z\s]+?)(?:\s+to\s|\s+on\s|$)/);
  const toMatch = lower.match(/to\s+([A-Za-z\s]+?)(?:\s+on\s|$)/);
  const from = fromMatch ? fromMatch[1].trim().split(' ')[0] : "";
  const to = toMatch ? toMatch[1].trim().split(' ')[0] : "";

  // Extract date
  const parsedDates = chrono.parse(prompt);
  let date = "";
  if (parsedDates && parsedDates.length) {
    const dt = parsedDates[0].start.date();
    date = dt.toISOString().slice(0,10); // YYYY-MM-DD
  } else {
    const datePatterns = [
      /(\d{4}-\d{2}-\d{2})/,
      /(\d{2}\/\d{2}\/\d{4})/,
      /(\d{2}-\d{2}-\d{4})/,
    ];
    for (const pattern of datePatterns) {
      const match = prompt.match(pattern);
      if (match) {
        date = match[1];
        break;
      }
    }
  }

  // Extract passengers details
  const passengersSection = prompt.match(/passengers:\s*(.+?)(?:\s*contact|$)/i);
  let passengers = [];
  if (passengersSection) {
    const paxList = passengersSection[1].split(';').map(p => p.trim());
    passengers = paxList.map(p => {
      const parts = p.split(',').map(x => x.trim());
      if (parts.length >= 3) {
        return { name: parts[0], age: parseInt(parts[1], 10), gender: parts[2] };
      }
      return null;
    }).filter(p => p);
  }
  // If no passengers section, fallback to old logic or default
  if (passengers.length === 0) {
    passengers = [{ name: "Guest", age: 25, gender: "Male" }];
  }

  // Extract contact
  const contactMatch = lower.match(/contact:\s*([0-9]+),\s*([^\s]+)/);
  let phone = "", email = "";
  if (contactMatch) {
    phone = contactMatch[1];
    email = contactMatch[2];
  }

  console.log('Parsed booking details:', { from, to, date, passengersCount, class: travelClass, passengers, phone, email });

  return { from, to, date, passengers: passengersCount, class: travelClass, passengerDetails: passengers, phone, email };
}

// Advanced date parser to handle various voice-based formats
function parseDate(dateStr) {
  if (!dateStr) return null;

  // Try chrono-node first for natural language dates
  const chronoParsed = chrono.parse(dateStr);
  if (chronoParsed && chronoParsed.length > 0) {
    const dt = chronoParsed[0].start.date();
    if (dt && dt instanceof Date && !isNaN(dt)) {
      return dt.toISOString().slice(0, 10); // YYYY-MM-DD
    }
  }

  // ISO format: YYYY-MM-DD
  const isoMatch = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const date = new Date(year, month - 1, day);
    if (!isNaN(date)) return `${year}-${month}-${day}`;
  }

  // DD/MM/YYYY format
  const dmy1 = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dmy1) {
    const [, day, month, year] = dmy1;
    const d = new Date(year, month - 1, day);
    if (!isNaN(d)) return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  // DD-MM-YYYY format
  const dmy2 = dateStr.match(/(\d{1,2})-(\d{1,2})-(\d{4})/);
  if (dmy2) {
    const [, day, month, year] = dmy2;
    const d = new Date(year, month - 1, day);
    if (!isNaN(d)) return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  // Month DD, YYYY or DD Month YYYY format (natural language)
  const nlDate = dateStr.match(/(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i);
  if (nlDate) {
    const months = { January: 0, February: 1, March: 2, April: 3, May: 4, June: 5, July: 6, August: 7, September: 8, October: 9, November: 10, December: 11 };
    const [, day, monthName, year] = nlDate;
    const month = months[monthName] !== undefined ? months[monthName] : months[monthName.charAt(0).toUpperCase() + monthName.slice(1).toLowerCase()];
    const d = new Date(year, month, day);
    if (!isNaN(d)) return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  return null;
}

// Extract station name (first word or best match)
function extractStation(text) {
  if (!text) return "";
  const words = text.trim().split(/[\s,.-]/);
  // Get first significant word (skip articles and small words)
  for (const word of words) {
    if (word.length > 2 && /^[a-zA-Z]+$/.test(word)) {
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }
  }
  return text.split(/[\s,.-]/)[0];
}

// Extract class code (SL, 3A, 2A, 1A, CC)
function extractClassCode(text) {
  const lower = text.toLowerCase();
  if (lower.includes("ac 3") || lower.includes("ac3") || lower.includes("three tier")) return "3A";
  if (lower.includes("ac 2") || lower.includes("ac2") || lower.includes("two tier")) return "2A";
  if (lower.includes("ac 1") || lower.includes("ac1") || lower.includes("first") || lower.includes("one tier")) return "1A";
  if (lower.includes("sleeper")) return "SL";
  if (lower.includes("chair car") || lower.includes("cc")) return "CC";
  if (lower.includes("general")) return "GN";
  return "SL"; // default
}

// Extract number of passengers/tickets from text
function extractPassengerCount(text) {
  const matches = text.match(/(\d+)/);
  if (matches) return parseInt(matches[1], 10);
  return 1;
}

// Extract passenger details with flexible parsing
function extractPassengers(text) {
  const passengers = [];
  
  if (!text) {
    // Default passenger if none specified
    return [{ name: "Guest", age: 25, gender: "Male" }];
  }

  // First, split by "and" to handle multiple passengers
  const passengerTexts = text.split(/\s+and\s+/i);
  
  for (const passengerText of passengerTexts) {
    // Pattern 1: "Name, age Age, Gender"
    const pattern1 = /([A-Za-z\s]+?)[,\s]+age\s+(\d{1,3})[,\s]+([MF]|Male|Female)/i;
    let match = passengerText.match(pattern1);
    if (match) {
      const name = match[1].trim();
      const age = parseInt(match[2], 10);
      const genderStr = match[3].toLowerCase();
      const gender = genderStr.startsWith('f') ? 'Female' : 'Male';
      if (name && age && !isNaN(age) && age > 0 && age < 150) {
        passengers.push({ name, age, gender });
        continue;
      }
    }

    // Pattern 2: "Name, Age, Gender" (original)
    const pattern2 = /([A-Za-z\s]+?)[,\s]+(\d{1,3})[,\s]+([MF]|Male|Female)/i;
    match = passengerText.match(pattern2);
    if (match) {
      const name = match[1].trim();
      const age = parseInt(match[2], 10);
      const genderStr = match[3].toLowerCase();
      const gender = genderStr.startsWith('f') ? 'Female' : 'Male';
      if (name && age && !isNaN(age) && age > 0 && age < 150) {
        passengers.push({ name, age, gender });
        continue;
      }
    }

    // Pattern 3: "P1, P2, P3 etc" or numbered passengers
    const pxPattern = /P\s*(\d+)[,\s]+(\d{1,3})[,\s]+([MF]|Male|Female)/i;
    match = passengerText.match(pxPattern);
    if (match) {
      const name = `P${match[1]}`;
      const age = parseInt(match[2], 10);
      const genderStr = match[3].toLowerCase();
      const gender = genderStr.startsWith('f') ? 'Female' : 'Male';
      if (age && !isNaN(age) && age > 0 && age < 150) {
        passengers.push({ name, age, gender });
        continue;
      }
    }

    // Pattern 4: Age and gender only
    const ageGenderPattern = /(\d{1,3})\s+(?:years?\s+)?([MF]|male|female)/i;
    match = passengerText.match(ageGenderPattern);
    if (match) {
      const age = parseInt(match[1], 10);
      const genderStr = match[2].toLowerCase();
      const gender = genderStr.startsWith('f') ? 'Female' : 'Male';
      if (age && !isNaN(age) && age > 0 && age < 150) {
        passengers.push({ name: `Passenger${passengers.length + 1}`, age, gender });
        continue;
      }
    }
  }

  // If still no passengers found, create default entry
  if (passengers.length === 0) {
    passengers.push({ name: "Guest", age: 25, gender: "Male" });
  }

  return passengers;
}

// Extract contact information (phone and email)
function extractContact(text) {
  const contact = { phone: "", email: "" };

  if (!text) return contact;

  // Phone number: various formats
  const phonePatterns = [
    /(?:\+?91\s?)?(\d{10})/,  // 10 digits (Indian format)
    /(?:\+\d{1,3}[-.\s]?)?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}/,  // International
  ];

  for (const pattern of phonePatterns) {
    const phoneMatch = text.match(pattern);
    if (phoneMatch) {
      contact.phone = phoneMatch[0].replace(/\D/g, '').slice(-10); // Get last 10 digits
      if (contact.phone.length === 10) break;
    }
  }

  // Email: standard email pattern
  const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (emailMatch) {
    contact.email = emailMatch[1];
  }

  return contact;
}

// Main parser: parse natural-language booking prompt into a bookingDetails object
// Handles both formatted and voice-based natural language input
function parseBookingFromPrompt(input) {
    if (!input) return {};
    if (typeof input === 'object') return input;
    
    const s = String(input).replace(/\s+/g, ' ').trim();
    console.log('Parsing prompt:', s);

    const out = {
        action: "book_ticket",
        source_station: "",
        destination_station: "",
        travel_date: "",
        preferred_time: "",
        class: "SL",
        passengers: [],
        auto_pay: false
    };

    // Extract auto_pay
    if (s.toLowerCase().includes('auto-pay') || s.toLowerCase().includes('auto pay')) {
        out.auto_pay = true;
    }

    // Extract ticket count and class
    // Patterns: "book 2 sleeper", "book 2 ac 3-tier", "2 tickets", etc
    const bookMatch = s.match(/book\s+(\d+)\s+(.+?)(?:\s+(?:tickets?|from)|$)/i);
    if (bookMatch) {
        // passengers count will be extracted later
        out.class = extractClassCode(bookMatch[2]);
    }

    // Extract route (from, to)
    // Patterns: "from Chennai to Trichy", "Chennai Trichy", etc
    const fromToMatch = s.match(/from\s+([A-Za-z\s]+?)\s+to\s+([A-Za-z\s]+?)(?:\s+on\s+|[.\s]|$)/i);
    if (fromToMatch) {
        out.source_station = extractStation(fromToMatch[1]);
        out.destination_station = extractStation(fromToMatch[2]);
    } else {
        // Fallback: look for standalone "from" and "to"
        const fromMatch = s.match(/from\s+([A-Za-z\s]+?)(?:\s+to\s|[.\s,]|$)/i);
        if (fromMatch) out.source_station = extractStation(fromMatch[1]);
        
        const toMatch = s.match(/to\s+([A-Za-z\s]+?)(?:\s+on\s|[.\s,]|$)/i);
        if (toMatch) out.destination_station = extractStation(toMatch[1]);
    }

    // Extract preferred time
    const timeMatch = s.match(/(?:at|time)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM))/i);
    if (timeMatch) {
        out.preferred_time = timeMatch[1].trim();
    }

    // Extract date (very flexible)
    // Look for various date patterns and use parseDate function
    let dateFound = false;
    
    // First try to find explicit date sections
    const dateSection = s.match(/(?:on|date|travel|departure)[\s:]*(.+?)(?:\s+(?:passenger|contact|for|at)|[.\n]|$)/i);
    if (dateSection && !dateFound) {
        const parsed = parseDate(dateSection[1]);
        if (parsed) {
            out.travel_date = parsed;
            dateFound = true;
        }
    }

    // If not found, try common date patterns
    if (!dateFound) {
        // Try chrono-node parsing on entire string for natural dates
        try {
            const chronoParsed = chrono.parse(s);
            if (chronoParsed && chronoParsed.length > 0) {
                const dt = chronoParsed[0].start.date();
                if (dt && dt instanceof Date && !isNaN(dt)) {
                    out.travel_date = dt.toISOString().slice(0, 10);
                    dateFound = true;
                }
            }
        } catch (e) {
            console.log('Chrono parse error:', e.message);
        }
    }

    // If still not found, look for explicit date patterns
    if (!dateFound) {
        const allDateMatches = [
            /(\d{4})-(\d{2})-(\d{2})/,  // YYYY-MM-DD
            /(\d{1,2})\/(\d{1,2})\/(\d{4})/,  // DD/MM/YYYY
            /(\d{1,2})-(\d{1,2})-(\d{4})/,  // DD-MM-YYYY
        ];
        for (const pattern of allDateMatches) {
            const match = s.match(pattern);
            if (match) {
                const parsed = parseDate(match[0]);
                if (parsed) {
                    out.travel_date = parsed;
                    break;
                }
            }
        }
    }

    // Validate date is not in the past
    if (out.travel_date) {
        const bookingDate = new Date(out.travel_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (bookingDate < today) {
            console.warn(`Warning: booking date ${out.travel_date} is in the past`);
            // Continue anyway - backend might handle it
        }
    }

    // Extract passengers details
    const passengerSection = s.match(/(?:passengers?|for)[\s:]*(.+?)(?:\s+(?:contact|phone|email|auto)|[.\n]|$)/i);
    if (passengerSection) {
        out.passengers = extractPassengers(passengerSection[1]);
    } else {
        // Try to extract from entire string if no dedicated section
        out.passengers = extractPassengers(s);
    }
    
    // If passengers couldn't be extracted, create defaults
    if (out.passengers.length === 0) {
        out.passengers.push({
            name: "Guest",
            age: 25,
            gender: "Male"
        });
    }

    // Extract contact details (phone and email) - keep for later use
    const contactSection = s.match(/(?:contact|phone|email)[\s:]*(.+?)(?:[.\n]|$)/i);
    let phone = "", email = "";
    if (contactSection) {
        const contact = extractContact(contactSection[1]);
        phone = contact.phone;
        email = contact.email;
    } else {
        // Try to find contact info in entire string
        const contact = extractContact(s);
        phone = contact.phone;
        email = contact.email;
    }

    // SAFE EMAIL EXTRACTION FALLBACK: Extract email from anywhere in the prompt
    // This handles cases like "gmail id is abc@gmail.com" or "email abc@gmail.com"
    if (!email) {
        const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
        const emailMatch = s.match(emailRegex);
        if (emailMatch) {
            email = emailMatch[1];
            console.log('📧 Email extracted from prompt:', email);
        }
    }

    // Add contact to passengers if needed
    if (out.passengers.length > 0 && !out.passengers[0].phone) {
        out.passengers[0].phone = phone;
        out.passengers[0].email = email;
    }

    console.log('Parsed booking details:', JSON.stringify(out, null, 2));
    return out;
}

exports.handlePromptBooking = async (req, res) => {
  try {
    // accept prompt from POST body, or query string (GET), or raw body object
    const rawPrompt = (req.body && req.body.prompt) ? req.body.prompt
                    : (req.query && req.query.prompt) ? req.query.prompt
                    : (req.body && Object.keys(req.body).length ? req.body : undefined);
    
    if (!rawPrompt) {
      return res.status(400).json({ 
        status: "FAILED",
        reason: "No booking prompt provided",
        next_action: "Please provide a booking prompt"
      });
    }

    const bookingDetails = parseBookingFromPrompt(rawPrompt);
    console.log('Final parsed booking details:', JSON.stringify(bookingDetails, null, 2));

    // STEP 1: Validate required fields
    if (!bookingDetails.source_station || !bookingDetails.destination_station) {
      return res.status(400).json({ 
        status: "FAILED",
        reason: "Could not extract departure and arrival stations",
        next_action: "Please specify 'from [station] to [station]'",
        extracted: bookingDetails
      });
    }

    if (!bookingDetails.travel_date) {
      return res.status(400).json({ 
        status: "FAILED",
        reason: "Could not extract travel date",
        next_action: "Please specify a date (e.g., 'on January 15' or 'on 2026-01-15')",
        extracted: bookingDetails
      });
    }

    if (!bookingDetails.passengers || bookingDetails.passengers.length === 0) {
      return res.status(400).json({ 
        status: "FAILED",
        reason: "Could not extract passenger details",
        next_action: "Please specify 'Passengers: [name], [age], [gender]'",
        extracted: bookingDetails
      });
    }

    // STEP 2: Validation Rules
    // Validate stations exist
    try {
      const [sourceResponse, destResponse] = await Promise.all([
        axios.get('http://localhost:5000/api/stations/search', { params: { query: bookingDetails.source_station } }),
        axios.get('http://localhost:5000/api/stations/search', { params: { query: bookingDetails.destination_station } })
      ]);
      
      if (sourceResponse.data.length === 0 || destResponse.data.length === 0) {
        return res.status(400).json({
          status: "FAILED",
          reason: "Invalid station names",
          next_action: "Please check station names and try again"
        });
      }
    } catch (error) {
      console.error('Station validation error:', error.message);
      return res.status(500).json({
        status: "FAILED",
        reason: "Could not validate stations",
        next_action: "Please try again later"
      });
    }

    // Validate travel date not in past
    const travelDate = new Date(bookingDetails.travel_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (travelDate < today) {
      return res.status(400).json({
        status: "FAILED",
        reason: "Travel date cannot be in the past",
        next_action: "Please select a future date"
      });
    }

    // Validate passenger ages
    for (const passenger of bookingDetails.passengers) {
      if (!passenger.age || passenger.age <= 0) {
        return res.status(400).json({
          status: "FAILED",
          reason: "Invalid passenger age",
          next_action: "Please provide valid ages for all passengers"
        });
      }
    }

    // Validate class
    const validClasses = ['SL', '3A', '2A', '1A', 'CC'];
    if (!validClasses.includes(bookingDetails.class)) {
      return res.status(400).json({
        status: "FAILED",
        reason: "Invalid travel class",
        next_action: "Valid classes are: SL, 3A, 2A, 1A, CC"
      });
    }

    // STEP 3: Search trains (try erail API first, then MongoDB fallback)
    let trains = [];
    try {
      const searchResponse = await axios.get('http://localhost:5000/api/trains/live-search', {
        params: {
          from: bookingDetails.source_station,
          to: bookingDetails.destination_station,
          date: bookingDetails.travel_date
        }
      });
      trains = searchResponse.data;
    } catch (error) {
      console.error('Train search error:', error.message);
      return res.status(500).json({
        status: "FAILED",
        reason: "Could not search for trains",
        next_action: "Please try again later"
      });
    }

    if (!trains || trains.length === 0) {
      return res.status(404).json({
        status: "FAILED",
        reason: "No trains available for the selected route and date",
        next_action: "Try different dates or routes"
      });
    }

    // STEP 4: Select best train (prefer CONFIRMED availability)
    const availableTrains = trains.filter(train => train.availability && train.availability.toLowerCase() === 'confirmed');
    const selectedTrain = availableTrains.length > 0 ? availableTrains[0] : trains[0];

    // STEP 5: Calculate pricing
    const distance = getDistance(bookingDetails.source_station, bookingDetails.destination_station);
    const totalCost = bookingDetails.passengers.reduce((total, passenger) => {
      return total + calculateTicketPrice(distance, bookingDetails.class);
    }, 0);

    // STEP 6: If auto_pay, return order details for frontend checkout
    if (bookingDetails.auto_pay) {
      try {
        const orderResponse = await axios.post('http://localhost:5000/api/payment/create-order', {
          amount: totalCost,
          bookingData: {
            from: bookingDetails.source_station,
            to: bookingDetails.destination_station,
            date: bookingDetails.travel_date,
            passengers: bookingDetails.passengers,
            email: bookingDetails.passengers[0]?.email || '',
            phone: bookingDetails.passengers[0]?.phone || '',
            trainId: selectedTrain._id,
            trainName: selectedTrain.name,
            trainNumber: selectedTrain.number,
            departureTime: selectedTrain.departureTime,
            arrivalTime: selectedTrain.arrivalTime,
            travelClass: bookingDetails.class,
            distance: distance
          }
        });
        const paymentOrder = orderResponse.data;

        // Return order details for frontend checkout
        return res.status(200).json({
          status: "PAYMENT_REQUIRED",
          message: "Payment order created. Please complete payment.",
          order: {
            id: paymentOrder.id,
            amount: paymentOrder.amount,
            currency: paymentOrder.currency || 'INR'
          },
          bookingDetails: bookingDetails,
          train: selectedTrain,
          totalCost: totalCost
        });
      } catch (error) {
        console.error('Payment order creation error:', error.message);
        return res.status(500).json({
          status: "FAILED",
          reason: "Could not create payment order",
          next_action: "Please try again or contact support"
        });
      }
    }

    // STEP 7: For non-auto-pay, return booking details for manual payment
    return res.status(200).json({
      status: "BOOKING_READY",
      message: "Booking details prepared. Please proceed with manual payment.",
      bookingDetails: bookingDetails,
      train: selectedTrain,
      totalCost: totalCost
    });

  } catch (err) {
    console.error('Prompt booking error:', err);
    return res.status(500).json({ 
      status: "FAILED",
      reason: "Internal server error",
      next_action: "Please try again later"
    });
  }
};
