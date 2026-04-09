export type ScenarioCategory =
  | 'survival'
  | 'smalltalk'
  | 'transactions'
  | 'romance'
  | 'work'
  | 'emergency'

export interface ContextVariant {
  id: string
  weight: number
  situation: string
  detail: string
}

export interface RoleplayScenario {
  id: string
  category: ScenarioCategory
  title: string
  description: string
  npcRole: string
  namePool: string[]
  moodPool: string[]
  userRole: string
  location: string
  openingInstruction: string
  contextVariants: ContextVariant[]
  vocabularyFocus: string[]
}

export const ROLEPLAY_SCENARIOS: RoleplayScenario[] = [
  // ── SURVIVAL / TRAVEL ──
  {
    id: 'airport_checkin',
    category: 'survival',
    title: 'Airport Check-In',
    description: 'Check in for your flight. Luggage, seat, boarding pass.',
    npcRole: 'airline check-in agent',
    namePool: ['Sofia', 'Marco', 'Lena', 'David'],
    moodPool: ['efficient and professional', 'friendly and chatty', 'slightly rushed — long queue behind you'],
    userRole: 'A passenger checking in for a flight',
    location: 'Airport check-in counter',
    openingInstruction: 'Greet the passenger as they approach the counter and ask for their booking reference or passport.',
    contextVariants: [
      { id: 'normal', weight: 0.3, situation: 'Standard check-in, no issues.', detail: 'Flight is on time. Passenger has one checked bag within limit.' },
      { id: 'overweight', weight: 0.3, situation: 'Checked bag is overweight by 4kg.', detail: 'Excess baggage fee applies. NPC explains options: pay fee, repack, or leave items.' },
      { id: 'upgrade', weight: 0.2, situation: 'Business class upgrade available at discounted rate.', detail: 'NPC can offer upgrade — passenger decides.' },
      { id: 'delay', weight: 0.2, situation: 'Flight is delayed by 90 minutes.', detail: 'NPC informs passenger and offers meal voucher.' },
    ],
    vocabularyFocus: ['boarding pass', 'checked baggage', 'passport', 'seat preference', 'departure gate', 'overhead bin'],
  },
  {
    id: 'hotel_checkin',
    category: 'survival',
    title: 'Hotel Check-In',
    description: 'Arrive at your hotel. Something may not go smoothly.',
    npcRole: 'hotel receptionist',
    namePool: ['Clara', 'Stefan', 'Priya', 'Antoine'],
    moodPool: ['friendly and efficient', 'tired but professional', 'warm and welcoming'],
    userRole: 'A guest arriving to check in',
    location: 'Hotel lobby, front desk',
    openingInstruction: 'Greet the guest as they approach the front desk and ask for their name or reservation number.',
    contextVariants: [
      { id: 'normal', weight: 0.3, situation: 'Standard check-in, room ready.', detail: 'Standard double room on the 3rd floor, checkout is 11am.' },
      { id: 'overbooked', weight: 0.35, situation: 'Hotel is overbooked. NPC must offer a suite upgrade or nearby hotel.', detail: 'All standard rooms taken. A suite is available at no extra charge, or NPC can call a partner hotel.' },
      { id: 'no_id', weight: 0.2, situation: 'Guest has no ID. Policy requires it.', detail: 'NPC is understanding but must follow policy. Passport photo on phone may be acceptable as exception.' },
      { id: 'late_checkin', weight: 0.15, situation: 'It is 2am. Night staff, minimal guests.', detail: 'NPC wants to process quickly but stays polite. Breakfast times must be communicated.' },
    ],
    vocabularyFocus: ['reservation', 'room type', 'check-out', 'passport', 'key card', 'floor', 'breakfast included'],
  },
  {
    id: 'taxi_rideshare',
    category: 'survival',
    title: 'Taking a Taxi',
    description: 'Get to your destination. Negotiate, navigate, pay.',
    npcRole: 'taxi driver',
    namePool: ['Yusuf', 'Dmitri', 'Paulo', 'René'],
    moodPool: ['talkative and friendly', 'quiet and professional', 'curious about where you are from'],
    userRole: 'A passenger who just got into a taxi',
    location: 'Taxi, city streets',
    openingInstruction: 'Start driving and ask where the passenger wants to go.',
    contextVariants: [
      { id: 'normal', weight: 0.4, situation: 'Normal ride, smooth trip.', detail: 'Driver takes the normal route, makes small talk.' },
      { id: 'traffic', weight: 0.3, situation: 'Heavy traffic. Driver suggests alternate route — asks passenger.', detail: 'Alternate route is slightly longer in km but faster. Passenger must decide.' },
      { id: 'wrong_address', weight: 0.3, situation: 'Address passenger gave does not exist. Driver needs clarification.', detail: 'There are two streets with similar names. Driver asks which one.' },
    ],
    vocabularyFocus: ['address', 'route', 'traffic', 'fare', 'tip', 'turn left/right', 'straight ahead'],
  },
  {
    id: 'asking_directions',
    category: 'survival',
    title: 'Lost in the City',
    description: 'You are lost. Ask a local for directions.',
    npcRole: 'local resident or shopkeeper',
    namePool: ['Emma', 'Giorgio', 'Fatima', 'Lukas'],
    moodPool: ['helpful and patient', 'in a slight hurry but tries to help', 'very enthusiastic — gives too much detail'],
    userRole: 'A visitor who is lost and needs directions',
    location: 'City street or shop entrance',
    openingInstruction: 'You are walking or standing nearby when the visitor approaches you.',
    contextVariants: [
      { id: 'simple', weight: 0.4, situation: 'Destination is nearby, simple directions.', detail: 'Two turns, under 5 minutes walking.' },
      { id: 'complex', weight: 0.35, situation: 'Destination is further, requires landmark references.', detail: 'NPC uses landmarks: "past the church, left at the pharmacy."' },
      { id: 'wrong_district', weight: 0.25, situation: 'Visitor is in completely wrong area — needs to take transit.', detail: 'NPC explains which bus or metro to take and where to get off.' },
    ],
    vocabularyFocus: ['left', 'right', 'straight', 'corner', 'cross', 'block', 'landmark', 'bus stop', 'metro'],
  },
  {
    id: 'pharmacy',
    category: 'survival',
    title: 'At the Pharmacy',
    description: 'You need medicine. Describe symptoms or find what you need.',
    npcRole: 'pharmacist',
    namePool: ['Dr. Müller', 'Dr. Leblanc', 'Sarah', 'Thomas'],
    moodPool: ['professional and reassuring', 'efficient — asks targeted questions', 'cautious — recommends seeing a doctor if unsure'],
    userRole: 'A customer who needs medicine or advice',
    location: 'Pharmacy counter',
    openingInstruction: 'Greet the customer and ask how you can help.',
    contextVariants: [
      { id: 'headache', weight: 0.35, situation: 'Customer has a headache and wants pain relief.', detail: 'NPC asks about allergies, other medications, offers options.' },
      { id: 'prescription', weight: 0.3, situation: 'Customer has a prescription but it is from another country.', detail: 'NPC explains local rules, may be able to dispense one dose or equivalent.' },
      { id: 'cold', weight: 0.35, situation: 'Customer has a cold — sore throat, runny nose.', detail: 'NPC recommends combination medicine, asks about symptoms duration.' },
    ],
    vocabularyFocus: ['prescription', 'dosage', 'allergy', 'symptom', 'tablet', 'twice a day', 'side effects'],
  },
  {
    id: 'train_ticket',
    category: 'survival',
    title: 'Train Ticket',
    description: 'Buy a ticket at the station. Find the right train.',
    npcRole: 'station ticket agent',
    namePool: ['Martin', 'Céline', 'Giulia', 'Erik'],
    moodPool: ['efficient and helpful', 'by the book — no exceptions', 'friendly, knows the timetable by heart'],
    userRole: 'A traveller who needs to buy a train ticket',
    location: 'Train station ticket window',
    openingInstruction: 'Greet the traveller and ask where they are going.',
    contextVariants: [
      { id: 'normal', weight: 0.4, situation: 'Standard purchase, direct train available.', detail: 'One direct train in 40 minutes, return available.' },
      { id: 'sold_out', weight: 0.35, situation: 'Direct train is sold out. Connecting route available.', detail: 'Connection in another city, 20 minute layover. NPC presents as the only option.' },
      { id: 'strike', weight: 0.25, situation: 'Partial service disruption today.', detail: 'Trains running to a limited schedule. NPC explains alternatives: bus, taxi, next available train.' },
    ],
    vocabularyFocus: ['one-way', 'return', 'platform', 'departure', 'arrival', 'first class', 'reservation', 'connection'],
  },

  // ── SMALL TALK ──
  {
    id: 'meeting_neighbor',
    category: 'smalltalk',
    title: 'Meeting a Neighbor',
    description: 'Introduce yourself to a new neighbor.',
    npcRole: 'neighbor',
    namePool: ['Hannah', 'Olivier', 'Mia', 'Jan'],
    moodPool: ['warm and curious', 'reserved at first, opens up gradually', 'very chatty — you may need to excuse yourself'],
    userRole: 'A new resident meeting a neighbor for the first time',
    location: 'Building hallway or garden',
    openingInstruction: 'You notice the new resident in the hallway or garden and strike up a conversation.',
    contextVariants: [
      { id: 'casual', weight: 0.5, situation: 'Relaxed casual chat — weather, neighborhood, how long you have lived here.', detail: 'Neighbor is friendly, mentions a local café or park.' },
      { id: 'helpful', weight: 0.3, situation: 'Neighbor offers practical tips: bins, parking, local shops.', detail: 'Very practical conversation — NPC is the helpful type.' },
      { id: 'nosy', weight: 0.2, situation: 'Neighbor is curious — asks many personal questions.', detail: 'Job, relationship status, where you are from. User must navigate politely.' },
    ],
    vocabularyFocus: ['moved in', 'neighborhood', 'originally from', 'work nearby', 'quiet', 'friendly area'],
  },
  {
    id: 'party_conversation',
    category: 'smalltalk',
    title: 'At a Party',
    description: 'Meet someone new at a social gathering.',
    npcRole: 'fellow party guest',
    namePool: ['Alex', 'Nina', 'Tom', 'Isabelle'],
    moodPool: ['upbeat and social', 'slightly shy but responsive', 'very witty and playful'],
    userRole: 'A guest at a house party',
    location: 'House party — kitchen, living room, or garden',
    openingInstruction: 'You are standing nearby with a drink. Make eye contact and start a conversation naturally.',
    contextVariants: [
      { id: 'common_ground', weight: 0.4, situation: 'You both know the host — find common ground.', detail: 'NPC asks how you know the host, conversation flows from there.' },
      { id: 'different_worlds', weight: 0.35, situation: 'Very different backgrounds — interesting contrast conversation.', detail: 'NPC has a very different job or lifestyle — curious dynamic.' },
      { id: 'flirty', weight: 0.25, situation: 'Light flirtatious energy — playful, tasteful.', detail: 'NPC is clearly interested. Light compliments, playful teasing.' },
    ],
    vocabularyFocus: ['do you know', 'how long have you', 'what do you do', 'I love that', 'have you tried', 'we should'],
  },
  {
    id: 'waiting_in_line',
    category: 'smalltalk',
    title: 'Waiting in Line',
    description: 'Strike up a conversation while waiting.',
    npcRole: 'stranger in line',
    namePool: ['Peter', 'Marie', 'Sam', 'Claudia'],
    moodPool: ['bored and happy to chat', 'polite but busy on their phone', 'immediately warm — a natural talker'],
    userRole: 'Someone waiting in a long queue',
    location: 'Queue — post office, theme park, coffee shop',
    openingInstruction: 'You are standing nearby in the queue. The line is long. React to the situation or make an observation.',
    contextVariants: [
      { id: 'long_wait', weight: 0.5, situation: 'The queue is very long — shared frustration turns into conversation.', detail: 'Bonding over the wait, light complaints, humor.' },
      { id: 'local_knowledge', weight: 0.3, situation: 'NPC is a local — gives unsolicited but useful tips about the area.', detail: 'Recommends a better shop, a shortcut, a local secret.' },
      { id: 'shared_interest', weight: 0.2, situation: 'You are both waiting for the same event or product.', detail: 'Shared enthusiasm — conversation flows easily.' },
    ],
    vocabularyFocus: ['how long', 'always this busy', 'been here before', 'worth the wait', 'I usually', 'around here'],
  },
  {
    id: 'compliment_conversation',
    category: 'smalltalk',
    title: 'Giving a Compliment',
    description: 'Compliment someone and keep the conversation going.',
    npcRole: 'stranger or acquaintance',
    namePool: ['Julia', 'Marc', 'Tina', 'Florian'],
    moodPool: ['pleased and responsive', 'modest and deflecting', 'immediately curious about you in return'],
    userRole: 'Someone who wants to compliment a stranger and start a conversation',
    location: 'Café, park, or shop',
    openingInstruction: 'Wait for the user to initiate. React naturally to whatever compliment or opener they give.',
    contextVariants: [
      { id: 'item', weight: 0.4, situation: 'User compliments an item — bag, jacket, book.', detail: 'NPC explains where they got it, asks about user.' },
      { id: 'skill', weight: 0.35, situation: 'User compliments something they saw NPC doing — sketching, playing guitar.', detail: 'NPC is modest, shares a little about the hobby.' },
      { id: 'language', weight: 0.25, situation: "NPC compliments user's language ability — triggers meta-conversation about learning.", detail: 'Warm, encouraging, asks how long they have been learning.' },
    ],
    vocabularyFocus: ['I love your', 'where did you get', 'how long have you', 'that is beautiful', 'I noticed', 'you are very'],
  },

  // ── TRANSACTIONS ──
  {
    id: 'restaurant_order',
    category: 'transactions',
    title: 'Restaurant Order',
    description: 'Order food with a special request or allergy.',
    npcRole: 'waiter or waitress',
    namePool: ['Leo', 'Sophie', 'Nico', 'Amelie'],
    moodPool: ['attentive and professional', 'friendly and makes recommendations', 'busy — polite but efficient'],
    userRole: 'A diner at a restaurant',
    location: 'Restaurant table',
    openingInstruction: 'Welcome the guest, hand them the menu, and ask if they are ready to order or need a moment.',
    contextVariants: [
      { id: 'normal', weight: 0.3, situation: 'Normal order — two courses, no issues.', detail: 'Menu has standard options. NPC can describe dishes if asked.' },
      { id: 'allergy', weight: 0.35, situation: 'Guest has a nut allergy — needs to check every dish.', detail: 'NPC takes this seriously, checks with kitchen on two dishes.' },
      { id: 'special_request', weight: 0.35, situation: 'Guest wants a dish modified — no sauce, different side, vegetarian swap.', detail: 'Some modifications are possible, one is not. NPC explains.' },
    ],
    vocabularyFocus: ['I would like', 'what do you recommend', 'does this contain', 'without', 'instead of', 'medium rare', 'the bill'],
  },
  {
    id: 'shopping',
    category: 'transactions',
    title: 'Shopping',
    description: 'Find what you need in a shop. Size, color, availability.',
    npcRole: 'shop assistant',
    namePool: ['Laura', 'Ben', 'Chiara', 'Max'],
    moodPool: ['helpful and attentive', 'knowledgeable about the products', 'slightly pushy with upsells'],
    userRole: 'A customer in a clothing or electronics shop',
    location: 'Shop floor',
    openingInstruction: 'Approach the customer and ask if they need help finding anything.',
    contextVariants: [
      { id: 'size', weight: 0.4, situation: 'Customer looking for an item in a specific size — may not be in stock.', detail: 'Size is available in one color only, or NPC can order it.' },
      { id: 'comparison', weight: 0.35, situation: 'Customer comparing two products — needs advice.', detail: 'NPC explains differences, asks about use case to recommend.' },
      { id: 'out_of_stock', weight: 0.25, situation: 'Item is out of stock. NPC offers alternatives or to check other branches.', detail: 'Similar product available at different price point.' },
    ],
    vocabularyFocus: ['do you have', 'in my size', 'how much is', 'can I try', 'difference between', 'I prefer', 'I will take it'],
  },
  {
    id: 'returning_item',
    category: 'transactions',
    title: 'Returning an Item',
    description: 'Return a purchase. Explain the problem, get a refund.',
    npcRole: 'customer service representative',
    namePool: ['Sandra', 'Kevin', 'Petra', 'James'],
    moodPool: ['by the book but fair', 'empathetic and solution-focused', 'slightly sceptical — follows policy strictly'],
    userRole: 'A customer returning a defective or unwanted item',
    location: 'Shop customer service desk',
    openingInstruction: 'Greet the customer and ask how you can help.',
    contextVariants: [
      { id: 'defective', weight: 0.4, situation: 'Item is defective — stopped working after two days.', detail: 'Within return window. Full refund or replacement offered.' },
      { id: 'changed_mind', weight: 0.35, situation: 'Customer changed their mind — no fault with item.', detail: 'Store policy: exchange or credit note only, no cash refund.' },
      { id: 'no_receipt', weight: 0.25, situation: 'Customer has no receipt. Item still has tags.', detail: 'NPC can look up the purchase with a loyalty card or bank statement.' },
    ],
    vocabularyFocus: ['refund', 'exchange', 'receipt', 'defective', 'warranty', 'policy', 'credit note', 'manager'],
  },
  {
    id: 'market_bargaining',
    category: 'transactions',
    title: 'Market Bargaining',
    description: 'Negotiate a price at a market stall.',
    npcRole: 'market stall vendor',
    namePool: ['Ahmed', 'Rosa', 'Yann', 'Fatou'],
    moodPool: ['seasoned negotiator — enjoys the back and forth', 'friendly but firm on price', 'very animated and theatrical'],
    userRole: 'A shopper at an open-air market',
    location: 'Open-air market stall',
    openingInstruction: 'Welcome the shopper and gesture at your goods enthusiastically.',
    contextVariants: [
      { id: 'standard', weight: 0.4, situation: 'Normal bargaining — 20-30% negotiation expected.', detail: 'Vendor starts high, will come down with the right approach.' },
      { id: 'bulk', weight: 0.35, situation: 'Customer wants multiple items — vendor offers bundle deal.', detail: 'Three items for the price of two if customer buys all three.' },
      { id: 'firm', weight: 0.25, situation: 'Vendor is firm on price — quality justification given.', detail: 'This is genuinely handmade or rare. Vendor will not go below a point.' },
    ],
    vocabularyFocus: ['how much', 'too expensive', 'best price', 'I will give you', 'deal', 'handmade', 'I will take'],
  },

  // ── ROMANCE ──
  {
    id: 'cafe_first_meeting',
    category: 'romance',
    title: 'First Meeting at a Café',
    description: 'Meet someone interesting. See where it goes.',
    npcRole: 'stranger at a café',
    namePool: ['Elise', 'Luca', 'Anna', 'Julien'],
    moodPool: ['warm and curious', 'playful and slightly flirtatious', 'a little shy but clearly interested'],
    userRole: 'A café customer who notices someone interesting',
    location: 'Café — shared table or counter seats',
    openingInstruction: 'You are already sitting or standing nearby. React naturally when the user initiates conversation, or make a gentle opening yourself if they hesitate.',
    contextVariants: [
      { id: 'book', weight: 0.35, situation: 'NPC is reading a book — user comments on it.', detail: 'Great conversation starter — NPC loves talking about it.' },
      { id: 'spilled', weight: 0.3, situation: 'A small accident — spilled coffee or bumped into each other — breaks the ice.', detail: 'NPC reacts warmly, laughs it off, conversation flows.' },
      { id: 'recommendation', weight: 0.35, situation: 'User asks NPC for a recommendation from the menu.', detail: 'NPC is a regular, happy to advise, conversation extends.' },
    ],
    vocabularyFocus: ['excuse me', 'do you come here often', 'what are you reading', 'I love that', 'can I ask', 'by the way my name is'],
  },
  {
    id: 'coffee_date',
    category: 'romance',
    title: 'Coffee Date',
    description: 'You are on a first date. Keep the conversation flowing.',
    npcRole: 'date',
    namePool: ['Mia', 'Felix', 'Léa', 'Daniel'],
    moodPool: ['excited and a little nervous', 'confident and charming', 'easy-going and funny'],
    userRole: 'Someone on a first coffee date',
    location: 'Café table, just the two of you',
    openingInstruction: 'You are already seated. Greet the user warmly as if you have just met in person for the first time.',
    contextVariants: [
      { id: 'going_well', weight: 0.5, situation: 'Date is going well — good energy, easy conversation.', detail: 'NPC is engaged, asks follow-up questions, shares things about themselves.' },
      { id: 'awkward_silence', weight: 0.3, situation: 'Awkward silence — NPC is slightly nervous.', detail: 'User must rescue the conversation. NPC responds well once re-engaged.' },
      { id: 'surprising', weight: 0.2, situation: 'NPC reveals something surprising — hobby, passion, unusual fact.', detail: 'Good conversation pivot — user reacts and engages.' },
    ],
    vocabularyFocus: ['tell me about', 'what do you do', 'I love', 'have you ever', 'what kind of', 'I would love to', 'maybe we could'],
  },
  {
    id: 'phone_date',
    category: 'romance',
    title: 'Confirming Plans',
    description: 'Call someone to confirm or arrange your next meeting.',
    npcRole: 'someone you have been seeing',
    namePool: ['Sophie', 'Marco', 'Laura', 'Thomas'],
    moodPool: ['happy to hear from you', 'slightly distracted — multitasking', 'playful and teasing'],
    userRole: 'Someone calling to confirm plans',
    location: 'Phone call',
    openingInstruction: 'Answer the phone warmly.',
    contextVariants: [
      { id: 'confirm', weight: 0.4, situation: 'Plans are confirmed — discuss logistics, share excitement.', detail: 'Time, place, what to wear — light and fun conversation.' },
      { id: 'reschedule', weight: 0.35, situation: 'NPC needs to reschedule — something came up. Apologetic.', detail: 'Not a rejection — genuinely wants to reschedule. User navigates.' },
      { id: 'change_plans', weight: 0.25, situation: 'NPC suggests changing the plan — different location or activity.', detail: 'Better restaurant found, weather change — suggests adaptation.' },
    ],
    vocabularyFocus: ['just calling to', 'are we still', 'where exactly', 'what time', 'looking forward', 'see you then'],
  },
  {
    id: 'misunderstanding',
    category: 'romance',
    title: 'Clearing Up a Misunderstanding',
    description: 'Something was taken the wrong way. Clear the air.',
    npcRole: 'partner or date',
    namePool: ['Emma', 'Jonas', 'Chiara', 'Louis'],
    moodPool: ['quietly hurt but open to talking', 'a little defensive at first, then understanding', 'calm — wants to resolve it'],
    userRole: 'Someone who needs to explain or apologize',
    location: 'Living room, café, or phone call',
    openingInstruction: 'You are slightly withdrawn. Wait for the user to bring up the issue.',
    contextVariants: [
      { id: 'late', weight: 0.35, situation: 'User was late without messaging. NPC worried.', detail: 'Not angry — just wanted to know. Easy to resolve with explanation.' },
      { id: 'comment', weight: 0.35, situation: 'A comment was misread as negative.', detail: 'NPC explains how it felt. User clarifies intent.' },
      { id: 'forgot', weight: 0.3, situation: 'User forgot something important — birthday, plan, promise.', detail: 'NPC is disappointed but not dramatic. Genuine apology resolves it.' },
    ],
    vocabularyFocus: ['I am sorry', 'I did not mean to', 'what I meant was', 'I understand why', 'it will not happen again', 'are we okay'],
  },

  // ── WORK ──
  {
    id: 'job_interview',
    category: 'work',
    title: 'Job Interview',
    description: 'First 5 minutes of a job interview. Make an impression.',
    npcRole: 'interviewer / HR manager',
    namePool: ['Dr. Weber', 'Ms. Dubois', 'Mr. Singh', 'Ms. Eriksson'],
    moodPool: ['professional and attentive', 'warm — wants you to succeed', 'efficient — moves through questions quickly'],
    userRole: 'A job applicant in an interview',
    location: 'Office meeting room or video call',
    openingInstruction: 'Welcome the applicant and begin with a brief introduction of the role before asking them to introduce themselves.',
    contextVariants: [
      { id: 'relaxed', weight: 0.4, situation: 'Relaxed atmosphere — interviewer is supportive.', detail: 'Conversational style, open questions, encourages elaboration.' },
      { id: 'formal', weight: 0.35, situation: 'Formal structured interview — specific questions, takes notes.', detail: 'Competency-based questions: "Tell me about a time when..."' },
      { id: 'tough', weight: 0.25, situation: 'Interviewer asks a difficult question to test composure.', detail: '"What is your biggest weakness?" or a curveball scenario question.' },
    ],
    vocabularyFocus: ['my experience', 'I am responsible for', 'I am good at', 'I am looking for', 'my strength is', 'in my previous role'],
  },
  {
    id: 'new_colleague',
    category: 'work',
    title: 'Meeting a New Colleague',
    description: 'First day. Introduce yourself to a teammate.',
    npcRole: 'colleague',
    namePool: ['Sarah', 'Markus', 'Céline', 'Raj'],
    moodPool: ['welcoming and helpful', 'curious — asks many questions', 'busy but friendly — quick chat'],
    userRole: 'A new employee on their first day',
    location: 'Office kitchen, desk area, or meeting room',
    openingInstruction: 'Notice the new employee and introduce yourself.',
    contextVariants: [
      { id: 'welcoming', weight: 0.5, situation: 'Warm welcome — colleague offers to show you around.', detail: 'NPC introduces office layout, culture, who does what.' },
      { id: 'curious', weight: 0.3, situation: 'Colleague is curious about your background.', detail: 'Where you worked before, what you will be doing, why you joined.' },
      { id: 'busy', weight: 0.2, situation: 'Colleague is clearly busy but takes 5 minutes to be polite.', detail: 'Short focused chat — user must be concise and read social cues.' },
    ],
    vocabularyFocus: ['nice to meet you', 'I just started', 'I will be working on', 'who should I talk to', 'do you know where', 'let me know if'],
  },
  {
    id: 'time_off_request',
    category: 'work',
    title: 'Asking for Time Off',
    description: 'Ask your boss for a day off. Navigate the conversation.',
    npcRole: 'direct manager',
    namePool: ['Mr. Bauer', 'Ms. Martin', 'Dr. Rossi', 'Ms. Clarke'],
    moodPool: ['reasonable — open to it if timing works', 'cautious — busy period coming up', 'supportive but asks for a plan'],
    userRole: 'An employee requesting time off',
    location: "Manager's office or quick hallway conversation",
    openingInstruction: 'You are at your desk or in a brief meeting. Wait for the employee to bring up the request.',
    contextVariants: [
      { id: 'approved', weight: 0.4, situation: 'Request is approved after brief discussion.', detail: 'Manager asks who will cover, notes it in the calendar.' },
      { id: 'bad_timing', weight: 0.35, situation: 'Timing is difficult — big deadline that week.', detail: 'Manager asks if different dates are possible, or what can be rearranged.' },
      { id: 'more_notice', weight: 0.25, situation: 'Manager asks for more notice in future — this time it works.', detail: 'Mild feedback delivered professionally. Approved but noted.' },
    ],
    vocabularyFocus: ['I was wondering', 'would it be possible', 'I have already', 'I can arrange', 'of course I understand', 'I appreciate'],
  },
  {
    id: 'pitch_idea',
    category: 'work',
    title: 'Pitching an Idea',
    description: 'Propose a new idea to a colleague or manager.',
    npcRole: 'colleague or team lead',
    namePool: ['Andrea', 'Philippe', 'Marta', 'Oliver'],
    moodPool: ['interested and asks good questions', 'sceptical but fair — needs convincing', 'enthusiastic and builds on the idea'],
    userRole: 'An employee presenting a new idea',
    location: 'Meeting room or shared workspace',
    openingInstruction: 'You are in a brief informal meeting. Ask the user what they wanted to discuss.',
    contextVariants: [
      { id: 'receptive', weight: 0.4, situation: 'Colleague likes the idea, asks implementation questions.', detail: 'Practical questions: timeline, cost, who would be involved.' },
      { id: 'sceptical', weight: 0.35, situation: 'Colleague raises valid objections.', detail: '"We tried something similar before." User must address objections.' },
      { id: 'enthusiastic', weight: 0.25, situation: 'Colleague loves it and starts adding to it.', detail: 'Fast-moving conversation — user must keep up and build on ideas together.' },
    ],
    vocabularyFocus: ['I have been thinking', 'what if we', 'the benefit would be', 'I understand your concern', 'it could also', 'what do you think'],
  },

  // ── EMERGENCY ──
  {
    id: 'doctor_visit',
    category: 'emergency',
    title: 'Describing Symptoms',
    description: 'Tell a doctor what is wrong. Get a diagnosis or advice.',
    npcRole: 'general practitioner / doctor',
    namePool: ['Dr. Braun', 'Dr. Fontaine', 'Dr. Nakamura', 'Dr. Osei'],
    moodPool: ['calm and methodical', 'warm and reassuring', 'efficient — asks targeted questions'],
    userRole: "A patient at a doctor's appointment",
    location: "Doctor's office",
    openingInstruction: 'Welcome the patient and ask what brings them in today.',
    contextVariants: [
      { id: 'simple', weight: 0.4, situation: 'Minor illness — cold, sore throat. Straightforward consultation.', detail: 'Doctor asks duration, severity, other symptoms. Prescribes rest + medicine.' },
      { id: 'unclear', weight: 0.35, situation: 'Symptoms are unclear — doctor asks many follow-up questions.', detail: 'Could be several things. Doctor orders a test or refers to specialist.' },
      { id: 'chronic', weight: 0.25, situation: 'Patient mentions an ongoing issue — has not been to doctor in a while.', detail: 'Doctor asks why they waited, takes thorough history.' },
    ],
    vocabularyFocus: ['I have been feeling', 'it started', 'it hurts when', 'I have a temperature', 'for about', 'on the right/left side', 'worse at night'],
  },
  {
    id: 'lost_wallet',
    category: 'emergency',
    title: 'Lost Wallet',
    description: 'Report your lost wallet and get help.',
    npcRole: 'hotel concierge or police officer',
    namePool: ['Officer Becker', 'Officer Petit', 'Ms. Hartmann', 'Mr. Kovacs'],
    moodPool: ['professional and process-oriented', 'sympathetic but follows procedure', 'calm — has seen this many times, very efficient'],
    userRole: 'A traveller who has lost their wallet',
    location: 'Hotel lobby or police station reception',
    openingInstruction: 'Greet the distressed traveller and ask what happened.',
    contextVariants: [
      { id: 'hotel', weight: 0.5, situation: 'Wallet lost in or near the hotel. Concierge helps.', detail: 'Concierge calls lost property, restaurant, taxi company. Very helpful.' },
      { id: 'police', weight: 0.5, situation: 'Formal police report for insurance purposes.', detail: 'Officer takes statement — when, where, what was in wallet. Gives report number.' },
    ],
    vocabularyFocus: ['I lost my wallet', 'I am not sure where', 'it had', 'could you help', 'what should I do', 'do I need to', 'report number'],
  },
  {
    id: 'missed_train',
    category: 'emergency',
    title: 'Missed Train',
    description: 'You missed your connection. Figure out what to do.',
    npcRole: 'station information agent',
    namePool: ['Agent Müller', 'Agent Dupont', 'Agent Rossi', 'Agent Walsh'],
    moodPool: ['problem-solving and calm', 'empathetic — this happens often', 'efficient — knows all the options'],
    userRole: 'A traveller who just missed their connecting train',
    location: 'Train station information desk',
    openingInstruction: 'Notice the stressed traveller approaching and ask how you can help.',
    contextVariants: [
      { id: 'next_train', weight: 0.4, situation: 'Next train to same destination in 45 minutes.', detail: 'Seat reservation must be changed. Agent helps rebook.' },
      { id: 'different_route', weight: 0.35, situation: 'No direct train — alternative route via different city.', detail: 'Longer journey but gets there today. Agent explains options.' },
      { id: 'overnight', weight: 0.25, situation: 'No more trains today. Traveller needs accommodation.', detail: 'Agent provides hotel voucher (if delay was train fault) or directs to options.' },
    ],
    vocabularyFocus: ['I missed my connection', 'what are my options', 'the next train', 'can you rebook', 'will I make it', 'is there compensation'],
  },
]

export const SCENARIO_CATEGORIES: { id: ScenarioCategory; label: string; emoji: string }[] = [
  { id: 'survival', label: 'Survival & Travel', emoji: '✈️' },
  { id: 'smalltalk', label: 'Small Talk', emoji: '💬' },
  { id: 'transactions', label: 'Transactions', emoji: '🛍️' },
  { id: 'romance', label: 'Romance & Dating', emoji: '❤️' },
  { id: 'work', label: 'Work & Professional', emoji: '💼' },
  { id: 'emergency', label: 'Emergency', emoji: '🆘' },
]

/** Draw N random scenarios from a category (pure random). */
export function drawScenes(category: ScenarioCategory, count = 3): RoleplayScenario[] {
  const pool = ROLEPLAY_SCENARIOS.filter((s) => s.category === category)
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(count, pool.length))
}

/** Pick a random context variant using weighted probability. */
export function pickContextVariant(scenario: RoleplayScenario): ContextVariant {
  const rand = Math.random()
  let cumulative = 0
  for (const variant of scenario.contextVariants) {
    cumulative += variant.weight
    if (rand <= cumulative) return variant
  }
  return scenario.contextVariants[scenario.contextVariants.length - 1]
}

export function pickNpcName(scenario: RoleplayScenario): string {
  return scenario.namePool[Math.floor(Math.random() * scenario.namePool.length)]
}

export function pickNpcMood(scenario: RoleplayScenario): string {
  return scenario.moodPool[Math.floor(Math.random() * scenario.moodPool.length)]
}

/** Compile a roleplay scenario into a system prompt for the LLM. */
export function compileScenarioPrompt(
  scenario: RoleplayScenario,
  npcName: string,
  mood: string,
  variant: ContextVariant,
): string {
  return `You are ${npcName}, a ${scenario.npcRole}.
Your mood and manner: ${mood}.
Location: ${scenario.location}.
The situation: ${variant.situation}
Additional context (do not reveal unless relevant): ${variant.detail}
The user's role: ${scenario.userRole}.
${scenario.openingInstruction}
Vocabulary to weave in naturally when appropriate: ${scenario.vocabularyFocus.join(', ')}.`
}
