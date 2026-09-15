export type Moment = {
  time: string;
  title: string;
  incoming: string;
  handled: string;
  detail: string;
  agent: string;
  icon: 'brief' | 'message' | 'star' | 'phone' | 'search' | 'receipt' | 'chart' | 'package';
};

// Illustrative story moments from the approved OCA narrative. Not a live feed.
export const moments: Moment[] = [
  { time: '07:00', title: 'Your brief is ready before you are.', incoming: 'What needs my attention today?', handled: 'Daily brief sent.', detail: 'Open jobs, exceptions, what to decide. One screen.', agent: 'Omar', icon: 'brief' },
  { time: '09:38', title: 'A WhatsApp becomes a booking.', incoming: 'Can I book Mochi for Saturday?', handled: 'Saturday 10:00, booked.', detail: 'Calendar updated. Deposit link sent. Reminder queued.', agent: 'Hermes', icon: 'message' },
  { time: '11:24', title: 'A five-star review gets a reply.', incoming: 'New Google review just landed.', handled: 'Reply drafted in your voice.', detail: 'Held for your approval. Nothing posts without you.', agent: 'Mira', icon: 'star' },
  { time: '13:47', title: 'A missed call is not a lost customer.', incoming: 'Missed call from a new number.', handled: 'Follow-up sent. Conversation open.', detail: 'They answered. The booking is in.', agent: 'Hermes', icon: 'phone' },
  { time: '15:05', title: 'Market research, minus the rabbit hole.', incoming: 'What changed with our competitors?', handled: 'Summary ready.', detail: 'Findings for your decision. No decisions made for you.', agent: 'Noor', icon: 'search' },
  { time: '16:12', title: 'A deposit gets chased. Politely.', incoming: 'Deposit still outstanding.', handled: 'Reminder sent.', detail: 'Payment status checked. Exceptions flagged to you.', agent: 'Clara', icon: 'receipt' },
  { time: '18:00', title: 'Your weekly recap writes itself.', incoming: 'How did this week perform?', handled: 'Recap prepared.', detail: 'Next steps drafted. You approve, it moves.', agent: 'Mira', icon: 'chart' },
  { time: '02:00', title: 'Stock checked while you sleep.', incoming: 'Nightly Shopify scan.', handled: 'Low stock flagged.', detail: 'No reorder without your approval.', agent: 'Omar', icon: 'package' },
];

// Industry switch. Everything here is an illustrative example for that trade, not a claim about a client.
export type Industry = {
  id: string;
  label: string;
  business: string; // demo business name, always marked as a demo
  headline: [string, string, string, string];
  point: string;
  booking: { incoming: string; handled: string; detail: string; scenario: string; steps: [string, string, string]; result: string };
  approval: { message: string; draft: string; rule: string };
  job: string; // what one booked job is called
  jobValue: number; // default average job value for the calculator, AED
  demo: { greeting: string; booking: string; slot: string; price: string; hours: string; where: string };
};

export const industries: Industry[] = [
  {
    id: 'clinic', label: 'Clinic', business: 'Demo Dental Clinic',
    headline: ['Your WhatsApp answered.', 'Appointments booked.', 'Reminders sent.', 'While you treat patients.'],
    point: 'Books appointments and sends reminders that cut no-shows',
    booking: { incoming: 'Can I get a cleaning on Saturday?', handled: 'Saturday 10:00, booked.', detail: 'Calendar updated. Reminder queued. Insurance questions go to the desk.', scenario: 'Can I book a cleaning for Saturday morning?', steps: ['Reads the request', 'Checks Saturday availability', 'Confirms 10:00 and sends the reminder'], result: 'Booked. Calendar updated. Reminder queued.' },
    approval: { message: 'I had pain after yesterday’s filling. What should I do?', draft: 'I am sorry to hear that. A dentist will call you today to check on it.', rule: 'Medical questions: wait for a clinician' },
    job: 'appointment', jobValue: 350,
    demo: { greeting: 'Hello, this is the Demo Dental Clinic front desk. I can book a check-up or cleaning, share our hours or our location. What do you need?', booking: 'Happy to book that. Which day works for you? We have mornings on Saturday and afternoons on Tuesday.', slot: 'Booked: Saturday 10:00 for a cleaning. You will get a reminder the day before. Anything else?', price: 'In this demo, a check-up is AED 250 and a cleaning is AED 350. Want me to book one?', hours: 'We are open Saturday to Thursday, 09:00 to 20:00. Fridays we are closed.', where: 'The clinic is in Dubai. I can send the map pin on WhatsApp once you book.' },
  },
  {
    id: 'salon', label: 'Salon', business: 'Demo Salon',
    headline: ['Your WhatsApp answered.', 'Chairs booked.', 'Deposits chased.', 'While you work.'],
    point: 'Fills chairs and takes deposits so late cancellations stop costing you',
    booking: { incoming: 'Can I book a blow-dry for Saturday?', handled: 'Saturday 10:00, booked.', detail: 'Calendar updated. Deposit link sent. Reminder queued.', scenario: 'Can I book a colour and cut for Saturday morning?', steps: ['Reads the request', 'Checks Saturday availability', 'Confirms 10:00 and sends the deposit link'], result: 'Booked. Calendar updated. Reminder queued.' },
    approval: { message: 'The colour is not what I asked for. I want my money back.', draft: 'I am sorry. The owner will look at this today and come back to you with the right solution.', rule: 'Refunds: wait for the owner' },
    job: 'booking', jobValue: 300,
    demo: { greeting: 'Hi, this is the Demo Salon front desk. I can book a cut, colour or blow-dry, share prices, hours or where we are. What would you like?', booking: 'Of course. Which day and time suit you? Saturday morning has space.', slot: 'Booked: Saturday 10:00. A AED 50 deposit link is on its way, and you will get a reminder the day before.', price: 'In this demo, a cut is AED 150, colour from AED 350 and a blow-dry AED 120. Shall I book one?', hours: 'We are open every day, 10:00 to 22:00.', where: 'We are in Dubai. I will send the location pin when your booking is confirmed.' },
  },
  {
    id: 'pet', label: 'Pet care', business: 'Demo Pet Grooming',
    headline: ['Your WhatsApp answered.', 'Grooms booked.', 'Deposits chased.', 'While you work.'],
    point: 'Books grooms, answers pet questions and collects the deposit',
    booking: { incoming: 'Can I book Mochi for Saturday?', handled: 'Saturday 10:00, booked.', detail: 'Calendar updated. Deposit link sent. Reminder queued.', scenario: 'Can I book a groom for Saturday morning?', steps: ['Reads the request', 'Checks Saturday availability', 'Confirms 10:00 and sends the deposit link'], result: 'Booked. Calendar updated. Reminder queued.' },
    approval: { message: 'I want a refund for yesterday’s groom. It felt rushed.', draft: 'I am sorry to hear that. Our team will look into it today and come back to you with the right solution.', rule: 'Refund above AED 200: waits for you' },
    job: 'groom', jobValue: 180,
    demo: { greeting: 'Hi, this is the Demo Pet Grooming front desk. I can book a groom, share prices, hours or our location. How can I help?', booking: 'Sure. Which day works, and what is your pet’s name and breed? Saturday morning is open.', slot: 'Booked: Saturday 10:00. A AED 50 deposit link is on its way and you will get a reminder the day before.', price: 'In this demo, a full groom is AED 180 for small breeds and AED 260 for large. Want me to book one?', hours: 'We are open Saturday to Thursday, 09:00 to 19:00.', where: 'We are in Abu Dhabi. I will send the map pin with your booking confirmation.' },
  },
  {
    id: 'workshop', label: 'Workshop', business: 'Demo Auto Workshop',
    headline: ['Your WhatsApp answered.', 'Cars booked in.', 'Quotes followed up.', 'While you fix cars.'],
    point: 'Books cars in, sends quotes and follows up so jobs do not go cold',
    booking: { incoming: 'Can I bring the car in on Saturday?', handled: 'Saturday 10:00, booked.', detail: 'Bay reserved. Quote sent. Reminder queued.', scenario: 'Can I book a service for Saturday morning?', steps: ['Reads the request', 'Checks Saturday bay availability', 'Confirms 10:00 and sends the quote'], result: 'Booked. Bay reserved. Reminder queued.' },
    approval: { message: 'The noise is back two days after the repair. This is not acceptable.', draft: 'I am sorry. The workshop manager will call you today and arrange a re-check at no charge to assess it.', rule: 'Complaints about work done: wait for the manager' },
    job: 'job', jobValue: 900,
    demo: { greeting: 'Hello, this is the Demo Auto Workshop front desk. I can book your car in, give a quote for a standard service, or share our hours and location. What do you need?', booking: 'No problem. Which day works and what is the car? Saturday morning has a bay free.', slot: 'Booked: Saturday 10:00, bay reserved. You will get a reminder the day before. Anything else?', price: 'In this demo, a minor service is AED 450 and a major service AED 900. Brakes and tyres are quoted after inspection. Want to book?', hours: 'We are open Saturday to Thursday, 08:00 to 19:00.', where: 'We are in Dubai. I will send the location pin with your booking.' },
  },
  {
    id: 'realestate', label: 'Real estate', business: 'Demo Property Brokers',
    headline: ['Your WhatsApp answered.', 'Viewings booked.', 'Leads followed up.', 'While you close.'],
    point: 'Qualifies leads, books viewings and follows up until you close',
    booking: { incoming: 'Can I view the 2-bed on Saturday?', handled: 'Saturday 10:00, viewing booked.', detail: 'Agent calendar updated. Lead qualified. Reminder queued.', scenario: 'Can I view the two-bedroom on Saturday morning?', steps: ['Reads the request', 'Qualifies budget and timing', 'Confirms 10:00 with the agent'], result: 'Viewing booked. Lead in the CRM. Reminder queued.' },
    approval: { message: 'Can you do the rent for 10% less if I sign today?', draft: 'Thank you for the offer. The agent will confirm what is possible with the landlord and come back to you today.', rule: 'Price negotiation: wait for the agent' },
    job: 'viewing', jobValue: 2500,
    demo: { greeting: 'Hi, this is the Demo Property Brokers front desk. I can book a viewing, share what is available or our hours. What are you looking for?', booking: 'Glad to help. Which property and day work for you? Saturday morning viewings are open.', slot: 'Booked: Saturday 10:00 viewing with the agent. You will get a reminder the day before. Anything else?', price: 'Rents and prices depend on the unit. Tell me the area and bedrooms and I will send the current options in this demo.', hours: 'The office is open Monday to Saturday, 09:00 to 18:00. WhatsApp is answered around the clock.', where: 'We are in Dubai. I will send the exact office pin with your viewing confirmation.' },
  },
];

export const employees = [
  { name: 'Hermes', role: 'Front desk', tasks: ['Replies on WhatsApp in seconds', 'Books jobs and sends deposit links', 'Recovers missed calls'], tools: 'WhatsApp, Calendar, CRM', rule: 'Sensitive cases go to you.' },
  { name: 'Clara', role: 'Finance follow-up', tasks: ['Chases deposits and invoices', 'Tracks payment status', 'Sends a cash summary'], tools: 'Stripe, WhatsApp, Sheets', rule: 'Refunds and discounts need your sign-off.' },
  { name: 'Mira', role: 'Marketing', tasks: ['Replies to reviews in your voice', 'Checks campaigns and content', 'Prepares the weekly recap'], tools: 'Meta, Google, Instagram', rule: 'Nothing publishes without your approval.' },
  { name: 'Noor', role: 'Research', tasks: ['Watches competitors and suppliers', 'Digests customer feedback', 'Summarises market changes'], tools: 'Web, Sheets, Email', rule: 'Findings only. No decisions.' },
  { name: 'Omar', role: 'Operations', tasks: ['Keeps bookings and schedules straight', 'Flags low stock', 'Sends the daily brief'], tools: 'Shopify, Calendar, Slack', rule: 'Reorders above AED 2,000 wait for you.' },
  { name: 'Dana', role: 'Sales', tasks: ['Qualifies new leads', 'Prepares quotes and follow-ups', 'Tracks every open opportunity'], tools: 'WhatsApp, CRM, Calendar', rule: 'Custom pricing goes to a person.' },
];

export const scenarios = [
  { label: 'Booking', input: 'Can I book a groom for Saturday morning?', person: 'Hermes', steps: ['Reads the request', 'Checks Saturday availability', 'Confirms 10:00 and sends the deposit link'], result: 'Booked. Calendar updated. Reminder queued.', branch: 0 },
  { label: 'Quote', input: 'Can you send me a quote for a monthly plan?', person: 'Dana', steps: ['Qualifies the lead', 'Prepares a scoped quote', 'Schedules the follow-up'], result: 'Quote sent. Follow-up scheduled.', branch: 1 },
  { label: 'Review', input: 'New five-star Google review just came in.', person: 'Mira', steps: ['Reads the review', 'Drafts a reply in your voice', 'Holds it for your approval'], result: 'Reply drafted. Waiting for your OK.', branch: 2 },
];

export const buildSteps = [
  ['Learn', 'Your work, your bottlenecks, your tools.'],
  ['Build', 'One AI employee, built for one real job.'],
  ['Train', 'Your voice. Your rules. Your escalations.'],
  ['Launch', 'Tested with your team before it goes live.'],
  ['Run', 'Monitored and operated by OCA, daily.'],
  ['Improve', 'Reviewed and improved every month.'],
] as const;

export const why = [
  ['We run it after launch.', 'Monitoring, fixes and monthly improvements are included. You never babysit it.'],
  ['Your tools stay your tools.', 'WhatsApp, calendar, payments and CRM you already use. Nothing to migrate.'],
  ['Built in the UAE, for the UAE.', 'WhatsApp-first, Arabic and English, a team you can call.'],
] as const;

// Chatbot vs AI employee vs receptionist. Only what each one does, no invented figures.
export type CompareCell = 'yes' | 'no' | 'part';
export const compareRows: [string, CompareCell, CompareCell, CompareCell, string?][] = [
  ['Answers WhatsApp at 2 am', 'yes', 'yes', 'no'],
  ['Books straight into your calendar', 'part', 'yes', 'yes', 'Most chatbots only collect a request'],
  ['Sends the deposit link and chases it', 'no', 'yes', 'part'],
  ['Recovers missed calls with a follow-up', 'no', 'yes', 'part'],
  ['Knows when to hand a case to a person', 'no', 'yes', 'yes'],
  ['Follows your written rules every time', 'part', 'yes', 'part'],
  ['Someone else keeps it running after launch', 'no', 'yes', 'no', 'OCA monitors and improves it monthly'],
  ['Takes leave, sick days or a second job', 'no', 'no', 'yes'],
];
export const compareCols = ['Chatbot', 'AI employee by OCA', 'Receptionist'];

export const faqs = [
  ['Is this just a chatbot?', 'No. A chatbot answers questions. An AI employee finishes the job: reply, booking, deposit link, reminder, report. A person steps in where judgment is needed.'],
  ['What happens when it gets something wrong?', 'It is built with clear rules. Refunds, complaints, medical, legal or financial questions and anything unclear go to a person. We monitor every day and fix what needs fixing.'],
  ['Do I need to learn AI or manage it?', 'No. OCA builds it, trains it and runs it. You approve, we operate.'],
  ['Will it work with our tools?', 'We scope around the tools and accounts you already use. Discovery confirms what connects before we build anything.'],
  ['What does the monthly fee cover?', 'Daily operation, monitoring, fixes, reporting and monthly improvements. The amount is agreed with the scope before launch.'],
] as const;

export const systems = ['Front desk', 'Sales', 'Content', 'Operations'];

// Search index for the on-page search. Ids must match section ids.
export const searchIndex = [
  { id: 'hero', title: 'Your front desk, answered in seconds', text: 'managed AI employees UAE WhatsApp bookings deposits clinic salon pet care workshop real estate' },
  { id: 'day', title: 'A day, handled', text: 'daily brief booking review missed call research deposit recap stock' },
  { id: 'workforce', title: 'The employees', text: 'Hermes Clara Mira Noor Omar Dana front desk finance marketing research operations sales' },
  { id: 'circuit', title: 'How Hermes routes a message', text: 'booking quote review orchestrator specialist' },
  { id: 'demo', title: 'Try the front desk', text: 'demo chat try message booking hours price refund' },
  { id: 'managed', title: 'We build it. We run it.', text: 'learn build train launch run improve managed service' },
  { id: 'human', title: 'You keep the final say', text: 'approval refund escalation human control rules' },
  { id: 'proof', title: 'Abu Dhabi pet-care front desk', text: 'proof example WhatsApp deposits calm thread' },
  { id: 'why', title: 'Why OCA', text: 'after launch tools UAE Arabic English' },
  { id: 'compare', title: 'Chatbot, AI employee or receptionist', text: 'compare comparison chatbot receptionist table' },
  { id: 'calc', title: 'What unanswered calls cost', text: 'calculator missed calls revenue value estimate' },
  { id: 'pricing', title: 'Pricing: AED 15,000 build', text: 'price monthly fee scope ownership' },
  { id: 'faq', title: 'Questions', text: faqs.map((f) => f[0]).join(' ') },
  { id: 'contact', title: 'Book a call', text: 'contact phone booking calendly lead whatsapp number' },
];
