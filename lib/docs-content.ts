export interface DocFeature {
  title: string;
  purpose: string;
  steps: string[];
  useCase: string;
  tips?: string[];
}

export interface DocCategory {
  id: string;
  title: string;
  intro?: string;
  features: DocFeature[];
}

export const DOC_CATEGORIES: DocCategory[] = [
  {
    id: 'getting-started',
    title: 'Getting Started — The Core Flow',
    intro:
      'Trimurti TMS follows the same order every Indian transport company already works in: set up your master data once, then book, move, bill, and collect for every shipment. Everything else in the system (compliance, fleet costs, reports) hangs off this core flow.',
    features: [
      {
        title: 'The end-to-end shipment flow',
        purpose: 'Understand how one shipment moves through the system from booking to payment.',
        steps: [
          'Set up masters once: Consignors, Consignees, Drivers, Vehicles, Cities, Routes, Freight Rates.',
          '1. Book the shipment: create an L.R. (Lorry Receipt) under Daily Entry > L.R. Entry.',
          '2. Load the truck: group one or more L.R.s onto a Challan for a specific vehicle/driver/trip.',
          '3. Bill the customer: raise an Invoice against the consignor, referencing the L.R.(s).',
          '4. Collect payment: record a Receipt (or On Account Receipt) against the invoice.',
          '5. Track delivery proof: upload the signed POD once goods are delivered.',
          '6. Review: use Reports & Analytics, the Dashboard, and Accounts to see how the business is doing.',
        ],
        useCase:
          'A Mumbai-based transporter books an L.R. for a consignor shipping textiles to a Surat consignee, loads it onto a challan with an available truck, invoices the consignor at month-end along with other L.R.s for the same party, and records the payment receipt when the customer pays via bank transfer.',
        tips: [
          'You do not have to complete every step immediately — L.R.s can sit unbilled until month-end, and invoices can be collected in the next billing cycle.',
          'The Dashboard and Reports pages always reflect live data — no separate "sync" step is needed.',
        ],
      },
    ],
  },
  {
    id: 'daily-entry',
    title: 'Daily Entry — Booking, Loading, Billing, Collection',
    features: [
      {
        title: 'L.R. Entry (Lorry Receipt / Booking)',
        purpose: 'Create the shipment record — the legal document for goods handed over for transport.',
        steps: [
          'Go to Daily Entry > L.R. Entry.',
          'Select the Consignor (who is booking) and Consignee (who receives the goods).',
          'Enter From City / To City, delivery address, and up to 5 rows of goods detail (description, qty, weight, amount).',
          'Enter Freight, Hamali, L.R. Charge, and any Advance already collected — the balance is calculated automatically.',
          'Optionally assign a Vehicle and Driver from your masters, or leave for a market vehicle.',
          'Save — the system assigns the next L.R. number automatically (sequential, cannot be reused).',
        ],
        useCase:
          'A customer calls in a booking for 500kg of electronics from Pune to Bangalore. The billing clerk opens L.R. Entry, picks the consignor and consignee from the dropdown (or adds them on the fly), fills in the goods and freight, and prints the L.R. copy for the driver to carry.',
        tips: [
          'If email/WhatsApp alerts are enabled in Settings > Notifications, the consignor and consignee are notified automatically when the L.R. is created.',
          'Once GST integration is configured, you can generate a real e-way bill directly from the L.R. list.',
        ],
      },
      {
        title: 'Challan (Vehicle Loading Sheet)',
        purpose: 'Group multiple L.R.s onto one vehicle trip and record the transporter/driver side of the movement.',
        steps: [
          'Go to Daily Entry > Challan.',
          'Enter From City / To City and select or type the Truck No. and Driver — matching master records auto-fill owner/mobile.',
          'Add L.R.s to the challan by L.R. number (an L.R. can only appear on one open challan at a time).',
          'Enter engine/short reading, rate per km, hamali, and advance paid to the driver.',
          'Save — the system totals freight, To-Pay, and Paid amounts across all L.R.s on the challan.',
        ],
        useCase:
          'At the end of the day, the dispatcher loads 8 L.R.s bound for Delhi onto one 22-wheeler trailer, creates a single challan listing all 8 L.R. numbers, and hands the driver the challan plus advance for tolls and diesel.',
      },
      {
        title: 'Invoice',
        purpose: 'Bill a consignor (with GST) for one or more L.R.s.',
        steps: [
          'Go to Daily Entry > Invoice.',
          'Select the Consignor to bill.',
          'Add L.R. numbers as line items (scan the L.R.\'s printed QR code with a camera, or type the number) — freight pulls in automatically.',
          'Add any additional charges (detention, loading, etc.) and set the GST %.',
          'Save — an invoice number is generated and GST is calculated on the total.',
        ],
        useCase:
          'At month-end, the accounts team pulls together every L.R. booked for "Shree Textiles" over the past 30 days into a single consolidated invoice, rather than billing per shipment.',
        tips: ['Once GST e-invoicing is configured, generate a real IRN directly from the invoice list before sending it to the customer.'],
      },
      {
        title: 'Receipt / On Account Receipt',
        purpose: 'Record money received against an invoice (Receipt) or a general advance not yet tied to a specific invoice (On Account Receipt).',
        steps: [
          'Go to Daily Entry > Receipt (or On Account Receipt for advances).',
          'Select the Consignor and payment mode (cash / bank / cheque).',
          'For a Receipt: pick the invoice(s) being settled and enter the amount received against each, plus any TDS or deduction.',
          'Save — the invoice balance updates automatically; the Consignor Ledger report reflects the payment.',
        ],
        useCase:
          'A consignor pays ₹85,000 against two outstanding invoices via NEFT, deducting 2% TDS. The accountant records one receipt referencing both invoice numbers with the TDS split out.',
      },
      {
        title: 'Monthly Bills',
        purpose: 'Consolidate multiple invoices for one consignor into a single monthly bill with a combined TDS deduction.',
        steps: [
          'Go to Daily Entry > Monthly Bills.',
          'Select the Consignor and the billing period (from/to date).',
          'The system pulls in all invoices for that consignor in the period.',
          'Enter the TDS % — the net payable is calculated automatically.',
        ],
        useCase: 'A large corporate consignor insists on receiving one monthly statement rather than 40 separate invoices — Monthly Bills produces that single consolidated document.',
      },
      {
        title: 'POD Upload',
        purpose: 'Attach proof-of-delivery (signed receiving copy) to a completed L.R.',
        steps: [
          'Go to Daily Entry > POD Upload.',
          'Search for the L.R. by number.',
          'Upload a photo of the signed delivery copy and add any delivery remarks.',
          'Save — the L.R. is marked as POD Received.',
        ],
        useCase:
          'The office staff scans and uploads the signed POD received back from the driver a week after delivery, closing out the shipment for billing/audit purposes. Drivers can also upload this directly from their own Driver Portal.',
      },
    ],
  },
  {
    id: 'masters',
    title: 'Masters — One-Time Setup Data',
    intro: 'These are reference records you set up once and reuse across every L.R., challan, invoice, and report.',
    features: [
      {
        title: 'Consignors & Consignees',
        purpose: 'Your billing parties (Consignors) and delivery parties (Consignees).',
        steps: [
          'Go to Parties > Consignors (or Consignees).',
          'Add name, address, city, GST number, pincode, mobile, and email (email/mobile drive notification alerts).',
          'For Consignors, optionally set a Username/Password to give them access to the Consignor Portal.',
        ],
        useCase: 'Add a new corporate client as a consignor once — every future L.R., invoice, and report for that client references this one record.',
      },
      {
        title: 'Drivers',
        purpose: 'Your driver workforce — own or hired.',
        steps: [
          'Go to Logistics > Drivers.',
          'Enter name, mobile, license number and validity, Aadhaar/PAN, and address.',
          'Set Employment Type (Own/Hired) and link to a Vehicle if they regularly drive one.',
          'Optionally set a Username/Password for Driver Portal / mobile app access.',
          'Use the wallet icon to record Advance / Rent / Deduction entries — the running balance is calculated automatically.',
        ],
        useCase: 'A driver joins as a hired driver for one trailer. His license, Aadhaar, and bank details are entered once; his advances against upcoming trips are tracked in his ledger.',
      },
      {
        title: 'Vehicles',
        purpose: 'Your fleet — owned, attached, or market vehicles.',
        steps: [
          'Go to Logistics > Vehicles.',
          'Enter Vehicle No., type, and optionally link a Vendor (if it belongs to an outside owner).',
          'Fill in RC/Insurance/Fitness/Permit/PUC/Road Tax expiry dates — these drive the Compliance alerts.',
          'Add Fastag ID and GPS Device ID if applicable.',
        ],
        useCase: 'Entering all 15 trucks in the fleet with their insurance and permit expiry dates means the Compliance page immediately shows which ones need renewal this month.',
      },
      {
        title: 'Vendors',
        purpose: 'Vehicle owners, brokers, fuel vendors, workshops, and toll vendors you deal with (not your own customers).',
        steps: [
          'Go to Logistics > Vendors.',
          'Enter vendor name, type (Owner/Broker/Fuel/Workshop/Toll), and contact/bank details.',
          'Optionally set a Username/Password to give vehicle owners access to the Vendor Portal.',
        ],
        useCase:
          'An outside truck owner supplies 3 vehicles to your fleet. Add them once as an "Owner" vendor, link their vehicles to that vendor record, and they can log into the Vendor Portal to see their vehicles\' trips and payments.',
      },
      {
        title: 'Cities & Routes',
        purpose: 'Standardize the city names used across bookings, and pre-define common routes with distance and transit time.',
        steps: [
          'Go to Logistics > Cities to add a city with State, District, Pincode, Distance, and Transit Time.',
          'Go to Logistics > Routes to combine two cities into a named route with a fixed distance.',
        ],
        useCase: 'Pre-loading your 20 most common lanes (e.g. "Mumbai - Delhi") as Routes lets you attach standard freight rates to them instead of re-typing distance every time.',
      },
      {
        title: 'Freight Rates',
        purpose: 'Pre-agreed per-consignor, per-route rate cards by weight slab.',
        steps: [
          'Go to Rate Masters > Freight Rates.',
          'Select a Consignor, Route or City, and Vehicle Type.',
          'Enter rates for 10/20/30/40/50kg and above-50kg slabs.',
        ],
        useCase: 'A regular customer negotiates a fixed rate card for the Mumbai-Pune lane; once entered here, freight can be auto-looked-up during L.R. entry instead of manual calculation.',
      },
      {
        title: 'Goods Types, Goods Natures, Banks',
        purpose: 'Supporting dropdowns used across bookings and printed documents.',
        steps: [
          'Go to Rate Masters > Goods Types / Goods Natures to maintain the dropdown lists used in L.R. goods rows.',
          'Go to Rate Masters > Banks to maintain your company bank accounts printed on invoices.',
        ],
        useCase: 'Standardizing "Goods Nature" as Fragile/Perishable/Hazardous/Standard ensures drivers and warehouse staff handle each shipment correctly.',
      },
      {
        title: 'Company Structure (Branches & Cost Centers)',
        purpose: 'Model multiple offices and internal cost tracking buckets.',
        steps: [
          'Go to Settings > Company Structure.',
          'Add Branches (e.g. Head Office, regional branches) with address and city.',
          'Add Cost Centers (e.g. Fleet Operations, Workshop, Administration) for internal cost categorization.',
          'Link a Branch to individual Vehicles/Drivers from their master records.',
        ],
        useCase: 'A transporter with a head office in Mumbai and a branch in Nagpur tags vehicles based in Nagpur to that branch for future branch-wise reporting.',
      },
    ],
  },
  {
    id: 'compliance-planning',
    title: 'Compliance & Vehicle Planning',
    features: [
      {
        title: 'Compliance Tracking',
        purpose: 'See every vehicle document (RC, Insurance, Fitness, Permit, PUC, Road Tax) and driver license expiring soon, in one place.',
        steps: [
          'Go to Logistics > Compliance.',
          'Choose a window (next 7/30/60/90 days) — expired items show first, in red.',
          'Click "Email This List" to send yourself a digest (requires Compliance Alerts enabled in Settings > Notifications).',
        ],
        useCase: 'Every Monday morning, the fleet manager checks Compliance for anything expiring that week and schedules renewals before a truck gets stopped at a checkpoint with an expired permit.',
      },
      {
        title: 'Vehicle Planning',
        purpose: 'See at a glance which vehicles are available, on a trip, or under maintenance before assigning a new booking.',
        steps: [
          'Go to Logistics > Vehicle Planning.',
          'Review the Available / On Trip / Under Maintenance counts and the per-vehicle table.',
          'Use this before creating a new Trip or Challan to pick a genuinely free vehicle.',
        ],
        useCase: 'A dispatcher gets a same-day booking request and checks Vehicle Planning to instantly see which of the 15 trucks are free today rather than calling around.',
      },
    ],
  },
  {
    id: 'trips-fleet',
    title: 'Trip Management & Fleet',
    features: [
      {
        title: 'Trip Management',
        purpose: 'Track a vehicle\'s journey as a distinct trip (separate from the billing-focused Challan), including revenue vs. expense.',
        steps: [
          'Go to Trips > New Trip.',
          'Select Vehicle, Driver, From/To City, and planned dates.',
          'As the trip progresses, update status: Planned → Ongoing → Completed (or Cancelled).',
          'Enter Revenue and Expense to see per-trip profit.',
        ],
        useCase: 'A trailer leaves for a 4-day Mumbai-Kolkata-Mumbai round trip. The trip is marked Ongoing when it departs and Completed on return, with fuel/toll expenses and freight revenue entered to see if the round trip was profitable.',
        tips: ['Drivers can accept and progress their own assigned trips from the Driver Portal without office intervention.'],
      },
      {
        title: 'Fuel Management',
        purpose: 'Log every fuel fill-up and automatically track mileage (km/liter) per vehicle.',
        steps: [
          'Go to Fleet > Fuel Entries.',
          'Select Vehicle and Driver, enter quantity, rate, and current odometer reading.',
          'Mileage is calculated automatically from the previous fill-up\'s odometer reading.',
        ],
        useCase: 'Tracking every fill-up for a truck over 3 months reveals its mileage has dropped from 6 km/L to 4 km/L — a sign it needs a service check.',
      },
      {
        title: 'Tyre Management',
        purpose: 'Track individual tyres through their lifecycle: allocation, rotation, retreading, replacement.',
        steps: [
          'Go to Fleet > Tyres to add a new tyre with serial number, brand, and the vehicle/position it\'s fitted to.',
          'Use the History icon on any tyre to log a Rotation, Retreading, or Replacement event with cost.',
        ],
        useCase: 'A tyre fitted to the front-left position is rotated to the rear after 6 months and eventually sent for retreading — the full cost history is visible against that one tyre.',
      },
      {
        title: 'Workshop & Preventive Maintenance',
        purpose: 'Log every service/repair and schedule the next one by date or odometer reading.',
        steps: [
          'Go to Fleet > Maintenance.',
          'Select Vehicle and Workshop Vendor, enter Service Type, cost, and odometer.',
          'Mark "This was a breakdown" for unplanned repairs.',
          'Set the Next Due Date/Odometer — overdue services are highlighted in red.',
        ],
        useCase: 'After an engine oil change at 45,000km, the next due is set for 50,000km — when the vehicle\'s fuel-entry odometer readings approach that mark, the maintenance page flags it.',
      },
      {
        title: 'Incident Reports',
        purpose: 'Log accidents, breakdowns, and other on-road incidents reported by drivers, and track their review status.',
        steps: [
          'Drivers submit incidents from their Driver Portal (or office staff logs one directly under Fleet > Incidents).',
          'Office reviews each incident and updates its status: Open → Reviewed → Closed.',
        ],
        useCase: 'A driver reports a tyre burst on the highway via the Driver App; the fleet manager reviews it the next morning and closes it once the tyre has been replaced.',
      },
      {
        title: 'GPS Tracking',
        purpose: 'See the last known location of vehicles fitted with a GPS device (requires GPS integration configured in Settings > Integrations).',
        steps: [
          'Ensure each tracked vehicle has a GPS Device ID set in Vehicles Master.',
          'Go to Fleet > GPS Tracking and click "Refresh Locations".',
          'Click "View" on any vehicle to open its last known position in Google Maps.',
        ],
        useCase: 'Before promising a customer a delivery time, the dispatcher checks GPS Tracking to confirm the truck is already past the halfway point.',
        tips: ['This is a manual refresh, not a live-updating map — click Refresh whenever you need the latest position.'],
      },
    ],
  },
  {
    id: 'quotations',
    title: 'Quotations',
    features: [
      {
        title: 'Creating & Tracking Quotations',
        purpose: 'Send a formal rate quote to a prospective or existing customer before booking, and track its outcome.',
        steps: [
          'Go to Quotations > New Quotation.',
          'Select Consignor (if existing), From/To City, Vehicle Type, Rate, and Fuel Surcharge %.',
          'Set a Valid Until date.',
          'Update status as it progresses: Draft → Sent → Approved / Rejected / Expired.',
        ],
        useCase: 'A prospective client asks for a rate on the Ahmedabad-Chennai lane before committing. A quotation is sent with a 15-day validity; once they approve verbally, the status is updated to Approved and the first L.R. is booked at that rate.',
      },
    ],
  },
  {
    id: 'accounts',
    title: 'Accounts',
    features: [
      {
        title: 'Expense & Income Tracking',
        purpose: 'Record all non-freight money in and out of the business, optionally tagged to a vehicle or driver.',
        steps: [
          'Go to Accounts > Expense & Income.',
          'Choose Expense or Income, select a Category (Fuel, Toll, Repair, Office Expense, Freight Income, etc.), and enter the amount.',
          'Optionally link to a Vehicle or Driver for per-vehicle cost visibility.',
          'Manage your own category list under Accounts > Categories.',
        ],
        useCase: 'Office rent, staff salaries, and vehicle insurance premiums are all logged as expenses here, giving a true picture of profitability beyond just freight income — visible on the Dashboard\'s Net Cash Flow chart.',
      },
    ],
  },
  {
    id: 'hr',
    title: 'HR',
    features: [
      {
        title: 'Staff Attendance',
        purpose: 'Mark daily attendance for office staff (separate from the driver advance/rent ledger).',
        steps: [
          'Go to Settings > HR > Attendance tab.',
          'Pick a date, then mark each staff member Present / Absent / Half Day / Leave.',
        ],
        useCase: 'The office admin marks attendance every evening for the 4-person accounts team, building a monthly attendance record for payroll reference.',
      },
      {
        title: 'Leave Requests',
        purpose: 'Log and approve staff leave requests.',
        steps: [
          'Go to Settings > HR > Leave tab.',
          'Add a leave request for a staff member with type, from/to date, and reason.',
          'Update its status: Pending → Approved / Rejected.',
        ],
        useCase: 'An accountant requests 3 days of casual leave for a family function; the Transport Admin approves it and the record stays on file.',
      },
    ],
  },
  {
    id: 'warehouse',
    title: 'Warehouse',
    features: [
      {
        title: 'Inward / Outward Tracking',
        purpose: 'Track goods moving through a godown or cross-docking hub, separate from direct point-to-point L.R. shipments.',
        steps: [
          'Go to Logistics > Warehouse.',
          'Add your Warehouse(s) with address and capacity under the Warehouses tab.',
          'Log each Inward or Outward movement with item description, quantity, and optionally a linked L.R. number.',
        ],
        useCase: 'A transporter operating a transit hub in Pune logs goods arriving from multiple small vehicles as "Inward", then logs them going out again on a consolidated long-haul truck as "Outward" against the same warehouse.',
        tips: ['This tracks movement quantities, not bin/rack-level inventory — it\'s a lightweight in/out log, not a full WMS.'],
      },
    ],
  },
  {
    id: 'reports',
    title: 'Reports & Analytics',
    features: [
      {
        title: 'Running & Exporting Reports',
        purpose: 'Register-style operational and financial reports with CSV/PDF export.',
        steps: [
          'Go to Reports.',
          'Set a date range and choose a report type: L.R. Report, City Wise Sales, Consignor Performance, Payment Status, Vehicle P&L, Driver Ledger, Fuel, Tyres, or Maintenance.',
          'Click Export CSV or Export PDF to download and share the report.',
        ],
        useCase: 'At month-end, the owner exports the Vehicle P&L report as a PDF to review which trucks are profitable and which are dragging down margins, and shares the Consignor Performance report with the sales team.',
      },
      {
        title: 'Consignor Ledger',
        purpose: 'A running statement of invoices vs. payments for a specific consignor.',
        steps: ['Go to Reports > Consignor Ledger.', 'Select the consignor and date range to see every invoice, receipt, and the running balance.'],
        useCase: 'A customer disputes their outstanding balance — the consignor ledger provides a line-by-line statement to resolve the dispute.',
      },
    ],
  },
  {
    id: 'complaints',
    title: 'Complaints',
    features: [
      {
        title: 'Handling Customer Complaints',
        purpose: 'Let consignors raise service issues and track them to resolution.',
        steps: [
          'Consignors raise a complaint from their own Consignor Portal (subject, description, optional L.R. number).',
          'Office staff review and resolve complaints under Parties > Complaints, updating status and adding resolution remarks.',
        ],
        useCase: 'A customer reports goods arrived damaged. They log it via the Consignor Portal; the operations team investigates, adds a resolution note about the compensation agreed, and marks it Resolved — visible back to the customer.',
      },
    ],
  },
  {
    id: 'portals',
    title: 'Customer, Driver & Vendor Portals',
    features: [
      {
        title: 'Consignor Portal',
        purpose: 'Self-service access for your customers to track shipments and manage their own account.',
        steps: [
          'Give the consignor their Username/Password (set in Parties > Consignors).',
          'They log in at /consignor/login to see: LR Desk (track shipments, POD status), Invoices, Payment Ledger, and Complaints.',
        ],
        useCase: 'Instead of calling to ask "where is my shipment", a regular customer logs into their own portal to check L.R. status and download their invoice directly.',
      },
      {
        title: 'Driver Portal / App',
        purpose: 'Give drivers a simple mobile-friendly interface for their day-to-day tasks.',
        steps: [
          'Give the driver their Username/Password (set in Logistics > Drivers).',
          'They log in at /driver/login to: view and accept assigned Trips, upload signed POD, submit a vehicle Checklist, and report Incidents.',
        ],
        useCase: 'A driver starts his shift, opens the Driver App on his phone, accepts today\'s assigned trip, runs through the pre-trip vehicle checklist, and later uploads a photo of the signed POD after delivery — all without calling the office.',
      },
      {
        title: 'Vendor Portal',
        purpose: 'Give outside vehicle owners visibility into their vehicles\' trips and payments.',
        steps: [
          'Give the vendor their Username/Password (set in Logistics > Vendors).',
          'They log in at /vendor/login to see: their linked Vehicles, Trips those vehicles have run, and Payments made to them.',
        ],
        useCase: 'An owner supplying 3 trucks to your fleet checks the Vendor Portal at month-end to verify how many trips each of his vehicles ran and confirm the rent payment matches.',
      },
    ],
  },
  {
    id: 'settings-security',
    title: 'Settings & Security',
    features: [
      {
        title: 'Users & Roles (RBAC)',
        purpose: 'Control what each staff member can see and do.',
        steps: [
          'Go to Settings > Users to add staff with a role: Transport Admin, Manager, Accountant, or Operator.',
          'Each role has a fixed set of permissions (e.g. Operator can enter L.R.s but can\'t manage users or settings).',
          'The sidebar automatically shows only the sections a staff member has access to.',
        ],
        useCase: 'A new accountant joins — they\'re given the Accountant role, which grants access to billing, accounts, and reports but not fleet management or user administration.',
      },
      {
        title: 'Financial Years',
        purpose: 'Define your accounting year boundaries for reporting.',
        steps: ['Go to Settings > Financial Years to add a year (e.g. 2026-2027) with start/end dates and mark it default.'],
        useCase: 'Setting the financial year to April-March aligns the system with standard Indian accounting practice.',
      },
      {
        title: 'Notifications (Email & WhatsApp)',
        purpose: 'Automatically alert consignors/consignees when documents are created.',
        steps: [
          'Go to Settings > Notifications.',
          'Enter your own SMTP details to enable email, and/or a WhatsApp Business API phone number + token.',
          'Choose which events trigger a notification (L.R./Invoice/Receipt/Challan created) and who receives it (consignor/consignee).',
          'Send a test email or WhatsApp message to confirm it works.',
        ],
        useCase: 'A consignee automatically receives a WhatsApp message the moment their shipment\'s L.R. is booked, without office staff having to call them.',
      },
      {
        title: 'Integrations (Payment / GST / GPS / AI)',
        purpose: 'Connect third-party services once your accounts with those providers are ready.',
        steps: [
          'Go to Settings > Integrations.',
          'Payment Gateway (Razorpay): add Key ID/Secret to let consignors pay invoices online from their portal.',
          'GST (Masters India): add your GSTIN and API credentials to generate real e-way bills/e-invoices.',
          'GPS (Mappls): add credentials to enable live vehicle location lookup.',
          'AI Assistant (Groq): add a free API key to enable the in-app chat assistant and document OCR.',
        ],
        useCase: 'Once signed up with Razorpay, the owner pastes the API keys here and customers can start paying invoices online the same day — no code changes needed.',
      },
      {
        title: 'Two-Factor Authentication (2FA)',
        purpose: 'Add a second login step (authenticator app code) to protect staff accounts.',
        steps: [
          'Go to Profile > Two-Factor Authentication.',
          'Click "Set Up 2FA" and scan the QR code with Google Authenticator, Authy, or similar.',
          'Enter the 6-digit code shown to confirm and enable it.',
          'From then on, login asks for this code after the password.',
        ],
        useCase: 'The Transport Admin enables 2FA on their own account so that even if their password is compromised, an attacker can\'t log in without the authenticator code on their phone.',
      },
    ],
  },
  {
    id: 'ai-assistant',
    title: 'AI Assistant',
    features: [
      {
        title: 'In-app Chat Assistant',
        purpose: 'Get quick answers about how to use the system without leaving the page.',
        steps: [
          'Click the sparkle icon in the bottom-right corner of any screen.',
          'Ask a question like "how do I create an invoice" or "what does the Compliance page show".',
        ],
        useCase: 'A new Operator unsure how to add a goods row to an L.R. asks the assistant instead of calling a senior colleague.',
        tips: ['The assistant answers general "how to use this app" questions — it does not read your live bookings/financial data.'],
      },
      {
        title: 'AI Document Scanning (OCR)',
        purpose: 'Auto-fill driver license details from a photo instead of typing them.',
        steps: [
          'Go to Logistics > Drivers > Add/Edit Driver.',
          'Upload a clear photo of the license under Passport Photo.',
          'Click "Fill from Photo (AI)" — name, license number, and validity date are extracted automatically.',
          'Always verify the extracted fields before saving.',
        ],
        useCase: 'Onboarding 10 new drivers at once, the office clerk photographs each license and lets AI pre-fill the form instead of manually typing every field.',
      },
    ],
  },
];
