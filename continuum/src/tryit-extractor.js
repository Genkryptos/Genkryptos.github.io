(function () {
  const root = typeof window !== 'undefined' ? window : globalThis;

  const EXTRACT_PROMPT = (input) => `You are the FactExtractor for an agent memory system (Continuum).

Extract atomic personal facts from the user's statement. Return ONLY a JSON array, no prose, no markdown fences.

Each fact has these fields:
- subject: usually "user"
- attribute: a short dotted path like "location", "pets.dog", "employer", "vehicle.owned", "job.title"
- value: concise value, proper-noun preserved
- confidence: 0.0-1.0

Rules:
(A) Each fact must contain ALL attributes of one event together in its value - what / where / when / how - as one tight phrase. Don't split.
(B) Each fact stands alone - no pronouns into other facts.
(C) Skip greetings and assistant-only content.
(D) If the user explicitly corrects a previous statement, extract only the corrected fact.
(E) Use 0-6 facts. Fewer is fine.

User statement: """${input}"""

Output: a single JSON array. No other text.`;

  function cleanModelJson(raw) {
    return String(raw)
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/```$/i, '')
      .trim();
  }

  function normalizeFacts(facts) {
    if (!Array.isArray(facts)) throw new Error('Model did not return a JSON array');

    const seen = new Set();
    return facts
      .filter((fact) => fact && fact.subject && fact.attribute && fact.value !== undefined)
      .map((fact) => ({
        subject: String(fact.subject),
        attribute: String(fact.attribute),
        value: String(fact.value),
        confidence: typeof fact.confidence === 'number' ? fact.confidence : 0.85,
      }))
      .filter((fact) => {
        const key = `${fact.subject}\0${fact.attribute}\0${fact.value.toLowerCase()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 6);
  }

  function firstMatch(text, patterns) {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match?.[1]) return match[1].trim();
    }
    return null;
  }

  function tidyValue(value) {
    return value
      .replace(/\s+/g, ' ')
      .replace(/\s+[-,;:]$/g, '')
      .replace(/[.!?]+$/g, '')
      .replace(/^(?:a|an|the)\s+/i, '')
      .trim();
  }

  function slugAttribute(value) {
    return tidyValue(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'value';
  }

  function isGreetingOnly(text) {
    return /^(?:hi|hello|hey|thanks|thank you|good morning|good afternoon|good evening)[.!\s]*$/i.test(text);
  }

  function addFact(facts, attribute, value, confidence = 0.88) {
    const clean = tidyValue(value);
    if (!clean) return;
    facts.push({
      subject: 'user',
      attribute,
      value: clean,
      confidence,
    });
  }

  function localExtractFacts(input) {
    const text = String(input)
      .replace(/[’]/g, "'")
      .replace(/[—–]/g, ' - ')
      .trim();
    const facts = [];

    const hasCorrectionCue = /\b(?:actually|instead|correction|never\s+made\s+it)\b/i.test(text);
    const correctedMove = hasCorrectionCue ? firstMatch(text, [
      /\bmoved\s+to\s+([A-Z][A-Za-z.' -]*?)(?=\s+(?:for|and|but|instead)\b|[.!?]|$)/i,
      /\brelocated\s+to\s+([A-Z][A-Za-z.' -]*?)(?=\s+(?:for|and|but|instead)\b|[.!?]|$)/i,
    ]) : null;

    const location = correctedMove || firstMatch(text, [
      /\b(?:live|lives|living)\s+in\s+([A-Z][A-Za-z.' -]*?)(?=\s+(?:and|but|for|with|after|before)\b|[,.!?]|$)/i,
      /\b(?:based|located)\s+in\s+([A-Z][A-Za-z.' -]*?)(?=\s+(?:and|but|for|with|after|before)\b|[,.!?]|$)/i,
      /\b(?:moved|relocated)\s+to\s+([A-Z][A-Za-z.' -]*?)(?=\s+(?:and|but|for|with|after|before|instead)\b|[,.!?]|$)/i,
    ]);
    if (location) addFact(facts, 'location', location, 0.9);

    const pet = text.match(/\b(?:adopted|have|got|own)\s+(?:a\s+|an\s+)?(dog|cat|puppy|kitten|pet)\s+named\s+([A-Z][A-Za-z'-]*)/i)
      || text.match(/\b(dog|cat|puppy|kitten|pet)\s+named\s+([A-Z][A-Za-z'-]*)/i);
    if (pet?.[1] && pet?.[2]) {
      const animal = pet[1].toLowerCase().replace('puppy', 'dog').replace('kitten', 'cat');
      addFact(facts, `pets.${animal}`, pet[2], 0.92);
    }

    const employer = firstMatch(text, [
      /\b(?:new\s+job|job|role|work|working)\s+(?:at|with|for)\s+([A-Z][A-Za-z0-9&.' -]*?)(?=\s+(?:as|in|and|but|last|this|next)\b|[,.!?]|$)/i,
      /\bjoined\s+([A-Z][A-Za-z0-9&.' -]*?)(?=\s+(?:as|in|and|but|last|this|next)\b|[,.!?]|$)/i,
    ]);
    if (employer) addFact(facts, 'employer', employer, 0.88);

    const jobTitle = firstMatch(text, [
      /\b(?:am|I'm|I am|work as)\s+(?:a\s+|an\s+)?([A-Za-z][A-Za-z0-9&.' -]*?)(?=\s+(?:at|for|with)\s+[A-Z]|[,.!?]|$)/i,
    ]);
    if (jobTitle && !/^(?:in|from|at|with)$/i.test(jobTitle)) {
      addFact(facts, 'job.title', jobTitle, 0.78);
    }

    const vehicle = firstMatch(text, [
      /\bbought\s+(?:a\s+|an\s+|the\s+)?([A-Z][A-Za-z0-9' -]*?)(?=\s+(?:last|this|today|yesterday|on|in|and|but)\b|[,.!?]|$)/i,
      /\b(?:drive|driving|own|owned)\s+(?:a\s+|an\s+|the\s+)?([A-Z][A-Za-z0-9' -]*?)(?=\s+(?:last|this|today|yesterday|on|in|and|but)\b|[,.!?]|$)/i,
    ]);
    if (vehicle) addFact(facts, 'vehicle.owned', vehicle, 0.86);

    const name = firstMatch(text, [
      /\bmy\s+name\s+is\s+([A-Z][A-Za-z' -]*?)(?=[,.!?]|$)/i,
      /\bI'm\s+([A-Z][A-Za-z' -]*?)(?=[,.!?]|$)/,
    ]);
    if (name && !facts.some((fact) => fact.attribute === 'job.title')) {
      addFact(facts, 'name', name, 0.82);
    }

    const favorite = text.match(/\bmy\s+favorite\s+([a-z][a-z0-9 -]*?)\s+is\s+([^.!?]+)/i);
    if (favorite?.[1] && favorite?.[2]) {
      addFact(facts, `preferences.favorite_${slugAttribute(favorite[1])}`, favorite[2], 0.82);
    }

    const likes = firstMatch(text, [
      /\bI\s+(?:like|love|enjoy|prefer)\s+([^.!?]+?)(?=[.!?]|$)/i,
    ]);
    if (likes) addFact(facts, 'preferences.likes', likes, 0.78);

    const dislikes = firstMatch(text, [
      /\bI\s+(?:dislike|hate)\s+([^.!?]+?)(?=[.!?]|$)/i,
    ]);
    if (dislikes) addFact(facts, 'preferences.dislikes', dislikes, 0.78);

    const allergy = firstMatch(text, [
      /\bI(?:'m| am)\s+allergic\s+to\s+([^.!?]+?)(?=[.!?]|$)/i,
      /\bI\s+have\s+(?:a\s+|an\s+)?allergy\s+to\s+([^.!?]+?)(?=[.!?]|$)/i,
    ]);
    if (allergy) addFact(facts, 'health.allergy', allergy, 0.84);

    const possession = firstMatch(text, [
      /\bI\s+(?:have|own|use|carry)\s+(?:a\s+|an\s+|the\s+|my\s+)?([^.!?]+?)(?=[.!?]|$)/i,
    ]);
    const possessionLooksLikePet = /\b(?:dog|cat|puppy|kitten|pet)\s+named\b/i.test(possession || '');
    if (possession && !possessionLooksLikePet) {
      addFact(facts, 'possessions.owned', possession, 0.74);
    }

    if (facts.length === 0 && /\b(?:I|I'm|I am|my|me)\b/i.test(text) && !isGreetingOnly(text)) {
      addFact(facts, 'profile.note', text, 0.65);
    }

    return normalizeFacts(facts);
  }

  async function extractFacts(input, claudeClient = root.claude) {
    const text = String(input || '').trim();
    if (!text) return [];

    if (claudeClient && typeof claudeClient.complete === 'function') {
      const raw = await claudeClient.complete(EXTRACT_PROMPT(text));
      return normalizeFacts(JSON.parse(cleanModelJson(raw)));
    }

    return localExtractFacts(text);
  }

  root.ContinuumTryIt = {
    EXTRACT_PROMPT,
    extractFacts,
    localExtractFacts,
  };
})();
