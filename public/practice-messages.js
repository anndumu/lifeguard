// Built-in practice messages. The quiz uses these when Gemini can't be reached.
// All names, links, and phone numbers are made up.
const PRACTICE_MESSAGES = [
  {
    message: "USPS: Your package is on hold because of an unpaid $1.99 shipping fee. Pay today at usps-redelivery-help.top or it will be returned.",
    is_scam: true,
    scam_type: "Fake package delivery",
    red_flags: ["unpaid $1.99 shipping fee", "usps-redelivery-help.top"],
    explanation: "USPS doesn't text you to pay small fees through a link. The real website is usps.com.",
  },
  {
    message: "Hi Mom, it's Sarah. I dropped my phone in the sink, this is my new number. Can you send $800 for a new one today? Please don't call, my mic is broken.",
    is_scam: true,
    scam_type: "Family member in trouble",
    red_flags: ["this is my new number", "Please don't call"],
    explanation: "Scammers pretend to be family with a 'new number.' Call your family member on the number you already have.",
  },
  {
    message: "Dr. Patel's office: Reminder of your appointment on Tuesday at 10:30 AM. Reply C to confirm or call our office at 555-0148 to reschedule.",
    is_scam: false,
    scam_type: "Normal reminder",
    red_flags: [],
    explanation: "This just reminds you of an appointment. It doesn't ask for money or personal details.",
  },
  {
    message: "Congratulations! You've won a $1,000 Walmart gift card. Claim it in the next 30 minutes at walmart-rewards-winner.click.",
    is_scam: true,
    scam_type: "Fake prize",
    red_flags: ["You've won", "in the next 30 minutes", "walmart-rewards-winner.click"],
    explanation: "You can't win a contest you never entered. A short deadline is a classic trick.",
  },
  {
    message: "Your library books are due this Friday. You can renew them at the front desk or online with your library card. Have a great week!",
    is_scam: false,
    scam_type: "Normal reminder",
    red_flags: [],
    explanation: "A normal reminder with no pressure, no strange links, and no request for money.",
  },
  {
    message: "MICROSOFT SECURITY ALERT: Your computer has a virus. Call our support team now at 555-0199 before your files are deleted.",
    is_scam: true,
    scam_type: "Fake tech support",
    red_flags: ["Your computer has a virus", "Call our support team now"],
    explanation: "Real companies don't send pop-ups or texts telling you to call about a virus.",
  },
  {
    message: "Chase Bank: Unusual sign-in on your account. Verify your identity now at chase-secure-verify.net or your account will be locked.",
    is_scam: true,
    scam_type: "Fake bank alert",
    red_flags: ["Verify your identity now", "chase-secure-verify.net", "your account will be locked"],
    explanation: "Banks don't ask you to log in through a text link. Call the number on the back of your card instead.",
  },
  {
    message: "Hi Grandpa! Soccer game is Saturday at 9 at Lincoln Park. Mom says she'll pick you up at 8:30. Love you!",
    is_scam: false,
    scam_type: "Message from family",
    red_flags: [],
    explanation: "A friendly message that doesn't ask for money, codes, or secrets.",
  },
  {
    message: "Work from home! Earn $500 a day just by liking posts. No experience needed. Text your name and bank details to 555-0123 to start today.",
    is_scam: true,
    scam_type: "Fake job offer",
    red_flags: ["Earn $500 a day", "Text your name and bank details"],
    explanation: "Real jobs don't pay huge amounts for easy tasks or ask for your bank details by text.",
  },
  {
    message: "Maple Street Pharmacy: Your prescription is ready for pickup. Store hours are 9am to 7pm.",
    is_scam: false,
    scam_type: "Normal reminder",
    red_flags: [],
    explanation: "This tells you something useful and asks for nothing.",
  },
];
