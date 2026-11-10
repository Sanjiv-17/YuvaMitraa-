import { Job, Course, GovernmentScheme, UserProfile } from '../types';

export const INITIAL_USER: UserProfile = {
  id: 'usr-101',
  name: 'Aarav Sharma',
  email: 'aarav.sharma@example.com',
  phone: '+91 98765 43210',
  role: 'student',
  photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
  education: 'B.Tech in Computer Science / IT (3rd Year)',
  institution: 'National Institute of Technology',
  graduationYear: '2026',
  skills: ['JavaScript', 'HTML5', 'CSS3', 'React', 'Python Basics', 'Git', 'Problem Solving', 'Public Speaking'],
  interests: ['Frontend Web Development', 'AI Tools', 'Startups', 'Fintech', 'Youth Leadership'],
  location: 'Connaught Place, New Delhi',
  coordinates: {
    lat: 28.6315,
    lng: 77.2167,
  },
  resumeFileName: 'Aarav_Sharma_Resume_2026.pdf',
  resumeText: `AARAV SHARMA
Email: aarav.sharma@example.com | Phone: +91 98765 43210 | Location: New Delhi
GitHub: github.com/aarav-dev | LinkedIn: linkedin.com/in/aarav-sharma

EDUCATION
B.Tech in Computer Science & Engineering (2022 - 2026)
National Institute of Technology, CGPA: 8.4/10

TECHNICAL SKILLS
- Programming: JavaScript (ES6+), Python, HTML5, CSS3, SQL
- Frameworks & Libraries: React.js, Tailwind CSS, Node.js basics, Express
- Developer Tools: Git, GitHub, VS Code, Figma, Postman
- Soft Skills: Team Leadership, Agile Collaboration, Presentation & Communication

PROJECTS
1. YuvaPortal - Student Resource Exchange Platform
Built a responsive web portal allowing 500+ college peers to share lecture notes and mock tests. Implemented interactive search and local caching.

2. Campus Event Tracker
Designed a React application for college clubs to publish schedules, send SMS alerts, and track RSVPs.

EXTRACURRICULAR & ACHIEVEMENTS
- Lead Organizer, Annual Techfest 2024
- Winner, Inter-College Web Hackathon (2nd Place out of 40 teams)
- Active volunteer at National Youth Skill Mission (teaching digital literacy to school children)
`,
  streakDays: 5,
  xpPoints: 1250,
  badges: ['First Step', 'Resume Ready', 'Fast Learner', 'Streak Pioneer'],
  savedJobIds: ['job-1', 'job-3'],
  enrolledCourses: [
    {
      courseId: 'course-1',
      completedModuleIds: ['m1-1', 'm1-2'],
    },
    {
      courseId: 'course-7',
      completedModuleIds: ['m7-1'],
    }
  ],
};

export const SAMPLE_JOBS: Job[] = [
  {
    id: 'job-1',
    title: 'Frontend React Developer Intern',
    company: 'BharatTech Innovations',
    companyLogo: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=120&q=80',
    location: 'Okhla Phase III, New Delhi',
    city: 'New Delhi',
    coordinates: { lat: 28.5355, lng: 77.2715 },
    type: 'internship',
    category: 'Tech',
    stipend: '₹20,000 / month',
    stipendAmount: 20000,
    duration: '6 Months',
    requiredSkills: ['React', 'JavaScript', 'Tailwind CSS', 'Git', 'REST APIs'],
    description: 'Join our fast-growing fintech team building next-generation digital lending products for rural and semi-urban India. You will work directly with senior architects.',
    responsibilities: [
      'Build reusable React UI components following responsive design principles',
      'Integrate REST APIs and optimize page rendering speeds',
      'Collaborate with UI/UX designers to translate Figma prototypes into clean code',
      'Participate in daily standups and code reviews'
    ],
    perks: ['Pre-Placement Offer (PPO) opportunity', 'Certificate of Internship', 'Flexible hours', 'Free lunch & snacks'],
    deadline: '2026-12-15',
    applicantsCount: 42,
    postedDate: '2 days ago',
  },
  {
    id: 'job-2',
    title: 'Digital Marketing & Content Trainee',
    company: 'GrowthGenius Media',
    companyLogo: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=120&q=80',
    location: 'Cyber City, Gurugram',
    city: 'Gurugram',
    coordinates: { lat: 28.4950, lng: 77.0895 },
    type: 'internship',
    category: 'Marketing',
    stipend: '₹15,000 / month',
    stipendAmount: 15000,
    duration: '3 Months',
    requiredSkills: ['Social Media Marketing', 'Content Writing', 'Canva', 'SEO Basics', 'Analytics'],
    description: 'Exciting hands-on opportunity to run live ad campaigns, write viral social content, and track organic growth for leading D2C youth brands.',
    responsibilities: [
      'Create short-form scripts and graphics for Instagram & LinkedIn campaigns',
      'Perform keyword research and on-page SEO optimization for client blogs',
      'Analyze weekly reach, engagement, and conversion metrics'
    ],
    perks: ['Flexible Hybrid policy', 'Mentorship from CMO', 'PPO based on performance'],
    deadline: '2026-11-30',
    applicantsCount: 68,
    postedDate: 'Just now',
  },
  {
    id: 'job-3',
    title: 'Python & AI Operations Intern',
    company: 'DataVyuha Labs',
    companyLogo: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=120&q=80',
    location: 'Noida Sector 62',
    city: 'Noida',
    coordinates: { lat: 28.6280, lng: 77.3649 },
    type: 'internship',
    category: 'Tech',
    stipend: '₹22,000 / month',
    stipendAmount: 22000,
    duration: '4 Months',
    requiredSkills: ['Python', 'Pandas', 'Gemini API', 'Prompt Engineering', 'SQL'],
    description: 'Help develop AI workflow automation tools and intelligent document parsers. Work with state-of-the-art LLMs and high-scale data pipelines.',
    responsibilities: [
      'Clean and process multi-lingual text datasets using Python',
      'Test and evaluate prompt pipelines with Gemini and other foundation models',
      'Create automated test scripts and verify accuracy benchmarks'
    ],
    perks: ['Work with top AI researchers', 'Letter of Recommendation', 'MacBook provided for work'],
    deadline: '2026-12-10',
    applicantsCount: 55,
    postedDate: '1 day ago',
  },
  {
    id: 'job-4',
    title: 'Junior UI/UX Design Associate',
    company: 'KalaKriti Digital Studio',
    companyLogo: 'https://images.unsplash.com/photo-1572021335469-31706a17aaef?auto=format&fit=crop&w=120&q=80',
    location: 'Indiranagar, Bengaluru',
    city: 'Bengaluru',
    coordinates: { lat: 12.9716, lng: 77.5946 },
    type: 'full-time',
    category: 'Design',
    stipend: '₹35,000 / month',
    stipendAmount: 35000,
    duration: 'Permanent (Fresher)',
    requiredSkills: ['Figma', 'Wireframing', 'User Research', 'Design Systems', 'Prototyping'],
    description: 'We are looking for creative fresh design graduates or self-taught UI creators with an eye for detail, clean typography, and empathy for diverse Indian users.',
    responsibilities: [
      'Conduct user interviews with college students and young jobseekers',
      'Design high-fidelity mobile and desktop web wireframes in Figma',
      'Build and maintain accessible component design systems'
    ],
    perks: ['Health Insurance', 'Annual learning stipend ₹25,000', 'Creative team retreats'],
    deadline: '2026-12-20',
    applicantsCount: 31,
    postedDate: '3 days ago',
  },
  {
    id: 'job-5',
    title: 'Financial Analysis & Tally Intern',
    company: 'VittaMitra Advisory Pvt Ltd',
    companyLogo: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=120&q=80',
    location: 'Bandra Kurla Complex (BKC), Mumbai',
    city: 'Mumbai',
    coordinates: { lat: 19.0657, lng: 72.8687 },
    type: 'internship',
    category: 'Finance',
    stipend: '₹18,000 / month',
    stipendAmount: 18000,
    duration: '6 Months',
    requiredSkills: ['Financial Accounting', 'Tally Prime', 'MS Excel', 'GST Filing', 'Data Entry'],
    description: 'Gain real-world experience in corporate balance sheets, audit preparation, GST reconciliation, and modern accounting automation.',
    responsibilities: [
      'Verify vendor invoices and assist with ledger entry in Tally Prime',
      'Prepare monthly GST returns draft and bank reconciliation statements',
      'Generate financial reports and cash flow forecasts in Advanced Excel'
    ],
    perks: ['Direct training by Chartered Accountants', 'Corporate exposure at BKC', 'PPO opportunity'],
    deadline: '2026-12-05',
    applicantsCount: 24,
    postedDate: '4 days ago',
  },
  {
    id: 'job-6',
    title: 'Government Internship Scheme Fellow (Youth Development)',
    company: 'Ministry of Corporate Affairs / Youth Mission',
    companyLogo: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=120&q=80',
    location: 'Central Secretariat, New Delhi',
    city: 'New Delhi',
    coordinates: { lat: 28.6144, lng: 77.2090 },
    type: 'internship',
    category: 'Government',
    stipend: '₹5,000 + ₹6,000 grant / month',
    stipendAmount: 11000,
    duration: '12 Months',
    requiredSkills: ['Analytical Skills', 'MS Office', 'Report Writing', 'Public Policy Interest', 'Hindi/English Communication'],
    description: 'Official internship under the Prime Minister Internship Scheme. Learn policy implementation, digital governance, and ground-level welfare tracking across top corporate partners.',
    responsibilities: [
      'Assist project officers in monitoring skill development programs',
      'Collate field reports and prepare weekly summary briefs',
      'Coordinate with district employment exchanges and polytechnics'
    ],
    perks: ['Prime Minister Scheme Official Certificate', 'Insurance coverage ₹2 Lakh', 'Direct government network'],
    deadline: '2026-12-31',
    applicantsCount: 1420,
    postedDate: '5 days ago',
    isGovernmentSponsored: true,
  },
  {
    id: 'job-7',
    title: 'Remote Customer Success & Communication Specialist',
    company: 'Sarthi SaaS Solutions',
    companyLogo: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=120&q=80',
    location: 'Fully Remote (Anywhere in India)',
    city: 'Remote',
    coordinates: { lat: 28.6139, lng: 77.2090 },
    type: 'remote',
    category: 'Operations',
    stipend: '₹16,000 / month',
    stipendAmount: 16000,
    duration: '3 Months',
    requiredSkills: ['Verbal Communication', 'Email Writing', 'Customer Empathy', 'CRM Basics', 'English/Hindi'],
    description: 'Work from home assisting small business owners to onboard onto our billing app. Friendly, patient communicators are welcome.',
    responsibilities: [
      'Answer customer support inquiries via chat and phone',
      'Conduct product walkthroughs for newly registered merchants',
      'Document user feedback and common feature requests for the product team'
    ],
    perks: ['100% Work from Home', 'Internet reimbursement ₹1,500/mo', 'Flexible shifts'],
    deadline: '2026-11-28',
    applicantsCount: 89,
    postedDate: '3 days ago',
  },
  {
    id: 'job-8',
    title: 'Full-Stack Node & React Trainee',
    company: 'Prayaas TechLabs',
    companyLogo: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=120&q=80',
    location: 'Hinjawadi IT Park, Pune',
    city: 'Pune',
    coordinates: { lat: 18.5912, lng: 73.7389 },
    type: 'internship',
    category: 'Tech',
    stipend: '₹25,000 / month',
    stipendAmount: 25000,
    duration: '6 Months',
    requiredSkills: ['Node.js', 'Express', 'MongoDB / SQL', 'React', 'Problem Solving'],
    description: 'Join our cloud engineering cohort building scalable healthtech systems for tier-2/3 hospital networks across Maharashtra and Gujarat.',
    responsibilities: [
      'Write robust backend REST endpoints and database queries',
      'Implement authentication, role-based access, and token validation',
      'Write unit tests and maintain clean documentation'
    ],
    perks: ['Full-time conversion with ₹6.5 LPA CTC', 'Company sponsored laptop', 'Gym membership'],
    deadline: '2026-12-18',
    applicantsCount: 63,
    postedDate: '2 days ago',
  }
];

export const SAMPLE_COURSES: Course[] = [
  {
    id: 'course-1',
    title: 'Modern Frontend Web Development with React & Tailwind',
    category: 'Tech',
    thumbnail: 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?auto=format&fit=crop&w=600&q=80',
    durationHours: 14,
    modulesCount: 3,
    level: 'Beginner',
    rating: 4.8,
    enrolledCount: 3420,
    instructor: 'Er. Rajesh Verma (Principal Web Engineer)',
    description: 'Learn to build production-grade, fast, and accessible web apps using HTML5, CSS3, modern JavaScript, React 19, and Tailwind CSS. Perfect for securing tech internships.',
    passMarkPercentage: 70,
    modules: [
      {
        id: 'm1-1',
        title: 'Modern JavaScript (ES6+) Core Fundamentals',
        durationMinutes: 45,
        videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        content: `JavaScript is the heartbeat of modern web development. In this module, you master arrow functions, destructuring, template literals, array methods (map, filter, reduce), and async/await for API calls.

Key Practice:
- Always use 'const' and 'let', avoiding legacy 'var'.
- Use array destructuring: const [state, setState] = useState(0).
- Handling promises gracefully with try...catch blocks.`,
        keyTakeaways: [
          'Master ES6 arrow functions and array manipulation',
          'Understand asynchronous execution and Promises',
          'Write clean, modular code with modern import/export'
        ],
        quiz: [
          {
            id: 'q1-1',
            question: 'Which method returns a new array with elements that pass a test condition?',
            options: ['forEach()', 'filter()', 'map()', 'reduce()'],
            correctOptionIndex: 1,
            explanation: 'The filter() method creates a shallow copy of a portion of a given array, filtered down to just the elements that pass the test provided by the function.'
          },
          {
            id: 'q1-2',
            question: 'What is the primary benefit of async/await over raw promises?',
            options: [
              'Makes asynchronous code look and read like synchronous code',
              'Runs code on multiple CPU threads',
              'Automatically caches all network requests',
              'Compiles directly to C++'
            ],
            correctOptionIndex: 0,
            explanation: 'async/await simplifies writing and reading asynchronous code, avoiding callback hell and deeply nested .then() chains.'
          }
        ]
      },
      {
        id: 'm1-2',
        title: 'React Components, State & Hooks Mastery',
        durationMinutes: 60,
        content: `React is component-driven. You break complex user interfaces into small, reusable chunks called components.

Key Concepts:
1. JSX: Writing HTML-like structures inside JavaScript.
2. Props: Passing data downwards from parent to child.
3. useState: Holding reactive data that causes the UI to re-render when modified.
4. useEffect: Managing side effects such as data fetching, timers, or event listeners.`,
        keyTakeaways: [
          'Deconstruct interfaces into reusable components',
          'Manage reactive state without directly mutating objects',
          'Trigger data fetching properly with useEffect'
        ],
        quiz: [
          {
            id: 'q1-3',
            question: 'Why should you never mutate state directly (e.g. state.push(newItem)) in React?',
            options: [
              'Direct mutation causes syntax errors in JavaScript',
              'React relies on shallow reference equality to know when to re-render',
              'Direct mutation deletes the browser cache',
              'It consumes double the memory'
            ],
            correctOptionIndex: 1,
            explanation: 'React compares previous and new state references. Mutating state in place will not trigger a component re-render.'
          }
        ]
      },
      {
        id: 'm1-3',
        title: 'Tailwind CSS & Responsive Layout Architecture',
        durationMinutes: 50,
        content: `Tailwind CSS enables utility-first styling. Build mobile-first responsive interfaces using breakpoint prefixes like md: and lg:.

Design principles:
- Start styling for mobile view first (default classes).
- Add desktop layouts via 'md:grid md:grid-cols-3' or 'lg:flex'.
- Use semantic colors like primary orange (#FF7A00) for CTA buttons.`,
        keyTakeaways: [
          'Master mobile-first responsive utility classes',
          'Use Flexbox and Grid layouts seamlessly',
          'Ensure high accessibility contrast and readable fonts'
        ],
        quiz: [
          {
            id: 'q1-4',
            question: 'In Tailwind CSS, which prefix applies styles on screens 768px and wider?',
            options: ['sm:', 'md:', 'lg:', 'xl:'],
            correctOptionIndex: 1,
            explanation: 'In Tailwind, the md: breakpoint targets screens at or above 768px.'
          }
        ]
      }
    ],
    finalExam: [
      {
        id: 'fe-1',
        question: 'Which React hook should you use when subscribing to an external event listener or fetching API data on mount?',
        options: ['useMemo', 'useEffect', 'useCallback', 'useContext'],
        correctOptionIndex: 1,
        explanation: 'useEffect is specifically designed for handling side-effects like fetching data or setting event listeners.'
      },
      {
        id: 'fe-2',
        question: 'What is the correct way to update an array state named "items" with a new element?',
        options: [
          'setItems([...items, newItem])',
          'items.push(newItem)',
          'setItems(items.push(newItem))',
          'items = [items, newItem]'
        ],
        correctOptionIndex: 0,
        explanation: 'Using the spread operator [...items, newItem] returns a fresh array reference, ensuring proper React state updates.'
      },
      {
        id: 'fe-3',
        question: 'What does the Tailwind class "flex justify-between items-center" do?',
        options: [
          'Creates a flex container, distributes space between children, and centers them vertically',
          'Centers all items in the exact middle of the screen',
          'Arranges items into a 3-column grid',
          'Hides elements on mobile devices'
        ],
        correctOptionIndex: 0,
        explanation: 'justify-between separates items across the main axis, and items-center aligns them on the cross axis.'
      }
    ]
  },
  {
    id: 'course-2',
    title: 'Business Communication & Workplace Presentation Skills',
    category: 'Communication',
    thumbnail: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=600&q=80',
    durationHours: 8,
    modulesCount: 2,
    level: 'Beginner',
    rating: 4.9,
    enrolledCount: 5210,
    instructor: 'Pooja Iyer (Corporate Soft Skills Coach)',
    description: 'Conquer interview anxiety, master professional email writing, learn active listening, and deliver impactful presentations in both English and Hindi corporate settings.',
    passMarkPercentage: 70,
    modules: [
      {
        id: 'm2-1',
        title: 'Professional Email Etiquette & Slack Messaging',
        durationMinutes: 40,
        content: `In the corporate world, your writing represents your professionalism.
Always:
- Use clear, action-oriented subject lines (e.g. "[Action Required] Project Alpha Status Review").
- Start with a courteous greeting (Dear Mr. Sharma, Hello Team).
- State the purpose in the first two sentences.
- End with clear next steps and deadlines.`,
        keyTakeaways: [
          'Craft concise, polite, and actionable emails',
          'Avoid slang and ambiguous phrasing',
          'Learn the right time to use CC vs BCC'
        ],
        quiz: [
          {
            id: 'q2-1',
            question: 'Which of the following is the best subject line for an internship application?',
            options: [
              'Hey, please check my resume',
              'Internship Application: Aarav Sharma - Frontend Developer (3rd Yr NIT)',
              'Urgent Job Request',
              'Job'
            ],
            correctOptionIndex: 1,
            explanation: 'A strong subject line includes the role name, applicant name, and brief qualification for quick recruiter triage.'
          }
        ]
      },
      {
        id: 'm2-2',
        title: 'Mastering the STAR Method for Interviews',
        durationMinutes: 45,
        content: `When interviewers ask behavioral questions like "Tell me about a time you overcame a conflict", use the STAR formula:
- S: Situation (Set the context)
- T: Task (What was required)
- A: Action (Specific steps you took)
- R: Result (Measurable outcome and lessons learned)`,
        keyTakeaways: [
          'Structure every story using Situation, Task, Action, Result',
          'Quantify results wherever possible',
          'Maintain calm eye contact and positive body language'
        ],
        quiz: [
          {
            id: 'q2-2',
            question: 'In the STAR interview response method, what does "A" stand for?',
            options: ['Analysis', 'Action', 'Agreement', 'Approval'],
            correctOptionIndex: 1,
            explanation: 'A stands for Action - the specific initiatives and steps that you personally took to resolve the challenge.'
          }
        ]
      }
    ],
    finalExam: [
      {
        id: 'fe-2-1',
        question: 'When asked "What are your weaknesses?", which strategy is most effective?',
        options: [
          'Claim that you have zero weaknesses',
          'State a genuine area of improvement alongside the concrete actions you are taking to overcome it',
          'Blame past professors or team members',
          'Refuse to answer the question'
        ],
        correctOptionIndex: 1,
        explanation: 'Interviewers look for self-awareness and proactive growth mindset, not perfection.'
      },
      {
        id: 'fe-2-2',
        question: 'What is active listening during a team meeting?',
        options: [
          'Waiting silently for your turn to speak',
          'Nodding, summarizing the other speaker’s core point, and asking clarifying questions',
          'Checking notifications while others talk',
          'Interrupting immediately when you disagree'
        ],
        correctOptionIndex: 1,
        explanation: 'Active listening involves confirming comprehension and reflecting back the speaker’s message before responding.'
      }
    ]
  },
  {
    id: 'course-3',
    title: 'Digital Marketing, SEO & Social Media Growth',
    category: 'Digital Marketing',
    thumbnail: 'https://images.unsplash.com/photo-1432888622747-4eb9a8efeb07?auto=format&fit=crop&w=600&q=80',
    durationHours: 10,
    modulesCount: 2,
    level: 'Beginner',
    rating: 4.7,
    enrolledCount: 2890,
    instructor: 'Amit Khandelwal (Growth Lead @ D2C India)',
    description: 'Learn modern search engine optimization (SEO), Meta & Google ad fundamentals, influencer outreach, and analytics tracking for fast-growing Indian businesses.',
    passMarkPercentage: 70,
    modules: [
      {
        id: 'm3-1',
        title: 'SEO Fundamentals: Keywords, On-Page & Technical',
        durationMinutes: 45,
        content: `Search Engine Optimization drives free organic traffic.
Key focus:
- Keyword Intent: Informational vs Transactional.
- On-page elements: Title tag (<60 chars), Meta description (<155 chars), H1-H3 headers.
- Mobile friendliness and fast Core Web Vitals.`,
        keyTakeaways: ['Identify high-intent keywords', 'Optimize meta tags and content', 'Improve site indexing'],
        quiz: [
          {
            id: 'q3-1',
            question: 'What is the recommended length for an SEO page title tag?',
            options: ['Under 60 characters', 'Over 200 characters', 'Exactly 10 words', 'No limit'],
            correctOptionIndex: 0,
            explanation: 'Search engines typically truncate titles longer than 55-60 characters in search results.'
          }
        ]
      },
      {
        id: 'm3-2',
        title: 'Social Media Strategy & Paid Ad Campaigns',
        durationMinutes: 50,
        content: `Create compelling content hooks. Structure ad sets with clear target audiences, test 3-5 creative variations, and calculate Customer Acquisition Cost (CAC) vs Return on Ad Spend (ROAS).`,
        keyTakeaways: ['Hook viewers in first 3 seconds', 'Target demographically and by interest', 'Calculate ROAS and CAC'],
        quiz: [
          {
            id: 'q3-2',
            question: 'What does ROAS stand for in digital marketing?',
            options: ['Rate of Annual Sales', 'Return on Ad Spend', 'Reach of Advertising Strategy', 'Retention of Active Subscribers'],
            correctOptionIndex: 1,
            explanation: 'ROAS measures the revenue generated for every rupee spent on advertising.'
          }
        ]
      }
    ],
    finalExam: [
      {
        id: 'fe-3-1',
        question: 'Which metric measures the percentage of visitors who click on a link after seeing an ad or search snippet?',
        options: ['CTR (Click-Through Rate)', 'Bounce Rate', 'CPM', 'LTV'],
        correctOptionIndex: 0,
        explanation: 'CTR is calculated as (Clicks / Impressions) * 100.'
      }
    ]
  },
  {
    id: 'course-4',
    title: 'Financial Accounting, Tally Prime & GST Basics',
    category: 'Finance',
    thumbnail: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=600&q=80',
    durationHours: 12,
    modulesCount: 2,
    level: 'Beginner',
    rating: 4.8,
    enrolledCount: 1980,
    instructor: 'CA Sneha Mehta',
    description: 'Practical training on double-entry bookkeeping, ledger management in Tally Prime, input tax credit, and GST return filings for commerce students and finance trainees.',
    passMarkPercentage: 70,
    modules: [
      {
        id: 'm4-1',
        title: 'Golden Rules of Accounting & Journal Entries',
        durationMinutes: 45,
        content: `Every transaction impacts at least two accounts.
1. Real Accounts: Debit what comes in, Credit what goes out.
2. Personal Accounts: Debit the receiver, Credit the giver.
3. Nominal Accounts: Debit all expenses/losses, Credit all incomes/gains.`,
        keyTakeaways: ['Master the 3 Golden Rules', 'Draft error-free journal vouchers', 'Reconcile trial balance'],
        quiz: [
          {
            id: 'q4-1',
            question: 'What is the golden rule for a Nominal Account?',
            options: [
              'Debit the receiver, Credit the giver',
              'Debit all expenses & losses, Credit all incomes & gains',
              'Debit what comes in, Credit what goes out',
              'Debit cash, Credit bank'
            ],
            correctOptionIndex: 1,
            explanation: 'Nominal accounts track revenues and expenses: Debit expenses/losses, Credit incomes/gains.'
          }
        ]
      },
      {
        id: 'm4-2',
        title: 'Understanding GST (CGST, SGST, IGST) & Invoicing',
        durationMinutes: 50,
        content: `GST is a destination-based consumption tax.
- Intra-state sales (within same state): CGST + SGST split equally.
- Inter-state sales (between two states): IGST collected by Centre.
- Input Tax Credit (ITC) mechanism protects against cascading taxes.`,
        keyTakeaways: ['Distinguish intra vs inter-state tax', 'Compute correct GST slabs', 'Generate compliant tax invoices'],
        quiz: [
          {
            id: 'q4-2',
            question: 'For a sale made from Mumbai to Pune (both in Maharashtra), which taxes apply?',
            options: ['IGST only', 'CGST and SGST', 'UTGST only', 'Customs Duty'],
            correctOptionIndex: 1,
            explanation: 'Since the sale is within the same state (intra-state), CGST and SGST are levied equally.'
          }
        ]
      }
    ],
    finalExam: [
      {
        id: 'fe-4-1',
        question: 'What document is issued by a supplier when goods are sold on credit?',
        options: ['Credit Note', 'Tax Invoice', 'Debit Note', 'Receipt Voucher'],
        correctOptionIndex: 1,
        explanation: 'A Tax Invoice is the primary document issued by a registered supplier showing details of goods sold and tax charged.'
      }
    ]
  },
  {
    id: 'course-5',
    title: 'UI/UX Design Masterclass with Figma',
    category: 'Design',
    thumbnail: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=600&q=80',
    durationHours: 11,
    modulesCount: 2,
    level: 'Beginner',
    rating: 4.9,
    enrolledCount: 3100,
    instructor: 'Vikramaditya Rao (Product Designer)',
    description: 'Learn wireframing, color theory, typography, Figma auto-layout, interactive prototyping, and design systems for mobile and web apps.',
    passMarkPercentage: 70,
    modules: [
      {
        id: 'm5-1',
        title: 'UI Design Principles: Contrast, Hierarchy & Spacing',
        durationMinutes: 45,
        content: `Great interfaces feel natural.
Rules of visual balance:
- 8pt grid spacing system for consistent padding and margins.
- Typographic scale: H1 (28-36px), Body (14-16px), Caption (12px).
- Primary actions must stand out with high contrast.`,
        keyTakeaways: ['Use consistent 8pt spacing grid', 'Establish typographic hierarchy', 'Design for accessibility (WCAG AA)'],
        quiz: [
          {
            id: 'q5-1',
            question: 'Why is the 8pt grid system widely adopted in digital product design?',
            options: [
              'Because most screen resolutions are divisible by 8, ensuring crisp rendering',
              'Because Figma only works in multiples of 8',
              'It makes file sizes 8 times smaller',
              'It is mandated by government standards'
            ],
            correctOptionIndex: 0,
            explanation: 'Multiples of 8 (8, 16, 24, 32, 48) align seamlessly across modern high-DPI displays.'
          }
        ]
      },
      {
        id: 'm5-2',
        title: 'Figma Auto-Layout & Interactive Prototyping',
        durationMinutes: 55,
        content: `Auto-Layout mimics CSS flexbox inside Figma. Learn padding, gap, hugging, and filling containers so your screens adapt to any mobile or desktop screen width.`,
        keyTakeaways: ['Build dynamic cards with Auto-Layout', 'Connect interactive prototype wires', 'Create reusable component variants'],
        quiz: [
          {
            id: 'q5-2',
            question: 'What shortcut in Figma creates an Auto Layout frame?',
            options: ['Shift + A', 'Ctrl + L', 'Alt + F', 'Cmd + K'],
            correctOptionIndex: 0,
            explanation: 'Pressing Shift + A on any selection instantly converts it into an Auto-Layout frame.'
          }
        ]
      }
    ],
    finalExam: [
      {
        id: 'fe-5-1',
        question: 'What is the main objective of creating low-fidelity wireframes before high-fidelity visual mockups?',
        options: [
          'To finalize color palettes',
          'To test information architecture and user flow without getting distracted by visual polish',
          'To impress clients with illustrations',
          'To write the final production code'
        ],
        correctOptionIndex: 1,
        explanation: 'Low-fidelity wireframes prioritize functionality, structure, and user journeys early on.'
      }
    ]
  },
  {
    id: 'course-6',
    title: 'General Aptitude, Reasoning & Current Affairs (Govt Exams)',
    category: 'Government Exam Prep',
    thumbnail: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=600&q=80',
    durationHours: 16,
    modulesCount: 2,
    level: 'Beginner',
    rating: 4.8,
    enrolledCount: 7800,
    instructor: 'Dr. Anand Swaroop (Ex-Civil Services Educator)',
    description: 'Comprehensive preparation for SSC CGL, Banking PO/Clerk, Railways RRB, and State Public Service Commissions. Quantitative tricks, logical reasoning, and Indian polity.',
    passMarkPercentage: 70,
    modules: [
      {
        id: 'm6-1',
        title: 'Quantitative Shortcuts: Percentages, Profit-Loss & Time-Work',
        durationMinutes: 50,
        content: `Competitive exams require speed and accuracy.
- Fraction-to-percentage conversions (1/8 = 12.5%, 1/6 = 16.66%).
- Unitary method and LCM method for Time & Work problems.
- Eliminating incorrect options through digital root and unit digit checks.`,
        keyTakeaways: ['Memorize fractional equivalents', 'Solve time-work via LCM method', 'Save 40% time per question'],
        quiz: [
          {
            id: 'q6-1',
            question: 'If A completes a task in 10 days and B in 15 days, in how many days can they finish working together?',
            options: ['6 days', '5 days', '7.5 days', '8 days'],
            correctOptionIndex: 0,
            explanation: 'Total work = LCM(10, 15) = 30 units. A’s efficiency = 3 units/day, B’s = 2 units/day. Together = 5 units/day. Time = 30 / 5 = 6 days.'
          }
        ]
      },
      {
        id: 'm6-2',
        title: 'Logical Syllogisms & Coding-Decoding',
        durationMinutes: 45,
        content: `Solve syllogisms with Venn diagrams without confusion.
Statements: "All A are B", "Some B are C".
Examine valid vs invalid conclusions systematically.`,
        keyTakeaways: ['Draw definitive Venn diagrams', 'Avoid assuming unstated facts', 'Score 100% on verbal reasoning'],
        quiz: [
          {
            id: 'q6-2',
            question: 'If "DELHI" is coded as "EDMIJ", how is "MUMBAI" coded following the same +1 shift pattern on alternate letters?',
            options: ['NVNCBJ', 'NTLADH', 'OVOBCJ', 'LTLAAH'],
            correctOptionIndex: 0,
            explanation: 'Each consecutive letter is shifted forward by 1: D->E, E->D (or +1 on every letter: D+1=E, E+1=F etc.). With +1 shift on every letter: M->N, U->V, M->N, B->C, A->B, I->J gives NVNCBJ.'
          }
        ]
      }
    ],
    finalExam: [
      {
        id: 'fe-6-1',
        question: 'Which Article of the Constitution of India provides for the Right to Equality before Law?',
        options: ['Article 14', 'Article 19', 'Article 21', 'Article 32'],
        correctOptionIndex: 0,
        explanation: 'Article 14 states that the State shall not deny to any person equality before the law or equal protection of laws.'
      }
    ]
  },
  {
    id: 'course-7',
    title: 'Python for Beginners & Practical Data Analysis',
    category: 'Tech',
    thumbnail: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80',
    durationHours: 12,
    modulesCount: 2,
    level: 'Beginner',
    rating: 4.9,
    enrolledCount: 4600,
    instructor: 'Sunil Nair (Data Scientist)',
    description: 'Learn Python syntax, lists, dictionaries, Pandas dataframes, file automation, and basic data visualization using Matplotlib and Seaborn.',
    passMarkPercentage: 70,
    modules: [
      {
        id: 'm7-1',
        title: 'Python Data Structures: Lists, Tuples & Dictionaries',
        durationMinutes: 40,
        content: `Python is famous for its clean readability.
- Lists: ordered, mutable collections [1, 2, 3].
- Tuples: ordered, immutable collections (1, 2, 3).
- Dictionaries: key-value pairs {"name": "Aarav", "role": "Intern"}.`,
        keyTakeaways: ['Select appropriate data structures', 'Use dictionary comprehensions', 'Parse JSON datasets cleanly'],
        quiz: [
          {
            id: 'q7-1',
            question: 'Which of the following creates an immutable sequence in Python?',
            options: ['List []', 'Tuple ()', 'Set {}', 'Dictionary {:}'],
            correctOptionIndex: 1,
            explanation: 'Tuples are immutable once initialized; their elements cannot be reassigned.'
          }
        ]
      },
      {
        id: 'm7-2',
        title: 'Data Wrangling with Pandas DataFrames',
        durationMinutes: 50,
        content: `Pandas is the workhorse of data science.
- pd.read_csv('data.csv')
- df.head(), df.info(), df.describe()
- df.dropna() and df.fillna()
- Grouping: df.groupby('category')['sales'].sum()`,
        keyTakeaways: ['Load and clean CSV data', 'Filter rows based on boolean conditions', 'Perform aggregation queries'],
        quiz: [
          {
            id: 'q7-2',
            question: 'Which Pandas method summarizes numerical columns with count, mean, std, and quartiles?',
            options: ['df.describe()', 'df.summary()', 'df.stats()', 'df.head()'],
            correctOptionIndex: 0,
            explanation: 'df.describe() computes descriptive statistics for all numerical columns in a DataFrame.'
          }
        ]
      }
    ],
    finalExam: [
      {
        id: 'fe-7-1',
        question: 'What is the output of len({"a": 1, "b": 2, "c": 3}) in Python?',
        options: ['3', '6', '1', 'Error'],
        correctOptionIndex: 0,
        explanation: 'len() on a dictionary returns the number of unique key-value pairs, which is 3.'
      }
    ]
  },
  {
    id: 'course-8',
    title: 'Generative AI & Prompt Engineering for Indian Industry',
    category: 'Tech',
    thumbnail: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=600&q=80',
    durationHours: 10,
    modulesCount: 2,
    level: 'Beginner',
    rating: 4.9,
    enrolledCount: 6150,
    instructor: 'Dr. Ananya Sen (Senior AI Research Fellow)',
    description: 'Harness Large Language Models (LLMs), Gemini APIs, multimodal prompts, code generation, and automated workflows to 10x your productivity in modern workplace roles.',
    passMarkPercentage: 70,
    modules: [
      {
        id: 'm8-1',
        title: 'Core Prompt Engineering: Context, Constraints & Few-Shot Techniques',
        durationMinutes: 45,
        videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        content: `Mastering prompt engineering turns generic AI models into specialized domain assistants.

Key Framework (C-C-O-F):
1. Context: Give the AI persona, background, and target audience (e.g., 'You are a senior hiring manager in India...').
2. Constraint: Establish boundaries (e.g., 'Do not exceed 150 words, exclude jargon').
3. Output Format: Ask for JSON, tables, bullet points, or email format explicitly.
4. Few-Shot Examples: Provide 1-2 examples of ideal input and expected response before asking your question.`,
        keyTakeaways: [
          'Master Zero-Shot, Few-Shot, and Chain-of-Thought prompting',
          'Eliminate hallucinations using grounding and source constraints',
          'Request structured JSON outputs for seamless application integration'
        ],
        quiz: [
          {
            id: 'q8-1',
            question: 'What is "Few-Shot Prompting" in Large Language Models?',
            options: [
              'Giving the model a few exemplary input-output pairs before asking it to complete a new task',
              'Running the model only a few times per hour to save API tokens',
              'Training the entire neural network from scratch using few parameters',
              'Using prompts shorter than 5 words'
            ],
            correctOptionIndex: 0,
            explanation: 'Few-shot prompting provides sample demonstrations directly within the prompt context, guiding the model toward the desired tone and structure.'
          },
          {
            id: 'q8-2',
            question: 'Which technique forces an LLM to show its reasoning steps before generating a conclusion?',
            options: [
              'Chain-of-Thought (CoT) prompting',
              'Temperature lowering to 0',
              'Context trimming',
              'Random sampling'
            ],
            correctOptionIndex: 0,
            explanation: 'Chain-of-Thought prompting asks the model to "think step by step", significantly reducing logical and mathematical errors.'
          }
        ]
      },
      {
        id: 'm8-2',
        title: 'AI Ethics, Grounding & Multimodal Applications',
        durationMinutes: 50,
        content: `Applying AI in corporate workflows requires reliability and compliance.

Crucial Best Practices:
- Grounding: Feed internal company documents or trusted databases directly into the prompt to prevent fabricated facts.
- Data Privacy: Never submit sensitive credentials, personal phone numbers, or confidential customer identifiers to third-party public models.
- Multimodal Vision: Feeding diagrams, resumes, and invoices to vision-capable models like Gemini Flash to extract tabular insights automatically.`,
        keyTakeaways: [
          'Verify facts using grounding and retrieval-augmented methods',
          'Safeguard sensitive organizational and personal data',
          'Analyze charts and documents using multimodal image analysis'
        ],
        quiz: [
          {
            id: 'q8-3',
            question: 'What is "Hallucination" in the context of Generative AI?',
            options: [
              'When the model confidently generates factually inaccurate or fabricated information',
              'When the server experiences hardware failure',
              'When the AI refuses to respond due to content safety filters',
              'When the prompt contains grammatical mistakes'
            ],
            correctOptionIndex: 0,
            explanation: 'Hallucination occurs when an AI predicts syntactically plausible text that does not correspond to real facts.'
          }
        ]
      }
    ],
    finalExam: [
      {
        id: 'fe-8-1',
        question: 'When designing prompts for business data extraction, why is JSON formatting preferred?',
        options: [
          'JSON is directly parseable by backend code and software pipelines without manual text cleaning',
          'JSON uses fewer tokens than plain English text',
          'JSON automatically guarantees 100% factual accuracy',
          'LLMs are only trained on JSON documents'
        ],
        correctOptionIndex: 0,
        explanation: 'Structured JSON output allows software systems to ingest AI answers into databases and APIs with zero parsing friction.'
      },
      {
        id: 'fe-8-2',
        question: 'What is the most effective defense against AI hallucinations when summarizing a legal or corporate contract?',
        options: [
          'Providing the exact text of the contract in the prompt and instructing the model to rely solely on the provided text',
          'Asking the AI to answer in poetry',
          'Repeating the question three times in capital letters',
          'Using a higher creativity temperature'
        ],
        correctOptionIndex: 0,
        explanation: 'Grounding the prompt strictly on provided source material restricts the model from making speculative claims.'
      }
    ]
  },
  {
    id: 'course-9',
    title: 'Cybersecurity Awareness & Digital Hygiene for Youth',
    category: 'Tech',
    thumbnail: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=600&q=80',
    durationHours: 8,
    modulesCount: 2,
    level: 'Beginner',
    rating: 4.8,
    enrolledCount: 3890,
    instructor: 'Karan Malhotra (Certified Ethical Hacker & InfoSec Advisor)',
    description: 'Protect your digital identity, navigate UPI scams, recognize phishing emails, implement Two-Factor Authentication, and master corporate data security protocols.',
    passMarkPercentage: 70,
    modules: [
      {
        id: 'm9-1',
        title: 'Recognizing Phishing, Social Engineering & UPI Fraud',
        durationMinutes: 40,
        content: `Cybercriminals target human psychology rather than software vulnerabilities alone.

Common Attacks in India:
1. Urgent Impersonation: Fake SMS claiming your bank account, electricity connection, or SIM card will be blocked unless you click a link.
2. UPI QR Code Scam: Remember that scanning a QR code is ONLY for SENDING money, NEVER for RECEIVING payments!
3. Job Offer Scams: Demanding registration fees or Telegram task deposits for fake remote jobs.`,
        keyTakeaways: [
          'Never enter your UPI PIN to receive money',
          'Scrutinize sender email domains and SSL certificates',
          'Report cyber fraud immediately at cybercrime.gov.in (Helpline: 1930)'
        ],
        quiz: [
          {
            id: 'q9-1',
            question: 'When someone asks you to scan a QR code and enter your UPI PIN to "receive a cash prize", what will happen?',
            options: [
              'Money will be deducted from your bank account immediately',
              'The prize money will be safely credited into your wallet',
              'The transaction will be automatically approved by RBI',
              'Your bank account balance will increase'
            ],
            correctOptionIndex: 0,
            explanation: 'Entering your UPI PIN always authorizes money to leave your account. Receiving funds never requires a PIN.'
          }
        ]
      },
      {
        id: 'm9-2',
        title: 'Authentication Hygiene, Passkeys & Safe Browsing',
        durationMinutes: 40,
        content: `Strong credentials and device management prevent unauthorized account access.

Hygiene Checklist:
- Enable Two-Factor Authentication (prefer Authenticator apps like Google Authenticator over SMS OTP where possible).
- Use distinct, non-reusable passwords (passphrases of 14+ characters).
- Never install unauthorized APKs or grant Accessibility permissions to untrusted mobile applications.`,
        keyTakeaways: [
          'Enable Two-Factor Authentication across all critical accounts',
          'Use strong, unique passphrases without reusing passwords',
          'Keep browser and operating system patches up to date'
        ],
        quiz: [
          {
            id: 'q9-2',
            question: 'Why is an Authenticator app (TOTP) more secure than an SMS-based OTP for Two-Factor Authentication?',
            options: [
              'It is immune to SIM-swapping attacks and mobile network interception',
              'It requires an active high-speed broadband connection',
              'It changes passwords automatically every day',
              'It requires government biometric verification'
            ],
            correctOptionIndex: 0,
            explanation: 'Authenticator apps generate time-based codes locally on your device, making them immune to SIM swap fraud and SMS sniffing.'
          }
        ]
      }
    ],
    finalExam: [
      {
        id: 'fe-9-1',
        question: 'What is the official National Cyber Crime Reporting Portal helpline number in India?',
        options: ['1930', '100', '108', '139'],
        correctOptionIndex: 0,
        explanation: 'Helpline number 1930 connects Indian citizens directly to the Citizen Financial Cyber Fraud Reporting and Management System.'
      }
    ]
  },
  {
    id: 'course-10',
    title: 'Java Programming & Object-Oriented Software Design',
    category: 'Tech',
    thumbnail: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=600&q=80',
    durationHours: 14,
    modulesCount: 2,
    level: 'Intermediate',
    rating: 4.9,
    enrolledCount: 3820,
    instructor: 'Rajesh Subramanian (Principal Architect @ Bengaluru Tech Labs)',
    description: 'Master core Java, object-oriented design principles (SOLID), exception handling, Collections Framework, multithreading, and RESTful service basics for software engineering careers.',
    passMarkPercentage: 70,
    modules: [
      {
        id: 'm10-1',
        title: 'Java Core & Object-Oriented Principles (OOP)',
        durationMinutes: 50,
        content: `Java is an object-oriented, class-based, concurrent programming language.
Key Pillars of OOP:
1. Encapsulation: Bundling data (variables) and methods inside classes with private access modifiers and public getters/setters.
2. Inheritance: Code reuse through 'extends', fostering a parent-child hierarchical relationship.
3. Polymorphism: Method Overloading (compile-time) and Method Overriding (runtime).
4. Abstraction: Hiding implementation details using abstract classes and interfaces.`,
        keyTakeaways: [
          'Understand JVM, JRE, and JDK architecture',
          'Implement the 4 pillars of OOP in clean Java code',
          'Use access modifiers to enforce data integrity'
        ],
        quiz: [
          {
            id: 'q10-1',
            question: 'Which OOP concept is demonstrated by method overriding in Java subclasses?',
            options: ['Runtime Polymorphism', 'Compile-time Polymorphism', 'Data Encapsulation', 'Multiple Inheritance'],
            correctOptionIndex: 0,
            explanation: 'Method overriding allows a subclass to provide a specific implementation of a method that is already defined in its superclass, resolved at runtime.'
          }
        ]
      },
      {
        id: 'm10-2',
        title: 'Java Collections Framework & Exception Handling',
        durationMinutes: 55,
        content: `Master the Java Collections Framework: List (ArrayList, LinkedList), Set (HashSet, TreeSet), and Map (HashMap, TreeMap).
Understand unchecked RuntimeExceptions vs checked Exceptions, try-with-resources, and custom exception classes.`,
        keyTakeaways: [
          'Select optimal data structures: ArrayList vs LinkedList vs HashMap',
          'Write robust error-handling code with try-catch-finally',
          'Leverage Streams API and Lambdas for clean data processing'
        ],
        quiz: [
          {
            id: 'q10-2',
            question: 'What is the average time complexity of get() and put() operations in a Java HashMap?',
            options: ['O(1)', 'O(n)', 'O(log n)', 'O(n^2)'],
            correctOptionIndex: 0,
            explanation: 'HashMap provides amortized constant time O(1) performance for basic operations under good hash distribution.'
          }
        ]
      }
    ],
    finalExam: [
      {
        id: 'fe-10-1',
        question: 'Which interface in Java is used to order the objects of a user-defined class when multiple custom sorting criteria are needed?',
        options: ['Comparator', 'Comparable', 'Serializable', 'Cloneable'],
        correctOptionIndex: 0,
        explanation: 'Comparator provides a compare() method to define multiple custom sorting sequences outside the class itself.'
      }
    ]
  },
  {
    id: 'course-11',
    title: 'Data Structures, Algorithms & Coding Practice for Placements',
    category: 'Tech',
    thumbnail: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=600&q=80',
    durationHours: 18,
    modulesCount: 2,
    level: 'Advanced',
    rating: 4.95,
    enrolledCount: 5120,
    instructor: 'Kavita Menon (Ex-Google, Competitive Programming Mentor)',
    description: 'Cracking tech placement rounds with high-yield DSA: arrays, sliding window, two pointers, stacks, queues, binary trees, recursion, and dynamic programming.',
    passMarkPercentage: 70,
    modules: [
      {
        id: 'm11-1',
        title: 'Arrays, Strings, Two-Pointer & Sliding Window Techniques',
        durationMinutes: 60,
        content: `Master the essential array patterns that appear in 70%+ of campus placement tests:
1. Two Pointers: Left and Right pointers traversing inward (e.g. Pair Sum, Container with Most Water).
2. Sliding Window: Maintaining a window of size k or variable size (e.g. Longest Substring Without Repeating Characters).
3. Prefix Sum: Instant range queries in O(1) time after O(n) preprocessing.`,
        keyTakeaways: [
          'Recognize two-pointer and sliding window problem signatures',
          'Optimize brute force O(n^2) solutions to optimal O(n)',
          'Compute space and time complexity accurately'
        ],
        quiz: [
          {
            id: 'q11-1',
            question: 'What is the optimal time complexity to find the maximum sum subarray of size K in an array of size N?',
            options: ['O(N)', 'O(N * K)', 'O(N log N)', 'O(K^2)'],
            correctOptionIndex: 0,
            explanation: 'Using the sliding window technique, we add the incoming element and subtract the outgoing element in O(1) per step, yielding O(N) overall.'
          }
        ]
      },
      {
        id: 'm11-2',
        title: 'Trees, Graphs & Dynamic Programming (DP) Essentials',
        durationMinutes: 65,
        content: `Binary Tree traversals (Inorder, Preorder, Postorder, Level-Order/BFS).
Binary Search Tree (BST) properties.
Dynamic Programming: Overlapping subproblems + Optimal substructure.
Memoization (Top-Down) vs Tabulation (Bottom-Up).`,
        keyTakeaways: [
          'Implement DFS and BFS graph/tree traversals',
          'Solve classic 1D & 2D Dynamic Programming problems (0/1 Knapsack, Climbing Stairs)',
          'Avoid stack overflow in recursive backtracking'
        ],
        quiz: [
          {
            id: 'q11-2',
            question: 'Which traversal of a Binary Search Tree (BST) yields values in sorted ascending order?',
            options: ['Inorder Traversal', 'Preorder Traversal', 'Postorder Traversal', 'Level-order Traversal'],
            correctOptionIndex: 0,
            explanation: 'Inorder traversal visits Left Subtree -> Root -> Right Subtree, which directly produces sorted order for any valid BST.'
          }
        ]
      }
    ],
    finalExam: [
      {
        id: 'fe-11-1',
        question: 'Which data structure is primarily used to implement Breadth-First Search (BFS) in trees and graphs?',
        options: ['Queue (FIFO)', 'Stack (LIFO)', 'Priority Queue', 'Array List'],
        correctOptionIndex: 0,
        explanation: 'BFS processes nodes level by level using a First-In-First-Out Queue.'
      }
    ]
  },
  {
    id: 'course-12',
    title: 'Machine Learning, Deep Learning & Predictive Modeling',
    category: 'Tech',
    thumbnail: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80',
    durationHours: 16,
    modulesCount: 2,
    level: 'Intermediate',
    rating: 4.88,
    enrolledCount: 3410,
    instructor: 'Dr. Alok Nath (AI Research Director & IEEE Senior Member)',
    description: 'Hands-on practical machine learning using Python, Scikit-Learn, and PyTorch. Master supervised regression, classification, clustering, neural networks, and model deployment.',
    passMarkPercentage: 70,
    modules: [
      {
        id: 'm12-1',
        title: 'Supervised Learning: Regression, Classification & Model Metrics',
        durationMinutes: 55,
        content: `Linear Regression, Logistic Regression, Decision Trees, and Random Forests.
Overfitting vs Underfitting: Bias-Variance tradeoff.
Evaluation Metrics: Accuracy, Precision, Recall, F1-Score, ROC-AUC curve.`,
        keyTakeaways: [
          'Clean, scale and split dataset using train_test_split',
          'Train classifier models with scikit-learn',
          'Interpret confusion matrices and precision-recall trade-offs'
        ],
        quiz: [
          {
            id: 'q12-1',
            question: 'When evaluating a cancer diagnosis or fraud detection model where missing a positive case is costly, which metric should be prioritized?',
            options: ['Recall (Sensitivity)', 'Precision', 'Overall Accuracy', 'Specificity'],
            correctOptionIndex: 0,
            explanation: 'High recall minimizes False Negatives, ensuring that actual positive cases (like fraud or disease) are not overlooked.'
          }
        ]
      },
      {
        id: 'm12-2',
        title: 'Neural Networks & Deep Learning Foundations',
        durationMinutes: 60,
        content: `Perceptrons, Multi-Layer Perceptrons (MLP), Activation Functions (ReLU, Softmax, Sigmoid), Backpropagation, Gradient Descent optimizers (Adam), and introductory Convolutional Neural Networks (CNNs).`,
        keyTakeaways: [
          'Understand forward propagation and backpropagation loss reduction',
          'Prevent overfitting with Dropout, Early Stopping and Regularization',
          'Build end-to-end classification pipelines'
        ],
        quiz: [
          {
            id: 'q12-2',
            question: 'What is the primary role of an activation function like ReLU in a neural network?',
            options: ['To introduce non-linearity so the network can learn complex patterns', 'To accelerate CPU clock frequency', 'To format weights into integers', 'To normalize memory usage'],
            correctOptionIndex: 0,
            explanation: 'Without non-linear activation functions, a multi-layer neural network collapses into a simple linear regression regardless of depth.'
          }
        ]
      }
    ],
    finalExam: [
      {
        id: 'fe-12-1',
        question: 'Which technique is commonly used to prevent overfitting during neural network training?',
        options: ['Dropout', 'Increasing learning rate to 10', 'Removing the validation split', 'Adding 100 extra dense layers'],
        correctOptionIndex: 0,
        explanation: 'Dropout randomly deactivates a fraction of neurons during training to prevent co-adaptation of features.'
      }
    ]
  }
];

export const SAMPLE_GOVT_SCHEMES: GovernmentScheme[] = [
  {
    id: 'scheme-1',
    title: 'Prime Minister’s Internship Scheme (PMIS)',
    ministry: 'Ministry of Corporate Affairs, Govt of India',
    description: 'A landmark nationwide initiative providing 1 crore youth with 12-month internship opportunities in India’s top 500 companies, bridging classroom learning with corporate experience.',
    eligibility: [
      'Age between 21 to 24 years',
      'Completed Class 10/12, ITI, Polytechnic Diploma, or Graduation (BA, B.Sc, B.Com, B.Tech, BCA, etc.)',
      'Not employed full-time, not studying full-time',
      'Family annual income under ₹8 Lakh'
    ],
    benefits: '₹5,000 monthly stipend (₹4,500 from Govt + ₹500 from Company CSR) + One-time grant of ₹6,000 + PMIS Certificate + Insurance coverage under PM Jeevan Jyoti Bima Yojana.',
    applicationDeadline: 'Open for 2026 Cohort',
    applyUrl: 'https://pminternship.mca.gov.in',
    category: 'Internship',
    stipendInfo: '₹5,000 / month + ₹6,000 grant',
    badgeText: 'Flagship Initiative'
  },
  {
    id: 'scheme-2',
    title: 'Pradhan Mantri Kaushal Vikas Yojana 4.0 (PMKVY)',
    ministry: 'Ministry of Skill Development & Entrepreneurship',
    description: 'Industry-aligned, short-term skill training and Recognition of Prior Learning (RPL) in AI, Coding, Robotics, Healthcare, Logistics, and Digital Fabrication.',
    eligibility: [
      'Indian citizen aged 15 to 45 years',
      'School or college dropouts, or unemployed graduates',
      'Aadhaar card holder'
    ],
    benefits: '100% free government-sponsored training + NSDC Skill India Certificate + Assessment & placement assistance in registered MSMEs and corporate enterprises.',
    applicationDeadline: 'Ongoing admissions',
    applyUrl: 'https://www.skillindiadigital.gov.in',
    category: 'Skill Training',
    stipendInfo: 'Free Training + Reward',
    badgeText: 'Skill India'
  },
  {
    id: 'scheme-3',
    title: 'National Apprenticeship Promotion Scheme (NAPS)',
    ministry: 'Ministry of Skill Development & Entrepreneurship',
    description: 'Empowers graduates and diploma holders to undergo on-the-job apprenticeship training with financial stipend support shared directly by the Government of India.',
    eligibility: [
      'Minimum age 14 years (18 for hazardous industries)',
      'Graduates, Diploma holders, or ITI passouts',
      'Must have registered on the Apprenticeship Portal'
    ],
    benefits: '25% of stipend (up to ₹1,500/month) reimbursed directly by Govt + NAPS National Apprenticeship Certificate recognized by all PSUs and private employers.',
    applicationDeadline: 'Rolling applications',
    applyUrl: 'https://www.apprenticeshipindia.gov.in',
    category: 'Internship',
    stipendInfo: 'Govt Co-Funded Stipend',
    badgeText: 'NAPS Verified'
  },
  {
    id: 'scheme-4',
    title: 'Central Sector Scheme of Scholarships for College & University Students',
    ministry: 'Department of Higher Education, Ministry of Education',
    description: 'Merit-cum-means scholarship for meritorious students from low-income families to pursue graduate and post-graduate professional degrees without financial hardship.',
    eligibility: [
      'Above 80th percentile in relevant stream in Class 12 Board Exams',
      'Pursuing regular college degree',
      'Family income less than ₹4.5 Lakh per annum'
    ],
    benefits: '₹12,000 per year at Graduation level for first 3 years, and ₹20,000 per year at Post-Graduation level transferred directly via DBT.',
    applicationDeadline: '31st December (Annual)',
    applyUrl: 'https://scholarships.gov.in',
    category: 'Scholarship',
    stipendInfo: 'Up to ₹20,000 / year',
    badgeText: 'DBT Direct'
  },
  {
    id: 'scheme-5',
    title: 'Dr. Ambedkar Post-Matric Scholarship for Economically Backward Classes',
    ministry: 'Ministry of Social Justice and Empowerment',
    description: 'Financial assistance to eligible general & OBC/EBC category students pursuing post-secondary education including degree and diploma programs.',
    eligibility: [
      'Enrolled in recognized post-matric course',
      'Family income under ₹2.5 Lakh per annum',
      'Minimum 50% marks in previous qualifying exam'
    ],
    benefits: 'Full maintenance allowance, study tour charges, thesis typing charges, and non-refundable tuition fees reimbursed.',
    applicationDeadline: 'Check NSP Portal',
    applyUrl: 'https://scholarships.gov.in',
    category: 'Scholarship',
    stipendInfo: 'Tuition + Maintenance',
    badgeText: 'NSP Portal'
  },
  {
    id: 'scheme-6',
    title: 'PM MUDRA Yojana (Tarun & Shishu for Young Entrepreneurs)',
    ministry: 'Department of Financial Services, Ministry of Finance',
    description: 'Collateral-free micro loans up to ₹10 Lakh for young graduates starting manufacturing, trading, digital kiosks, or tech service businesses.',
    eligibility: [
      'Any Indian citizen with a viable business plan',
      'Age 18 and above',
      'No past banking defaults'
    ],
    benefits: 'Zero collateral, low interest rate loans: Shishu (up to ₹50k), Kishore (₹50k to ₹5 Lakh), Tarun (₹5 to ₹10 Lakh) with Mudra RuPay card.',
    applicationDeadline: 'Walk into any Bank / JanSamarth Portal',
    applyUrl: 'https://www.mudra.org.in',
    category: 'Loan & Support',
    stipendInfo: 'Up to ₹10 Lakh Loan',
    badgeText: 'Self-Employment'
  }
];

export const UI_TRANSLATIONS: Record<string, Record<string, string>> = {
  English: {
    home: 'Home',
    jobs: 'Jobs & Internships',
    courses: 'Courses',
    resumeBuilder: 'AI Resume Builder',
    mockInterview: 'Mock Interview',
    roadmap: 'Career Roadmap',
    schemes: 'Govt Schemes',
    applications: 'My Applications',
    certificates: 'My Certificates',
    profile: 'Profile',
    tagline: 'Skill Up. Get Hired.',
    searchPlaceholder: 'Search jobs, internships, skills, companies...',
    useMyLocation: 'Use My Location',
    radiusKm: 'Search Radius',
    checkEligibility: 'Check My Eligibility',
    applyNow: 'Apply Now',
    saveJob: 'Save',
    saved: 'Saved',
    startCourse: 'Continue Learning',
    viewCertificate: 'View Certificate',
    eligibilityTitle: 'AI Eligibility Analysis',
    studyAssistant: 'AI Study Assistant',
    recruiterMode: 'Recruiter Mode',
    studentMode: 'Student Mode',
    shareWhatsapp: 'Share on WhatsApp',
  },
  Hindi: {
    home: 'होम',
    jobs: 'नौकरियां व इंटर्नशिप',
    courses: 'कोर्सेज',
    resumeBuilder: 'एआई रेज़्युमे बिल्डर',
    mockInterview: 'मॉक इंटरव्यू',
    roadmap: 'करियर रोडमैप',
    schemes: 'सरकारी योजनाएं',
    applications: 'मेरे आवेदन',
    certificates: 'मेरे प्रमाण पत्र',
    profile: 'प्रोफाइल',
    tagline: 'हुनर सीखो। नौकरी पाओ।',
    searchPlaceholder: 'नौकरियां, इंटर्नशिप, कौशल या कंपनी खोजें...',
    useMyLocation: 'मेरा स्थान उपयोग करें',
    radiusKm: 'खोज दायरा',
    checkEligibility: 'मेरी पात्रता जांचें',
    applyNow: 'आवेदन करें',
    saveJob: 'सहेजें',
    saved: 'सहेजा गया',
    startCourse: 'सीखना जारी रखें',
    viewCertificate: 'सर्टिफिकेट देखें',
    eligibilityTitle: 'एआई पात्रता विश्लेषण',
    studyAssistant: 'एआई अध्ययन सहायक',
    recruiterMode: 'नियोक्ता मोड',
    studentMode: 'छात्र मोड',
    shareWhatsapp: 'व्हाट्सएप पर शेयर करें',
  },
  Marathi: {
    home: 'मुख्यपृष्ठ',
    jobs: 'नोकऱ्या आणि इंटर्नशिप',
    courses: 'कोर्सेस',
    resumeBuilder: 'एआय रेझ्युमे बिल्डर',
    mockInterview: 'मॉक मुलाखत',
    roadmap: 'करिअर रोडमॅप',
    schemes: 'शासकीय योजना',
    applications: 'माझे अर्ज',
    certificates: 'माझी प्रमाणपत्रे',
    profile: 'प्रोफाइल',
    tagline: 'कौशल्य शिका. नोकरी मिळवा.',
    searchPlaceholder: 'नोकऱ्या, कौशल्ये, कंपन्या शोधा...',
    useMyLocation: 'माझे स्थान वापरा',
    radiusKm: 'शोध त्रिज्या',
    checkEligibility: 'माझी पात्रता तपासा',
    applyNow: 'अर्ज करा',
    saveJob: 'जतन करा',
    saved: 'जतन केले',
    startCourse: 'शिकणे सुरू ठेवा',
    viewCertificate: 'प्रमाणपत्र पहा',
    eligibilityTitle: 'एआय पात्रता विश्लेषण',
    studyAssistant: 'एआय अभ्यास सहाय्यक',
    recruiterMode: 'नियोक्ता मोड',
    studentMode: 'विद्यार्थी मोड',
    shareWhatsapp: 'व्हॉट्सअ‍ॅपवर शेअर करा',
  },
  Gujarati: {
    home: 'હોમ',
    jobs: 'નોકરીઓ અને ઇન્ટર્નશીપ',
    courses: 'કોર્સિસ',
    resumeBuilder: 'એઆઈ રેઝ્યૂમે બિલ્ડર',
    mockInterview: 'મોક ઇન્ટરવ્યુ',
    roadmap: 'કારકિર્દી રોડમેપ',
    schemes: 'સરકારી યોજનાઓ',
    applications: 'મારી અરજીઓ',
    certificates: 'મારા પ્રમાણપત્રો',
    profile: 'પ્રોફાઇલ',
    tagline: 'કૌશલ્ય શીખો. નોકરી મેળવો.',
    searchPlaceholder: 'નોકરી, કૌશલ્ય અથવા કંપની શોધો...',
    useMyLocation: 'મારું સ્થાન વાપરો',
    radiusKm: 'શોધ ત્રિજ્યા',
    checkEligibility: 'મારી યોગ્યતા ચકાસો',
    applyNow: 'અરજી કરો',
    saveJob: 'સાચવો',
    saved: 'સાચવેલ',
    startCourse: 'શીખવાનું ચાલુ રાખો',
    viewCertificate: 'પ્રમાણપત્ર જુઓ',
    eligibilityTitle: 'એઆઈ યોગ્યતા વિશ્લેષણ',
    studyAssistant: 'એઆઈ અભ્યાસ સહાયક',
    recruiterMode: 'ભરતી કરનાર મોડ',
    studentMode: 'વિદ્યાર્થી મોડ',
    shareWhatsapp: 'વોટ્સએપ પર શેર કરો',
  },
  Bengali: {
    home: 'হোম',
    jobs: 'চাকরি ও ইন্টার্নশিপ',
    courses: 'কোর্সসমূহ',
    resumeBuilder: 'এআই রিজিউম বিল্ডার',
    mockInterview: 'মক ইন্টারভিউ',
    roadmap: 'ক্যারিয়ার রোডম্যাপ',
    schemes: 'সরকারি প্রকল্প',
    applications: 'আমার আবেদন',
    certificates: 'আমার সার্টিফিকেট',
    profile: 'প্রোফাইল',
    tagline: 'দক্ষতা শিখুন। চাকরি পান।',
    searchPlaceholder: 'চাকরি, দক্ষতা বা কোম্পানি খুঁজুন...',
    useMyLocation: 'আমার অবস্থান ব্যবহার করুন',
    radiusKm: 'অনুসন্ধানের ব্যাসার্ধ',
    checkEligibility: 'যোগ্যতা পরীক্ষা করুন',
    applyNow: 'আবেদন করুন',
    saveJob: 'সংরক্ষণ',
    saved: 'সংরক্ষিত',
    startCourse: 'শেখা চালিয়ে যান',
    viewCertificate: 'সার্টিফিকেট দেখুন',
    eligibilityTitle: 'এআই যোগ্যতা বিশ্লেষণ',
    studyAssistant: 'এআই স্টাডি অ্যাসিস্ট্যান্ট',
    recruiterMode: 'নিয়োগকারী মোড',
    studentMode: 'ছাত্র মোড',
    shareWhatsapp: 'হোয়াটসঅ্যাপে শেয়ার করুন',
  },
  Tamil: {
    home: 'முகப்பு',
    jobs: 'வேலைகள் & பயிற்சி',
    courses: 'படிப்புகள்',
    resumeBuilder: 'AI பயோடேட்டா உருவாக்குநர்',
    mockInterview: 'போலி நேர்காணல்',
    roadmap: 'தொழில் பாதை',
    schemes: 'அரசு திட்டங்கள்',
    applications: 'எனது விண்ணப்பங்கள்',
    certificates: 'எனது சான்றிதழ்கள்',
    profile: 'சுயவிவரம்',
    tagline: 'திறன் பெறுங்கள். வேலை வெல்லுங்கள்.',
    searchPlaceholder: 'வேலை, திறன்கள் அல்லது நிறுவனங்களைத் தேடுங்கள்...',
    useMyLocation: 'எனது இருப்பிடத்தைப் பயன்படுத்து',
    radiusKm: 'தேடல் ஆரம்',
    checkEligibility: 'எனது தகுதியைச் சரிபார்க்கவும்',
    applyNow: 'விண்ணப்பிக்கவும்',
    saveJob: 'சேமி',
    saved: 'சேமிக்கப்பட்டது',
    startCourse: 'கற்றலைத் தொடரவும்',
    viewCertificate: 'சான்றிதழைப் பார்க்கவும்',
    eligibilityTitle: 'AI தகுதி பகுப்பாய்வு',
    studyAssistant: 'AI படிப்பு உதவியாளர்',
    recruiterMode: 'பணியமர்த்துபவர் பயன்முறை',
    studentMode: 'மாணவர் பயன்முறை',
    shareWhatsapp: 'வாட்ஸ்அப்பில் பகிரவும்',
  },
  Telugu: {
    home: 'హోమ్',
    jobs: 'ఉద్యోగాలు & ఇంటర్న్‌షిప్‌లు',
    courses: 'కోర్సులు',
    resumeBuilder: 'AI రెజ్యూమ్ బిల్డర్',
    mockInterview: 'మాక్ ఇంటర్వ్యూ',
    roadmap: 'కెరీర్ రోడ్‌మ్యాప్',
    schemes: 'ప్రభుత్వ పథకాలు',
    applications: 'నా దరఖాస్తులు',
    certificates: 'నా సర్టిఫికెట్లు',
    profile: 'ప్రొఫైల్',
    tagline: 'నైపుణ్యం పెంచుకోండి. ఉద్యోగం పొందండి.',
    searchPlaceholder: 'ఉద్యోగాలు, నైపుణ్యాలు లేదా కంపెనీలను శోధించండి...',
    useMyLocation: 'నా స్థానాన్ని ఉపయోగించండి',
    radiusKm: 'శోధన వ్యాసార్థం',
    checkEligibility: 'నా అర్హతను తనిఖీ చేయండి',
    applyNow: 'దరఖాస్తు చేసుకోండి',
    saveJob: 'సేవ్ చేయండి',
    saved: 'సేవ్ చేయబడింది',
    startCourse: 'నేర్చుకోవడం కొనసాగించండి',
    viewCertificate: 'సర్టిఫికెట్ చూడండి',
    eligibilityTitle: 'AI అర్హత విశ్లేషణ',
    studyAssistant: 'AI స్టడీ అసిస్టెంట్',
    recruiterMode: 'రిక్రూటర్ మోడ్',
    studentMode: 'విద్యార్థి మోడ్',
    shareWhatsapp: 'వాట్సాప్‌లో షేర్ చేయండి',
  },
  Kannada: {
    home: 'ಮುಖಪುಟ',
    jobs: 'ಉದ್ಯೋಗಗಳು ಮತ್ತು ಇಂಟರ್ನ್‌ಶಿಪ್‌ಗಳು',
    courses: 'ಕೋರ್ಸ್‌ಗಳು',
    resumeBuilder: 'AI ರೆಸ್ಯೂಮ್ ಬಿಲ್ಡರ್',
    mockInterview: 'ಮಾಕ್ ಸಂದರ್ಶನ',
    roadmap: 'ವೃತ್ತಿಜೀವನದ ಮಾರ್ಗಸೂಚಿ',
    schemes: 'ಸರ್ಕಾರಿ ಯೋಜನೆಗಳು',
    applications: 'ನನ್ನ ಅರ್ಜಿಗಳು',
    certificates: 'ನನ್ನ ಪ್ರಮಾಣಪತ್ರಗಳು',
    profile: 'ಪ್ರೊಫೈಲ್',
    tagline: 'ಕೌಶಲ್ಯ ಬೆಳೆಸಿಕೊಳ್ಳಿ. ಉದ್ಯೋಗ ಪಡೆಯಿರಿ.',
    searchPlaceholder: 'ಉದ್ಯೋಗಗಳು, ಕೌಶಲ್ಯಗಳನ್ನು ಹುಡುಕಿ...',
    useMyLocation: 'ನನ್ನ ಸ್ಥಳ ಬಳಸಿ',
    radiusKm: 'ಹುಡುಕಾಟ ತ್ರಿಜ್ಯ',
    checkEligibility: 'ನನ್ನ ಅರ್ಹತೆ ಪರಿಶೀಲಿಸಿ',
    applyNow: 'ಈಗಲೇ ಅರ್ಜಿ ಸಲ್ಲಿಸಿ',
    saveJob: 'ಉಳಿಸಿ',
    saved: 'ಉಳಿಸಲಾಗಿದೆ',
    startCourse: 'ಕಲಿಕೆ ಮುಂದುವರಿಸಿ',
    viewCertificate: 'ಪ್ರಮಾಣಪತ್ರ ವೀಕ್ಷಿಸಿ',
    eligibilityTitle: 'AI ಅರ್ಹತೆ ವಿಶ್ಲೇಷಣೆ',
    studyAssistant: 'AI ಅಧ್ಯಯನ ಸಹಾಯಕ',
    recruiterMode: 'ನೇಮಕಾತಿದಾರರ ಮೋಡ್',
    studentMode: 'ವಿದ್ಯಾರ್ಥಿ ಮೋಡ್',
    shareWhatsapp: 'ವಾಟ್ಸಾಪ್‌ನಲ್ಲಿ ಹಂಚಿಕೊಳ್ಳಿ',
  },
  Malayalam: {
    home: 'ഹോം',
    jobs: 'തൊഴിലുകൾ & ഇന്റേൺഷിപ്പുകൾ',
    courses: 'കോഴ്സുകൾ',
    resumeBuilder: 'AI റെസ്യൂമെ ബിൽഡർ',
    mockInterview: 'മോക്ക് ഇന്റർവ്യൂ',
    roadmap: 'കരിയർ റോഡ്മാപ്പ്',
    schemes: 'സർക്കാർ പദ്ധതികൾ',
    applications: 'എന്റെ അപേക്ഷകൾ',
    certificates: 'സർട്ടിഫിക്കറ്റുകൾ',
    profile: 'പ്രൊഫൈൽ',
    tagline: 'കഴിവ് നേടൂ. ജോലി നേടൂ.',
    searchPlaceholder: 'ജോലികൾ, നൈപുണ്യങ്ങൾ തിരയുക...',
    useMyLocation: 'എന്റെ ലൊക്കേഷൻ ഉപയോഗിക്കുക',
    radiusKm: 'തിരയൽ പരിധി',
    checkEligibility: 'എന്റെ യോഗ്യത പരിശോധിക്കുക',
    applyNow: 'അപേക്ഷിക്കുക',
    saveJob: 'സേവ് ചെയ്യുക',
    saved: 'സേവ് ചെയ്തു',
    startCourse: 'പഠനം തുടരുക',
    viewCertificate: 'സർട്ടിഫിക്കറ്റ് കാണുക',
    eligibilityTitle: 'AI യോഗ്യതാ വിശകലനം',
    studyAssistant: 'AI പഠന സഹായി',
    recruiterMode: 'റിക്രൂട്ടർ മോഡ്',
    studentMode: 'വിദ്യാർത്ഥി മോഡ്',
    shareWhatsapp: 'വാട്ട്‌സ്ആപ്പിൽ പങ്കിടുക',
  },
  Punjabi: {
    home: 'ਮੁੱਖ ਪੰਨਾ',
    jobs: 'ਨੌਕਰੀਆਂ ਅਤੇ ਇੰਟਰਨਸ਼ਿਪ',
    courses: 'ਕੋਰਸ',
    resumeBuilder: 'AI ਰੈਜ਼ਿਊਮੇ ਬਿਲਡਰ',
    mockInterview: 'ਮੌਕ ਇੰਟਰਵਿਊ',
    roadmap: 'ਕਰੀਅਰ ਰੋਡਮੈਪ',
    schemes: 'ਸਰਕਾਰੀ ਸਕੀਮਾਂ',
    applications: 'ਮੇਰੀਆਂ ਅਰਜ਼ੀਆਂ',
    certificates: 'ਮੇਰੇ ਸਰਟੀਫਿਕੇਟ',
    profile: 'ਪ੍ਰੋਫਾਈਲ',
    tagline: 'ਹੁਨਰ ਸਿੱਖੋ। ਨੌਕਰੀ ਪਾਓ।',
    searchPlaceholder: 'ਨੌਕਰੀਆਂ, ਹੁਨਰ ਜਾਂ ਕੰਪਨੀਆਂ ਖੋਜੋ...',
    useMyLocation: 'ਮੇਰਾ ਟਿਕਾਣਾ ਵਰਤੋ',
    radiusKm: 'ਖੋਜ ਦਾ ਘੇਰਾ',
    checkEligibility: 'ਮੇਰੀ ਯੋਗਤਾ ਜਾਂਚੋ',
    applyNow: 'ਅਰਜ਼ੀ ਦਿਓ',
    saveJob: 'ਸੰਭਾਲੋ',
    saved: 'ਸੰਭਾਲਿਆ ਗਿਆ',
    startCourse: 'ਸਿੱਖਣਾ ਜਾਰੀ ਰੱਖੋ',
    viewCertificate: 'ਸਰਟੀਫਿਕੇਟ ਵੇਖੋ',
    eligibilityTitle: 'AI ਯੋਗਤਾ ਵਿਸ਼ਲੇਸ਼ਣ',
    studyAssistant: 'AI ਸਿੱਖਿਆ ਸਹਾਇਕ',
    recruiterMode: 'ਭਰਤੀ ਕਰਤਾ ਮੋਡ',
    studentMode: 'ਵਿਦਿਆਰਥੀ ਮੋਡ',
    shareWhatsapp: 'ਵਟਸਐਪ ਤੇ ਸਾਂਝਾ ਕਰੋ',
  },
  Odia: {
    home: 'ମୂଳପୃଷ୍ଠା',
    jobs: 'ଚାକିରି ଏବଂ ଇଣ୍ଟର୍ନସିପ୍',
    courses: 'ପାଠ୍ୟକ୍ରମ',
    resumeBuilder: 'AI ରିଜ୍ୟୁମ୍ ବିଲ୍ଡର୍',
    mockInterview: 'ମକ୍ ସାକ୍ଷାତକାର',
    roadmap: 'କ୍ୟାରିଅର୍ ରୋଡମ୍ୟାପ୍',
    schemes: 'ସରକାରୀ ଯୋଜନା',
    applications: 'ମୋର ଆବେଦନ',
    certificates: 'ମୋର ପ୍ରମାଣପତ୍ର',
    profile: 'ପ୍ରୋଫାଇଲ୍',
    tagline: 'ଦକ୍ଷତା ଶିଖନ୍ତୁ। ଚାକିରି ପାଆନ୍ତୁ।',
    searchPlaceholder: 'ଚାକିରି, ଦକ୍ଷତା ସନ୍ଧାନ କରନ୍ତୁ...',
    useMyLocation: 'ମୋ ସ୍ଥାନ ବ୍ୟବହାର କରନ୍ତୁ',
    radiusKm: 'ସନ୍ଧାନ ବ୍ୟାସାର୍ଦ୍ଧ',
    checkEligibility: 'ମୋ ଯୋଗ୍ୟତା ଯାଞ୍ଚ କରନ୍ତୁ',
    applyNow: 'ଆବେଦନ କରନ୍ତୁ',
    saveJob: 'ସଂରକ୍ଷଣ କରନ୍ତୁ',
    saved: 'ସଂରକ୍ଷିତ',
    startCourse: 'ଶିକ୍ଷା ଜାରି ରଖନ୍ତୁ',
    viewCertificate: 'ପ୍ରମାଣପତ୍ର ଦେଖନ୍ତୁ',
    eligibilityTitle: 'AI ଯୋଗ୍ୟତା ବିଶ୍ଳେଷଣ',
    studyAssistant: 'AI ଅଧ୍ୟୟନ ସହାୟକ',
    recruiterMode: 'ନିଯୁକ୍ତିଦାତା ମୋଡ୍',
    studentMode: 'ଛାତ୍ର ମୋଡ୍',
    shareWhatsapp: 'ହ୍ୱାଟ୍ସଆପ୍‌ରେ ସେୟାର କରନ୍ତୁ',
  },
  Urdu: {
    home: 'ہوم',
    jobs: 'ملازمتیں اور انٹرن شپس',
    courses: 'کورسز',
    resumeBuilder: 'اے آئی ریزیوم بلڈر',
    mockInterview: 'فرضی انٹرویو',
    roadmap: 'کیریئر روڈ میپ',
    schemes: 'سرکاری اسکیمیں',
    applications: 'میری درخواستیں',
    certificates: 'میرے اسناد',
    profile: 'پروفائل',
    tagline: 'ہنر سیکھیں، ملازمت پائیں۔',
    searchPlaceholder: 'ملازمتیں، ہنر یا کمپنیاں تلاش کریں...',
    useMyLocation: 'میرا مقام استعمال کریں',
    radiusKm: 'تلاش کا دائرہ',
    checkEligibility: 'میری اہلیت چیک کریں',
    applyNow: 'درخواست دیں',
    saveJob: 'محفوظ کریں',
    saved: 'محفوظ شدہ',
    startCourse: 'سیکھنا جاری رکھیں',
    viewCertificate: 'سند دیکھیں',
    eligibilityTitle: 'اے آئی اہلیت کا تجزیہ',
    studyAssistant: 'اے آئی اسٹڈی اسسٹنٹ',
    recruiterMode: 'بھرتی کنندہ موڈ',
    studentMode: 'طالب علم موڈ',
    shareWhatsapp: 'واٹس ایپ پر شیئر کریں',
  }
};
