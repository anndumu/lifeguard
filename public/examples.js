const EXAMPLES = [
  {
    label: "Toll bill text",
    image: "https://images.unsplash.com/photo-1773649966821-15d8cb86d024?w=600&q=70&auto=format&fit=crop",
    message: "E-ZPass FINAL NOTICE: You have an unpaid toll of $4.15. Pay within 24 hours to avoid a $50 late fee and suspension of your license: https://ezpass-tollpay.top/pay",
    backup: {
      verdict: "scam",
      summary: "This is a fake toll bill. Scammers send texts like this to steal card numbers.",
      red_flags: [
        { phrase: "FINAL NOTICE", reason: "Scammers try to scare you into acting fast." },
        { phrase: "Pay within 24 hours", reason: "A short deadline is meant to rush you." },
        { phrase: "$50 late fee and suspension of your license", reason: "Threats are a common scam trick." },
        { phrase: "https://ezpass-tollpay.top/pay", reason: "This is not the real E-ZPass website." },
      ],
      what_to_do: [
        "Do not tap the link.",
        "Delete the text.",
        "If you are worried, check your toll account using the website or phone number you already trust.",
      ],
      family_message: "Hi! I got a text saying I owe a toll and need to pay through a link. I think it's a scam. Can you take a look?",
    },
  },
  {
    label: "Grandchild in trouble",
    image: "https://images.unsplash.com/photo-1534768654272-e97681c3a2c7?w=600&q=70&auto=format&fit=crop",
    message: "Grandma it's me. I got in a car accident and I'm in jail. Please don't tell Mom. I need $2,000 for bail right away. The lawyer says you can pay with gift cards from the store.",
    backup: {
      verdict: "scam",
      summary: "This looks like the \"grandchild in trouble\" scam. Real family members and lawyers don't ask for gift cards.",
      red_flags: [
        { phrase: "Please don't tell Mom", reason: "Scammers ask you to keep secrets so no one can warn you." },
        { phrase: "right away", reason: "They rush you so you don't stop to check." },
        { phrase: "pay with gift cards", reason: "No real lawyer or jail takes gift cards." },
      ],
      what_to_do: [
        "Do not send money or gift cards.",
        "Call your grandchild or their parents using a number you already have.",
        "If you already sent money, call your bank right away.",
      ],
      family_message: "I just got a message from someone saying they're my grandchild and need bail money in gift cards. Can you check that everyone is okay?",
    },
  },
  {
    label: "Wrong number text",
    image: "https://images.unsplash.com/photo-1609535141153-c3355ad0dce0?w=600&q=70&auto=format&fit=crop",
    message: "Hi, is this Margaret? This is Kevin from the golf club. Sorry if I have the wrong number!",
    backup: {
      verdict: "suspicious",
      summary: "This could be an honest mistake, but \"wrong number\" texts are a common way scammers start a conversation.",
      red_flags: [
        { phrase: "Sorry if I have the wrong number!", reason: "Scammers often pretend to text the wrong person so they can start chatting." },
      ],
      what_to_do: [
        "You don't need to reply.",
        "If you don't know this person, delete the message.",
        "Never send money to someone you've only met by text.",
      ],
      family_message: "I got a text from someone named Kevin I don't know. It might be a wrong number, but could you take a look?",
    },
  },
  {
    label: "Pharmacy reminder",
    image: "https://images.unsplash.com/photo-1562243061-204550d8a2c9?w=600&q=70&auto=format&fit=crop",
    message: "Maple Street Pharmacy: Your prescription is ready for pickup. Store hours are 9am to 7pm. Reply STOP to opt out.",
    backup: {
      verdict: "safe",
      summary: "This looks like a normal pharmacy reminder. It doesn't ask for money or personal information.",
      red_flags: [],
      what_to_do: [
        "If you are expecting a prescription, you can pick it up as usual.",
        "If you are not sure, call the pharmacy using the number on your prescription bottle.",
      ],
      family_message: "I got a text from Maple Street Pharmacy saying my prescription is ready. Seems fine, just letting you know!",
    },
  },
];
