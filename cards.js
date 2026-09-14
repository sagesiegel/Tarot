const TAROT_API = "https://tarotapi.dev/api/v1/cards";
const TAROT_IMAGE_BASE = "https://www.sacred-texts.com/tarot/pkt/img/";

const SPREADS = {
  daily: {
    name: "Daily Card",
    description: "One consistent card for the day, offering a theme for reflection.",
    positions: ["Today's energy and reflection"]
  },
  single: {
    name: "Single Card",
    description: "A focused card for a question, theme, or moment of guidance.",
    positions: ["Guidance"]
  },
  guidance: {
    name: "Simple Guidance",
    description: "Explore the situation, what deserves consideration, and a possible next step.",
    positions: ["The situation", "What to consider", "Your next step"]
  },
  pastPresentFuture: {
    name: "Past · Present · Future",
    description: "Consider what shaped the situation, where it stands, and its current direction.",
    positions: ["Past", "Present", "Potential future"]
  },
  selfRelationship: {
    name: "Relationship With Self",
    description: "A deeper look at your current relationship with yourself.",
    positions: [
      "How I currently see myself",
      "What part of me needs attention",
      "What I need to release",
      "How I can nurture myself",
      "What I am growing into"
    ]
  },
  healing: {
    name: "Healing and Release",
    description: "Explore what you carry, what supports healing, and what may emerge.",
    positions: [
      "What I am carrying",
      "Where it comes from",
      "What is ready to be released",
      "What will support my healing",
      "What can emerge afterward"
    ]
  },
  mindBodySpirit: {
    name: "Mind · Body · Spirit",
    description: "A check-in with your thoughts, physical self, and inner life.",
    positions: ["Mind", "Body", "Spirit"]
  },
  releaseEmbrace: {
    name: "Release and Embrace",
    description: "Identify what can be released and what deserves more room.",
    positions: ["What to release", "What to embrace", "How to move forward"]
  },
  decision: {
    name: "Decision Reading",
    description: "Compare two possibilities without treating either path as predetermined.",
    positions: [
      "Energy of Option A",
      "Energy of Option B",
      "What I may be overlooking",
      "What matters most",
      "Most aligned next step"
    ]
  },
  challenge: {
    name: "Working Through a Challenge",
    description: "Explore a challenge, your available strength, and a constructive action.",
    positions: [
      "The heart of the challenge",
      "What is making it harder",
      "A strength available to me",
      "A constructive next action"
    ]
  },
  connection: {
    name: "Connection Reading",
    description: "Reflect on two people and the healthiest direction for the connection.",
    positions: [
      "My energy",
      "Their energy",
      "The current dynamic",
      "What needs attention",
      "The healthiest path forward"
    ]
  },
  creative: {
    name: "Creative Spark",
    description: "Explore your creative energy, blocks, inspiration, and first step.",
    positions: [
      "My current creative energy",
      "What is blocking me",
      "Where to find inspiration",
      "The first step to take"
    ]
  },
  weekAhead: {
    name: "Week Ahead",
    description: "A reflective overview of the coming week.",
    positions: [
      "Overall theme",
      "Potential challenge",
      "Available support",
      "Best focus",
      "Lesson of the week"
    ]
  },
  celticCross: {
    name: "Celtic Cross",
    description: "A traditional ten-card spread for a detailed look at a situation.",
    positions: [
      "Present situation",
      "Immediate challenge",
      "Foundation",
      "Recent past",
      "Possibility",
      "Near future",
      "Your approach",
      "Outside influences",
      "Hopes or fears",
      "Potential outcome"
    ]
  },
  custom: {
    name: "Custom Spread",
    description: "Choose one to ten cards and write your own position labels.",
    positions: []
  }
};

const REFLECTION_PROMPTS = [
  "Where do I recognize this energy in my life?",
  "What feeling does this card bring up before I analyze it?",
  "What might this card be asking me to notice?",
  "How could I work with this energy in a grounded way?",
  "What part of this image or meaning feels most relevant?",
  "What would honoring this message look like today?",
  "Where might I be resisting this card’s message?",
  "What is one small action I could take based on this card?"
];

const MAJOR_THEMES = {
  "The Fool": "beginnings, openness, trust, and stepping into the unknown",
  "The Magician": "agency, focused intention, and using the resources available to you",
  "The High Priestess": "intuition, inner knowledge, privacy, and what has not yet been revealed",
  "The Empress": "nurturing, creativity, abundance, and allowing something to grow",
  "The Emperor": "structure, boundaries, stability, and responsible leadership",
  "The Hierophant": "tradition, belief, guidance, and learning from shared wisdom",
  "The Lovers": "alignment, meaningful choice, intimacy, and personal values",
  "The Chariot": "determination, direction, self-control, and forward movement",
  "Strength": "gentle courage, patience, compassion, and emotional self-mastery",
  "The Hermit": "solitude, introspection, discernment, and inner guidance",
  "Wheel of Fortune": "change, cycles, timing, and shifting circumstances",
  "Justice": "truth, accountability, balance, and consequences",
  "The Hanged Man": "pause, surrender, changed perspective, and releasing control",
  "Death": "ending, transformation, release, and making space for a new phase",
  "Temperance": "balance, healing, moderation, and thoughtful integration",
  "The Devil": "attachment, avoidance, limiting patterns, and recognizing choice",
  "The Tower": "disruption, revelation, and the collapse of an unstable structure",
  "The Star": "hope, renewal, authenticity, and faith in yourself",
  "The Moon": "uncertainty, emotion, intuition, and incomplete information",
  "The Sun": "clarity, vitality, confidence, truth, and joy",
  "Judgement": "self-evaluation, awakening, forgiveness, and a deeper calling",
  "The World": "completion, integration, accomplishment, and wholeness"
};

const SUIT_THEMES = {
  Cups: "emotion, intuition, relationships, receptivity, and creativity",
  Wands: "motivation, passion, identity, inspiration, and growth",
  Swords: "thoughts, communication, truth, conflict, and decisions",
  Pentacles: "the body, home, work, resources, stability, and practical life"
};

const RANK_THEMES = {
  Ace: "a new opening or seed of potential",
  Two: "choice, balance, or the relationship between two forces",
  Three: "development, expression, and something taking shape",
  Four: "stability, boundaries, rest, or preserving what exists",
  Five: "tension, disruption, adjustment, or change",
  Six: "harmony, recovery, support, movement, or transition",
  Seven: "assessment, uncertainty, strategy, or testing commitment",
  Eight: "movement, skill, repetition, restriction, or deep involvement",
  Nine: "maturity, culmination, independence, or nearing completion",
  Ten: "completion, consequence, responsibility, or a full cycle",
  Page: "curiosity, learning, openness, and an emerging possibility",
  Knight: "pursuit, movement, intensity, and active expression",
  Queen: "inner mastery, emotional intelligence, and embodiment",
  King: "outward mastery, responsibility, and intentional direction"
};

async function loadTarotDeck() {
  const cached = localStorage.getItem("tarot-deck-cache-v1");

  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      localStorage.removeItem("tarot-deck-cache-v1");
    }
  }

  const response = await fetch(TAROT_API);

  if (!response.ok) {
    throw new Error("The card library could not be loaded.");
  }

  const data = await response.json();
  const cards = data.cards || data;

  localStorage.setItem("tarot-deck-cache-v1", JSON.stringify(cards));
  return cards;
}

function cardImage(card) {
  return `${TAROT_IMAGE_BASE}${card.name_short}.jpg`;
}

function cardMeaning(card, reversed) {
  return (
    (reversed ? card.meaning_rev : card.meaning_up) ||
    "Consider what this card’s imagery and themes bring up for you."
  );
}

function cardKeywords(card, reversed) {
  const ignored = new Set([
    "with", "that", "this", "from", "your", "have", "will",
    "into", "upon", "about", "there", "their", "which", "when"
  ]);

  return [...new Set(
    cardMeaning(card, reversed)
      .toLowerCase()
      .replace(/[^a-z\s-]/g, "")
      .split(/\s+/)
      .filter(word => word.length > 4 && !ignored.has(word))
  )].slice(0, 5);
}

function cardTheme(card) {
  if (MAJOR_THEMES[card.name]) return MAJOR_THEMES[card.name];

  const suit = Object.keys(SUIT_THEMES).find(value =>
    card.name.toLowerCase().includes(value.toLowerCase())
  );

  const rank = Object.keys(RANK_THEMES).find(value =>
    card.name.toLowerCase().startsWith(value.toLowerCase())
  );

  return `${RANK_THEMES[rank] || "a developing experience"}, expressed through ${
    SUIT_THEMES[suit] || "your present circumstances"
  }`;
}

function positionLens(position) {
  const value = position.toLowerCase();

  if (value.includes("past") || value.includes("foundation") || value.includes("comes from")) {
    return "This suggests that the card’s energy helped shape the current situation. It may describe an earlier experience, belief, or emotional pattern that still influences how you respond now. Consider what began there and whether it still deserves the same influence.";
  }

  if (value.includes("present") || value.includes("situation") || value.includes("heart of")) {
    return "This places the card at the center of what is happening now. Its energy may describe the most important part of the situation, even if something louder has been receiving more attention.";
  }

  if (value.includes("future") || value.includes("outcome") || value.includes("emerge") || value.includes("growing into")) {
    return "This is not a fixed prediction. It shows the direction the current pattern may take if it continues. Consider what choices could strengthen, soften, or redirect this possibility.";
  }

  if (value.includes("challenge") || value.includes("block") || value.includes("harder") || value.includes("fear")) {
    return "Here, the card highlights a source of friction. The challenge may come from resisting this quality, having too much of it, or not having enough. Ask what a healthier expression would look like.";
  }

  if (value.includes("release") || value.includes("carrying")) {
    return "This may represent something you have outgrown but continue to carry through habit, fear, loyalty, or unfinished emotion. Releasing it can mean allowing it to stop directing your present.";
  }

  if (value.includes("embrace")) {
    return "This card identifies an energy that deserves more room. Embracing it could mean practicing it, accepting it within yourself, or allowing support to reach you.";
  }

  if (
    value.includes("step") || value.includes("action") ||
    value.includes("focus") || value.includes("support") ||
    value.includes("strength") || value.includes("nurture")
  ) {
    return "Here, the card becomes practical guidance. Consider how you can embody its healthiest qualities through one realistic action rather than trying to solve everything at once.";
  }

  if (value.includes("mind")) {
    return "This reflects the thoughts, assumptions, and internal stories shaping your experience. Consider which thoughts are useful and which may need to be questioned.";
  }

  if (value.includes("body")) {
    return "This brings attention to physical needs, capacity, and safety. Consider what your body is communicating through energy, tension, comfort, or the need for care.";
  }

  if (value.includes("spirit")) {
    return "This speaks to meaning, inner alignment, values, and your connection with a larger sense of purpose.";
  }

  if (value.includes("option a") || value.includes("option b")) {
    return "This describes the experience associated with this option rather than declaring it good or bad. Consider what this path asks of you and whether that exchange feels aligned.";
  }

  if (value.includes("their energy") || value.includes("outside") || value.includes("dynamic")) {
    return "This describes an influence in the relationship or environment, not a definitive claim about another person’s private thoughts. Focus on observable behavior and its effect on you.";
  }

  if (value.includes("clarification")) {
    return "This adds another layer to what felt uncertain. Consider whether it explains the original card, reveals what was missing, or shows how its energy could be expressed.";
  }

  return "Explore how the card’s central theme operates within this part of your question. Notice where it feels supportive, where it feels uncomfortable, and what it invites you to understand differently.";
}

function positionInterpretation(card, reversed, position) {
  const orientation = reversed
    ? "Because it is reversed, this energy may be blocked, internalized, delayed, avoided, or expressed in an unbalanced way."
    : "Because it is upright, this energy may be available more directly or visibly.";

  return `${card.name} brings in themes of ${cardTheme(card)}. ${positionLens(position)} ${orientation}`;
}

function reflectionPrompt(cardIndex, positionIndex) {
  return REFLECTION_PROMPTS[
    (cardIndex + positionIndex) % REFLECTION_PROMPTS.length
  ];
}
